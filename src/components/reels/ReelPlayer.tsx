/**
 * Thin video wrapper for a single reel.
 *
 * Responsibilities:
 *   - Attach the HLS stream via `lib/hls.ts` (native on Safari, hls.js elsewhere).
 *   - Autoplay muted when `active` (browsers reject autoplay with sound).
 *   - Pause + reset when `!active` or when the tab/document is hidden.
 *   - Loop the clip — Reels are intentionally short and replay-on-loop.
 *   - Fire `onView` exactly once after 3 s of in-viewport playback so the
 *     parent can register a view ping (de-duped against the per-session
 *     `viewedRef` set in `Reels.tsx`).
 *   - Respect `navigator.connection?.saveData` — if data-saver is on we
 *     suppress autoplay and show the poster as a tap-to-play target.
 *
 * The parent decides which card is `active`; this component never makes that
 * call on its own. That keeps the windowed-list logic in one place.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Play, VolumeX } from "lucide-react";
import { attach, type HlsHandle } from "../../lib/hls";
import styles from "./ReelPlayer.module.css";

interface ReelPlayerProps {
  src: string;
  posterUrl?: string | null;
  /** Active = the user is currently viewing this reel in the feed. */
  active: boolean;
  /** Whether the audio track should be unmuted (only ever true for the active reel). */
  muted: boolean;
  /** Tap handler used to toggle mute on the active reel. */
  onToggleMute?: () => void;
  /** Called after 3 s of accumulated, in-viewport playback. Fires at most once per mount. */
  onView?: () => void;
  /** True if the reel doc says "ready" — the parent should gate this. */
  ready: boolean;
  /** Optional className passthrough so the parent can size the player. */
  className?: string;
}

const VIEW_THRESHOLD_MS = 3_000;

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
}

function getSaveDataPreference(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithConnection;
  return Boolean(nav.connection?.saveData);
}

export function ReelPlayer({
  src,
  posterUrl,
  active,
  muted,
  onToggleMute,
  onView,
  ready,
  className,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<HlsHandle | null>(null);
  const watchedMsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const viewedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  // Compute saveData once per mount. It can flip on Chrome at runtime but the
  // user can also reload, and `connection.onchange` is non-standard.
  const saveData = useMemo(() => getSaveDataPreference(), []);
  const autoplay = active && !saveData;

  // Mount + unmount the HLS source whenever `src` changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !ready) return;
    const handle = attach(video, src);
    handleRef.current = handle;
    return () => {
      handle.detach();
      handleRef.current = null;
    };
  }, [src, ready]);

  // Sync the play/pause state with `active`. Browsers may reject the autoplay
  // promise (e.g. iOS hasn't received a user gesture yet) — the catch
  // handler flips the local `paused` state and the play-tap overlay shows.
  // The video's own `onPlaying` / `onPause` listeners (attached on the
  // <video> below) are the source of truth for `paused` whenever the
  // browser actually transitions between states, so we don't drive that
  // state synchronously from this effect.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (autoplay) {
      video.muted = muted;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          setPaused(true);
        });
      }
    } else {
      video.pause();
      // Reset to 0 when leaving so the next time we come back the clip
      // restarts. Reels feel broken if they continue mid-scrub.
      try {
        video.currentTime = 0;
      } catch {
        /* element may not be ready yet */
      }
      watchedMsRef.current = 0;
      lastTimeRef.current = 0;
    }
  }, [autoplay, muted, ready]);

  // Pause on document hidden — covers tab switch, OS sleep, app background.
  useEffect(() => {
    if (!active) return;
    const onVisChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else if (autoplay) {
        void video.play().catch(() => setPaused(true));
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [active, autoplay]);

  // View ping: accumulate playback time deltas while the reel is active.
  // Using `timeupdate` deltas (instead of a 3 s setTimeout) so a paused or
  // off-screen reel doesn't bank time it didn't actually play.
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !active || viewedRef.current) return;
    const now = video.currentTime;
    const delta = Math.max(0, now - lastTimeRef.current);
    // Skip implausible jumps (loop wrap, seek) — caps the per-tick contribution.
    if (delta > 0 && delta < 1) {
      watchedMsRef.current += delta * 1000;
      if (watchedMsRef.current >= VIEW_THRESHOLD_MS) {
        viewedRef.current = true;
        onView?.();
      }
    }
    lastTimeRef.current = now;
  }, [active, onView]);

  // Reset the watched-time counter whenever `active` flips so reels swiped
  // back into view re-arm the 3 s threshold for the session-level guard.
  useEffect(() => {
    if (!active) viewedRef.current = false;
  }, [active]);

  return (
    <div className={[styles.player, className].filter(Boolean).join(" ")}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        loop
        muted={muted}
        preload="metadata"
        poster={posterUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onPlaying={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onClick={onToggleMute}
      />

      {!ready ? (
        <div className={styles.processing} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden />
          <span>Processing…</span>
        </div>
      ) : null}

      {ready && (paused || saveData) && active ? (
        <button
          type="button"
          className={styles.playOverlay}
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = muted;
            void video.play().catch(() => undefined);
          }}
          aria-label="Play reel"
        >
          <Play size={36} aria-hidden />
        </button>
      ) : null}

      {ready && active && muted ? (
        <span className={styles.mutedIndicator} aria-hidden>
          <VolumeX size={14} />
        </span>
      ) : null}
    </div>
  );
}
