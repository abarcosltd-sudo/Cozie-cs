/**
 * Compose flow for a new reel.
 *
 *  1. User picks (or records) a video.
 *  2. We validate locally: MIME type, size (<= 50 MB), duration (<= 60 s).
 *     Doing this in the browser shaves a roundtrip and avoids wasting Mux
 *     ingest capacity on rejects.
 *  3. User adds a caption + optionally picks a song. When BOTH a video and
 *     a song are present, the MusicTrimmer renders so the user can pick a
 *     crop on the song and preview it.
 *  4. On submit:
 *     - No song → request an upload URL and hand the raw file to the
 *       background UploadContext, same as before.
 *     - Song present → run the in-browser FFmpeg merge first (overlay
 *       blocks navigation), then request the upload URL and hand the
 *       MERGED file to UploadContext. The original audio is silently
 *       dropped — selecting a song always replaces it.
 *  5. On MergeDurationMismatchError we offer a "Post without music" CTA
 *     rather than silently shipping a broken reel.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Film, Music, Search, X } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { MusicTrimmer } from "../components/reels/MusicTrimmer";
import { ComposePreparingOverlay } from "../components/reels/ComposePreparingOverlay";
import { api, ApiError } from "../lib/api";
import { useCreateReel } from "../hooks/useReels";
import { useUpload } from "../contexts/UploadContext";
import {
  MergeAbortError,
  MergeDurationMismatchError,
  mergeVideoWithMusic,
  preloadFfmpeg,
  type MergeStage,
} from "../lib/videoMerge";
import { ENABLE_MUSIC_MERGE } from "../lib/featureFlags";
import styles from "./ComposeReel.module.css";

// Picker rows now include `fileUrl` and `duration` so we can hand them to
// the trimmer / merge without a second round trip. The backend was
// updated in lockstep — see `musicService.search`.
interface PickerSong {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  fileUrl: string | null;
  duration: number | null;
}
interface SearchResponse {
  songs: PickerSong[];
}

const CAPTION_MAX = 300;
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_DURATION_SEC = 60;
const ALLOWED_MIME_PREFIX = "video/";

export default function ComposeReel() {
  const navigate = useNavigate();
  const createReel = useCreateReel();
  const { current: currentUpload, start: startUpload } = useUpload();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [likelyHevc, setLikelyHevc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Song picker state (mirrors ShareMusic.tsx).
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<PickerSong | null>(null);

  // Music-trim state — only meaningful when a song is selected.
  const [musicStartSec, setMusicStartSec] = useState(0);
  const [musicEndSec, setMusicEndSec] = useState(0);
  const [songUnavailable, setSongUnavailable] = useState(false);

  // Merge state — only active while ffmpeg.wasm is running in the worker.
  const [merging, setMerging] = useState(false);
  const [mergeStage, setMergeStage] = useState<MergeStage>("load");
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [durationMismatch, setDurationMismatch] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["music", "search", debouncedQuery],
    queryFn: ({ signal }) =>
      api.get<SearchResponse>(
        `/api/music/search?q=${encodeURIComponent(debouncedQuery)}`,
        { signal }
      ),
    enabled: debouncedQuery.length > 0 && !selectedSong,
  });

  // Hide search results that can't be used as a backing track. The user
  // shouldn't be able to commit to a song the merge pipeline can't fetch.
  const pickableSongs = (searchQuery.data?.songs ?? []).filter(
    (s) => !!s.fileUrl
  );

  // Revoke any previous object URL when the file changes / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Preload ffmpeg.wasm as soon as both a video and a song are present.
  // ~30 MB download happens during the user's crop tweaks, not after they
  // tap Post. Fire-and-forget; we don't surface load errors here — if
  // ffmpeg fails to load the merge will throw with a meaningful message.
  // Gated on the kill-switch so disabling music-merge avoids the WASM
  // download entirely.
  useEffect(() => {
    if (ENABLE_MUSIC_MERGE && file && selectedSong?.fileUrl) {
      preloadFfmpeg().catch(() => undefined);
    }
  }, [file, selectedSong?.fileUrl]);

  const blockedByExistingUpload =
    currentUpload &&
    currentUpload.phase !== "ready" &&
    currentUpload.phase !== "errored";

  const handleFile = (next: File | null) => {
    setValidationError(null);
    setSubmitError(null);
    setDurationMismatch(false);
    setDuration(null);
    setLikelyHevc(false);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!next.type.startsWith(ALLOWED_MIME_PREFIX)) {
      setValidationError("Pick a video file.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setValidationError(
        `Video is too large (max ${Math.floor(MAX_BYTES / 1024 / 1024)} MB).`
      );
      return;
    }

    // HEVC heuristic — iPhone .mov clips are usually HEVC, which the
    // in-browser libx264 fallback can transcode but VERY slowly in the
    // single-thread WASM core. Surface a non-blocking hint so the user
    // can self-correct by re-exporting to MP4/H.264.
    const lowerName = next.name.toLowerCase();
    if (
      next.type === "video/quicktime" ||
      lowerName.endsWith(".mov") ||
      lowerName.endsWith(".hevc")
    ) {
      setLikelyHevc(true);
    }

    const url = URL.createObjectURL(next);
    setFile(next);
    setPreviewUrl(url);

    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = url;
    probe.onloadedmetadata = () => {
      const d = probe.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        if (d > MAX_DURATION_SEC) {
          setValidationError(
            `Video is too long (${Math.round(d)} s — max ${MAX_DURATION_SEC} s).`
          );
        }
      }
    };
    probe.onerror = () => {
      setValidationError("Couldn't read this video. Try a different file.");
    };
  };

  const handleSelectSong = (song: PickerSong) => {
    setSelectedSong(song);
    setQuery("");
    setSongUnavailable(false);
    setMusicStartSec(0);
    setMusicEndSec(0);
  };

  const handleClearSong = () => {
    setSelectedSong(null);
    setSongUnavailable(false);
    setMusicStartSec(0);
    setMusicEndSec(0);
    setMergeError(null);
    setDurationMismatch(false);
  };

  /** Shared "create reel + start upload" tail. Used by both the no-music
   *  path AND the post-merge tail; the only difference is which File we
   *  hand to UploadContext. */
  const createAndUpload = async (uploadFile: File): Promise<boolean> => {
    try {
      const { reelId, uploadUrl } = await createReel.mutateAsync({
        caption: caption.trim() || undefined,
        songId: selectedSong?.id,
      });
      const ok = startUpload({ reelId, uploadUrl, file: uploadFile });
      if (!ok) {
        setSubmitError(
          "Couldn't start upload. Another reel is already uploading."
        );
        return false;
      }
      navigate("/reels");
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to create reel"
      );
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setValidationError("Pick a video first.");
      return;
    }
    if (validationError) return;
    if (blockedByExistingUpload) {
      setSubmitError(
        "Another reel is still uploading. Wait for it to finish first."
      );
      return;
    }
    if (selectedSong && songUnavailable) {
      setSubmitError(
        "The picked song can't be used as a backing track on this device. Change the song or post without music."
      );
      return;
    }

    setSubmitError(null);
    setMergeError(null);
    setDurationMismatch(false);

    // ---------- No-music path: unchanged behaviour --------------------
    // Also taken when the kill switch is off: we still attribute the
    // picked `songId` for the reel header label, we just skip baking
    // the audio in. This keeps the disabled path indistinguishable
    // from "no song selected" from the user's perspective.
    if (!ENABLE_MUSIC_MERGE || !selectedSong || !selectedSong.fileUrl) {
      await createAndUpload(file);
      return;
    }

    // ---------- With-music path: merge first, then upload -------------
    const controller = new AbortController();
    abortRef.current = controller;
    setMerging(true);
    setMergeStage("load");

    try {
      const merged = await mergeVideoWithMusic({
        video: file,
        videoDurationSec: duration ?? 0,
        songUrl: selectedSong.fileUrl,
        songDurationSec: selectedSong.duration ?? 0,
        musicStartSec,
        musicEndSec,
        signal: controller.signal,
        onProgress: (_frac, stage) => setMergeStage(stage),
      });
      setMerging(false);
      await createAndUpload(merged);
    } catch (err) {
      setMerging(false);
      if (err instanceof MergeAbortError) {
        return; // user cancelled — nothing to surface
      }
      console.error("[ComposeReel] merge failed", {
        rawType: typeof err,
        rawCtor:
          err && typeof err === "object"
            ? (err as { constructor?: { name?: string } }).constructor?.name
            : null,
        raw: err,
      });
      if (err instanceof MergeDurationMismatchError) {
        setDurationMismatch(true);
        setMergeError(
          "We couldn't reliably mix this music with the video. Try a different clip, a different song, or post without music."
        );
        return;
      }
      setMergeError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't bake the music in. Try a different song or post without music."
      );
    } finally {
      abortRef.current = null;
    }
  };

  /** Surfaces only on MergeDurationMismatchError — bypass the merge and
   *  upload the raw video as if no song had been selected. We DO still
   *  pass `songId` so the song-attribution label appears on the reel
   *  (user picked it; we just couldn't bake it). */
  const handlePostWithoutMusic = async () => {
    if (!file) return;
    setMergeError(null);
    setDurationMismatch(false);
    await createAndUpload(file);
  };

  const handleCancelMerge = () => {
    abortRef.current?.abort();
  };

  const canSubmit =
    !!file &&
    !validationError &&
    !createReel.isPending &&
    !merging &&
    !blockedByExistingUpload &&
    !(selectedSong && songUnavailable);

  return (
    <PageLayout
      title="New reel"
      showBack
      hideBottomNav
      headerRight={
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={createReel.isPending || merging}
          disabled={!canSubmit}
        >
          Post
        </Button>
      }
    >
      <div className={styles.body}>
        {validationError ? (
          <ErrorBox variant="inline" message={validationError} />
        ) : null}
        {submitError ? (
          <ErrorBox variant="inline" message={submitError} />
        ) : null}
        {mergeError ? (
          <ErrorBox
            variant="inline"
            message={mergeError}
            onRetry={
              durationMismatch ? undefined : () => void handleSubmit()
            }
          />
        ) : null}
        {durationMismatch ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => void handlePostWithoutMusic()}
          >
            Post without music
          </Button>
        ) : null}
        {blockedByExistingUpload ? (
          <ErrorBox
            variant="inline"
            message="A previous reel is still uploading. Cancel it from the toast or wait until it's done."
          />
        ) : null}
        {likelyHevc ? (
          <ErrorBox
            variant="inline"
            message="iPhone HEVC clips work, but processing takes longer in the browser. Convert to H.264 / MP4 for faster results."
          />
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="user"
          className={styles.hiddenInput}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className={styles.previewWrap}>
            <video
              src={previewUrl}
              className={styles.preview}
              controls
              playsInline
              muted
            />
            <div className={styles.previewMeta}>
              <span className={styles.fileName}>{file?.name}</span>
              {duration ? (
                <span className={styles.duration}>
                  {duration.toFixed(1)} s
                </span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFile(null)}
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.dropZone}
            onClick={() => fileInputRef.current?.click()}
          >
            <Film size={36} aria-hidden />
            <span className={styles.dropZoneTitle}>Pick a video</span>
            <span className={styles.dropZoneHint}>
              MP4 / MOV / WebM · up to 60 s · 50 MB max
            </span>
          </button>
        )}

        <label className={styles.label} htmlFor="reel-caption">
          Caption (optional)
        </label>
        <textarea
          id="reel-caption"
          className={styles.caption}
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
          placeholder="Say something about this clip…"
          rows={3}
        />
        <div className={styles.captionCount}>
          {caption.length} / {CAPTION_MAX}
        </div>

        <div className={styles.songSection}>
          <span className={styles.label}>Song (optional)</span>
          {selectedSong ? (
            <div className={styles.selectedSong}>
              <Avatar
                src={selectedSong.albumArtUrl || null}
                name={selectedSong.title}
                seed={selectedSong.id}
                size={44}
              />
              <div className={styles.selectedMeta}>
                <span className={styles.selectedTitle}>
                  {selectedSong.title}
                </span>
                <span className={styles.selectedArtist}>
                  {selectedSong.artist}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearSong}>
                Change
              </Button>
            </div>
          ) : (
            <div className={styles.searchBar}>
              <Search size={18} aria-hidden className={styles.searchIcon} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a song…"
                aria-label="Search for a song"
                className={styles.searchInput}
              />
              {query ? (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={16} aria-hidden />
                </button>
              ) : null}
            </div>
          )}

          {!selectedSong && debouncedQuery ? (
            searchQuery.isPending ? (
              <div className={styles.loading}>
                <Spinner /> Searching…
              </div>
            ) : searchQuery.error ? (
              <ErrorBox
                variant="inline"
                message="Search failed"
                onRetry={() => searchQuery.refetch()}
              />
            ) : !pickableSongs.length ? (
              <div className={styles.empty}>No songs found</div>
            ) : (
              <ul className={styles.results}>
                {pickableSongs.map((song) => (
                  <li key={song.id}>
                    <button
                      type="button"
                      className={styles.resultRow}
                      onClick={() => handleSelectSong(song)}
                    >
                      <Avatar
                        src={song.albumArtUrl || null}
                        name={song.title}
                        seed={song.id}
                        size={36}
                      />
                      <span className={styles.resultInfo}>
                        <Music size={12} aria-hidden />
                        <span className={styles.resultTitle}>
                          {song.title}
                        </span>
                        <span className={styles.resultArtist}>
                          · {song.artist}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {ENABLE_MUSIC_MERGE && selectedSong && selectedSong.fileUrl && file ? (
            <MusicTrimmer
              song={{
                id: selectedSong.id,
                title: selectedSong.title,
                artist: selectedSong.artist,
                albumArtUrl: selectedSong.albumArtUrl,
                fileUrl: selectedSong.fileUrl,
                durationSec: selectedSong.duration,
              }}
              videoDurationSec={duration ?? 0}
              onChange={(s, e) => {
                setMusicStartSec(s);
                setMusicEndSec(e);
              }}
              onUnavailable={() => setSongUnavailable(true)}
            />
          ) : null}
        </div>
      </div>

      {merging ? (
        <ComposePreparingOverlay
          stage={mergeStage}
          onCancel={handleCancelMerge}
        />
      ) : null}
    </PageLayout>
  );
}
