/**
 * MusicTrimmer — two-handle range slider over a song's full duration.
 *
 * Renders below the song picker in ComposeReel once both a video AND a
 * song are present. The user drags the start/end thumbs to choose which
 * slice of the song will be baked under the video. Live preview audio
 * plays the chosen slice and loops back to the start when it reaches the
 * end handle, matching what the eventual baked output will sound like.
 *
 * Defensive: fires a HEAD-fetch against `song.fileUrl` on mount; if the
 * URL is CORS-denied the slider disables itself with a friendly message
 * AND calls `onUnavailable()` upward so ComposeReel can grey out the
 * Post button. We never let the user complete a crop they then can't post.
 *
 * Hosts an `<audio>` element so we can preview without rebuilding the
 * audio decoder for every drag.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./MusicTrimmer.module.css";

export interface MusicTrimmerSong {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  fileUrl: string;
  /** Optional — we fall back to `<audio>.duration` if missing. */
  durationSec?: number | null;
}

interface MusicTrimmerProps {
  song: MusicTrimmerSong;
  /** Video length the user is editing for. Used for sensible defaults
   *  and for the "Music will loop to fill the video" hint. */
  videoDurationSec: number;
  onChange: (startSec: number, endSec: number) => void;
  /** Called once with `true` if the song's audio URL is CORS-blocked
   *  (so we can't fetch it for FFmpeg). The trimmer also disables itself. */
  onUnavailable?: () => void;
}

const MIN_TRIM_SEC = 1;

export function MusicTrimmer({
  song,
  videoDurationSec,
  onChange,
  onUnavailable,
}: MusicTrimmerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;

  const [loadedDur, setLoadedDur] = useState<number | null>(
    song.durationSec && song.durationSec > 0 ? song.durationSec : null
  );
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [corsChecked, setCorsChecked] = useState(false);

  // CORS pre-check. Fail-loud at trim time, not at merge time.
  useEffect(() => {
    let cancelled = false;
    setCorsChecked(false);
    setUnavailable(false);
    (async () => {
      try {
        const resp = await fetch(song.fileUrl, {
          method: "HEAD",
          mode: "cors",
        });
        if (cancelled) return;
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        if (cancelled) return;
        setUnavailable(true);
        onUnavailableRef.current?.();
      } finally {
        if (!cancelled) setCorsChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [song.fileUrl]);

  // Pick up duration from the audio element if the metadata is missing.
  // Some library tracks don't have `durationSec` recorded; <audio>'s
  // `loadedmetadata` event always knows.
  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const d = el.duration;
    if (Number.isFinite(d) && d > 0) setLoadedDur(d);
  }, []);

  // Once we know the song's duration, set sensible defaults: trim from 0
  // to the smaller of (song length, video length, 60s reel cap).
  useEffect(() => {
    if (loadedDur === null) return;
    const cap = Math.min(loadedDur, videoDurationSec || loadedDur, 60);
    const defaultEnd = Math.max(MIN_TRIM_SEC, cap);
    setStart(0);
    setEnd(defaultEnd);
  }, [loadedDur, videoDurationSec]);

  // Emit changes upward, but only after the defaults have settled.
  useEffect(() => {
    if (end > 0) onChangeRef.current(start, end);
  }, [start, end]);

  // Preview-loop within [start, end]. We poll currentTime via the
  // `timeupdate` event (~4 Hz in Chrome) so the loop is responsive
  // enough that the user notices the boundary.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTimeUpdate = () => {
      if (el.currentTime >= end - 0.05) {
        el.currentTime = start;
        // If we're not actively playing, just snap back; don't auto-resume.
        if (el.paused) return;
        el.play().catch(() => undefined);
      }
    };
    el.addEventListener("timeupdate", onTimeUpdate);
    return () => el.removeEventListener("timeupdate", onTimeUpdate);
  }, [start, end]);

  // Stop preview when the song changes or the component unmounts.
  // Snapshot the ref at effect-run time so cleanup uses the same node
  // React rendered (avoids the "ref may have changed" hook warning).
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el) {
        el.pause();
        el.src = "";
      }
    };
  }, []);

  const handlePlayPause = () => {
    const el = audioRef.current;
    if (!el || unavailable) return;
    if (el.paused) {
      if (el.currentTime < start || el.currentTime >= end) {
        el.currentTime = start;
      }
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleStartChange = (next: number) => {
    if (loadedDur === null) return;
    const v = Math.max(0, Math.min(next, end - MIN_TRIM_SEC));
    setStart(v);
    const el = audioRef.current;
    if (el && el.currentTime < v) el.currentTime = v;
  };
  const handleEndChange = (next: number) => {
    if (loadedDur === null) return;
    const v = Math.min(loadedDur, Math.max(next, start + MIN_TRIM_SEC));
    setEnd(v);
  };

  const willLoop = useMemo(() => {
    if (!videoDurationSec) return false;
    return end - start < videoDurationSec - 0.05;
  }, [start, end, videoDurationSec]);

  const trimLengthSec = Math.max(0, end - start);

  return (
    <div className={styles.root}>
      <audio
        ref={audioRef}
        src={song.fileUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <div className={styles.header}>
        <button
          type="button"
          className={styles.playBtn}
          onClick={handlePlayPause}
          disabled={unavailable || loadedDur === null}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <div className={styles.label}>
          <span className={styles.title}>Trim music</span>
          {loadedDur === null ? (
            <span className={styles.sub}>Loading song…</span>
          ) : unavailable ? (
            <span className={styles.subError}>
              This song can't be used as a background track yet
            </span>
          ) : (
            <span className={styles.sub}>
              {formatTime(start)} — {formatTime(end)}
              {" · "}
              {trimLengthSec.toFixed(1)}s of song
              {videoDurationSec
                ? ` / ${videoDurationSec.toFixed(1)}s video`
                : ""}
            </span>
          )}
        </div>
      </div>

      {loadedDur !== null && !unavailable ? (
        <>
          <div className={styles.sliders}>
            <input
              type="range"
              min={0}
              max={loadedDur}
              step={0.1}
              value={start}
              onChange={(e) => handleStartChange(parseFloat(e.target.value))}
              className={styles.sliderStart}
              aria-label="Music start"
            />
            <input
              type="range"
              min={0}
              max={loadedDur}
              step={0.1}
              value={end}
              onChange={(e) => handleEndChange(parseFloat(e.target.value))}
              className={styles.sliderEnd}
              aria-label="Music end"
            />
            <div
              className={styles.selection}
              style={{
                left: `${(start / loadedDur) * 100}%`,
                width: `${((end - start) / loadedDur) * 100}%`,
              }}
              aria-hidden
            />
          </div>
          {willLoop ? (
            <p className={styles.hint}>
              Music will loop seamlessly to fill the full video.
            </p>
          ) : null}
        </>
      ) : null}

      {unavailable && corsChecked ? (
        <p className={styles.hintError}>
          The song's audio file can't be downloaded from this device. Pick a
          different song or post your reel without background music.
        </p>
      ) : null}
    </div>
  );
}

function formatTime(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}
