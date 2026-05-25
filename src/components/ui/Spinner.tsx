import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 18, label }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 9) }}
      role="status"
      aria-label={label || "Loading"}
    />
  );
}

export function FullPageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.fullPage} role="status" aria-live="polite">
      <Spinner size={32} label={label} />
      <span className={styles.fullPageLabel}>{label}</span>
    </div>
  );
}
