/**
 * Full-screen overlay shown while the in-browser FFmpeg merge runs.
 *
 * The merge holds the user on the compose page (a Web Worker keeps the
 * video bytes in memory; navigating away kills it). We surface a clear
 * stage label, a soft progress bar, and a Cancel button so the user
 * always knows what's happening.
 *
 * Also installs a `beforeunload` warning while active so an accidental
 * navigation / refresh prompts a confirm rather than silently dropping
 * a 60s merge.
 *
 * The actual cancellation work (terminating the ffmpeg.wasm worker) is
 * the parent's responsibility — we just call `onCancel`.
 */
import { useEffect } from "react";
import { X } from "lucide-react";
import type { MergeStage } from "../../lib/videoMerge";
import { Spinner } from "../ui/Spinner";
import styles from "./ComposePreparingOverlay.module.css";

interface ComposePreparingOverlayProps {
  stage: MergeStage;
  onCancel: () => void;
}

const STAGE_LABELS: Record<MergeStage, { title: string; sub: string }> = {
  load: { title: "Loading editor…", sub: "Only takes a moment the first time." },
  probe: { title: "Measuring video…", sub: "Reading the clip's exact length." },
  musicPrep: { title: "Preparing music…", sub: "Trimming to your selection." },
  loop: { title: "Looping music…", sub: "Tiling the song to fit the video." },
  audio: { title: "Mixing audio…", sub: "Setting volume and timing." },
  mux: { title: "Stitching video…", sub: "Combining video and music into one file." },
  verify: { title: "Final check…", sub: "Making sure everything lines up." },
};

const STAGE_ORDER: MergeStage[] = [
  "load",
  "probe",
  "musicPrep",
  "loop",
  "audio",
  "mux",
  "verify",
];

export function ComposePreparingOverlay({
  stage,
  onCancel,
}: ComposePreparingOverlayProps) {
  // Warn on tab close / navigation. Browsers ignore the custom message but
  // still show their own confirm dialog when preventDefault is called.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for some browsers to actually trigger the confirm.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const label = STAGE_LABELS[stage] || STAGE_LABELS.musicPrep;
  // Convert the discrete stage into a coarse 0..1 progress for the bar.
  const pct =
    ((STAGE_ORDER.indexOf(stage) + 0.5) / STAGE_ORDER.length) * 100;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-overlay-title"
    >
      <div className={styles.card}>
        <button
          type="button"
          className={styles.close}
          onClick={onCancel}
          aria-label="Cancel"
        >
          <X size={18} aria-hidden />
        </button>
        <div className={styles.spinnerWrap}>
          <Spinner />
        </div>
        <h2 id="merge-overlay-title" className={styles.title}>
          {label.title}
        </h2>
        <p className={styles.sub}>{label.sub}</p>
        <div className={styles.progressTrack} aria-hidden>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.note}>Keep this tab open.</p>
      </div>
    </div>
  );
}
