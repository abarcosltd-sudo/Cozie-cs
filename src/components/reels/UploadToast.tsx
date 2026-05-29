/**
 * Persistent upload status toast.
 *
 * Reads `UploadContext.current` and renders a small floating chip with:
 *   - progress bar while uploading
 *   - spinner while processing
 *   - success CTA (View) when ready
 *   - retry/dismiss when errored
 *
 * Lives in `App.tsx` so it persists across route changes — the upload
 * itself does too (XHR keeps running) and we don't want the user to lose
 * sight of it just because they navigated to Discover.
 */
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  X,
} from "lucide-react";
import { useUpload } from "../../contexts/UploadContext";
import styles from "./UploadToast.module.css";

export function UploadToast() {
  const navigate = useNavigate();
  const { current, cancel, dismiss } = useUpload();

  if (!current) return null;

  const { phase, progress, fileName, reelId, errorMessage } = current;
  const pct = progress === null ? null : Math.round(progress * 100);

  // Phase-driven thumbnail content. We deliberately do NOT try to render
  // the upload's blob URL as an `<img>` — browsers can't decode a video
  // blob through an image element, which is why the toast used to show a
  // broken-image glyph. An icon avatar with a subtle gradient looks
  // cleaner and always renders.
  const thumbIcon =
    phase === "ready" ? (
      <CheckCircle2 size={22} aria-hidden />
    ) : phase === "errored" ? (
      <AlertCircle size={22} aria-hidden />
    ) : phase === "queued" ? (
      <Film size={20} aria-hidden />
    ) : (
      <Loader2 size={22} aria-hidden className={styles.spin} />
    );

  return (
    <div
      className={`${styles.toast} ${styles[phase] || ""}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`${styles.thumb} ${styles[`thumb_${phase}`] || ""}`}
        aria-hidden
      >
        {thumbIcon}
      </span>
      <div className={styles.body}>
        <div className={styles.title}>
          {phase === "uploading" && "Uploading reel…"}
          {phase === "processing" && "Processing your reel…"}
          {phase === "ready" && "Your reel is live"}
          {phase === "errored" && "Upload failed"}
          {phase === "queued" && "Preparing upload…"}
        </div>
        <div className={styles.sub}>
          {phase === "uploading" && pct !== null
            ? `${pct}%`
            : phase === "errored"
            ? errorMessage || "Tap retry."
            : fileName}
        </div>
        {phase === "uploading" ? (
          <div className={styles.progressTrack} aria-hidden>
            <div
              className={styles.progressFill}
              style={{
                width: pct !== null ? `${pct}%` : undefined,
                // Indeterminate styling when bytes unknown.
                opacity: pct === null ? 0.4 : 1,
              }}
            />
          </div>
        ) : null}
        {phase === "processing" ? (
          <div className={styles.processingHint}>
            This usually takes under a minute.
          </div>
        ) : null}
      </div>
      <div className={styles.actions}>
        {phase === "ready" ? (
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              navigate(`/reels/${reelId}`);
              dismiss();
            }}
          >
            <CheckCircle2 size={16} aria-hidden />
            View
          </button>
        ) : null}
        {phase === "errored" ? (
          <button
            type="button"
            className={styles.cta}
            onClick={() => {
              dismiss();
              navigate("/compose/reel");
            }}
          >
            <AlertCircle size={16} aria-hidden />
            Retry
          </button>
        ) : null}
        <button
          type="button"
          className={styles.close}
          onClick={() =>
            phase === "ready" || phase === "errored" ? dismiss() : cancel()
          }
          aria-label={
            phase === "ready" || phase === "errored"
              ? "Dismiss"
              : "Cancel upload"
          }
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
