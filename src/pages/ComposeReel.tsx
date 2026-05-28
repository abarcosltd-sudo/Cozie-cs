/**
 * Compose flow for a new reel.
 *
 *  1. User picks (or records) a video.
 *  2. We validate locally: MIME type, size (<= 50 MB), duration (<= 60 s).
 *     Doing this in the browser shaves a roundtrip and avoids wasting Mux
 *     ingest capacity on rejects.
 *  3. User adds a caption + optionally picks a song (reuses the search
 *     pattern from `ShareMusic.tsx`).
 *  4. On submit: POST /api/reels → backend returns { reelId, uploadUrl,
 *     uploadExpiresAt }. We hand the upload off to `UploadContext` and
 *     immediately navigate to /reels so the user can keep browsing while
 *     the file uploads in the background (toast keeps them informed).
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
import { api, ApiError } from "../lib/api";
import { useCreateReel } from "../hooks/useReels";
import { useUpload } from "../contexts/UploadContext";
import type { MusicTrack } from "../types/api";
import styles from "./ComposeReel.module.css";

interface SearchResponse {
  songs: Pick<MusicTrack, "id" | "title" | "artist" | "albumArtUrl">[];
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Song picker state (mirrors ShareMusic.tsx).
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSong, setSelectedSong] =
    useState<SearchResponse["songs"][number] | null>(null);

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

  // Revoke any previous object URL when the file changes / on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const blockedByExistingUpload =
    currentUpload &&
    currentUpload.phase !== "ready" &&
    currentUpload.phase !== "errored";

  const handleFile = (next: File | null) => {
    setValidationError(null);
    setSubmitError(null);
    setDuration(null);

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

    const url = URL.createObjectURL(next);
    setFile(next);
    setPreviewUrl(url);

    // Probe duration. We don't render this `<video>` ourselves — it's just
    // a metadata loader. Some browsers report `Infinity` for unmuxed WebM
    // segments; we accept those tentatively and let the backend enforce.
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

    setSubmitError(null);
    try {
      const { reelId, uploadUrl } = await createReel.mutateAsync({
        caption: caption.trim() || undefined,
        songId: selectedSong?.id,
      });
      const ok = startUpload({ reelId, uploadUrl, file });
      if (!ok) {
        setSubmitError(
          "Couldn't start upload. Another reel is already uploading."
        );
        return;
      }
      navigate("/reels");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to create reel"
      );
    }
  };

  const canSubmit =
    !!file &&
    !validationError &&
    !createReel.isPending &&
    !blockedByExistingUpload;

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
          loading={createReel.isPending}
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
        {blockedByExistingUpload ? (
          <ErrorBox
            variant="inline"
            message="A previous reel is still uploading. Cancel it from the toast or wait until it's done."
          />
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          // `capture` opens the device camera if available; harmless otherwise.
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSong(null)}
              >
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
            ) : !searchQuery.data?.songs?.length ? (
              <div className={styles.empty}>No songs found</div>
            ) : (
              <ul className={styles.results}>
                {searchQuery.data.songs.map((song) => (
                  <li key={song.id}>
                    <button
                      type="button"
                      className={styles.resultRow}
                      onClick={() => {
                        setSelectedSong(song);
                        setQuery("");
                      }}
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
        </div>
      </div>
    </PageLayout>
  );
}
