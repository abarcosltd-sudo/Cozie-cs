import { AlertCircle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ErrorBox.module.css";

interface ErrorBoxProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "inline" | "page";
  children?: ReactNode;
}

/**
 * Use `variant="page"` for full-page error states (e.g. failed initial fetch)
 * and `variant="inline"` for in-flow validation/error messages.
 *
 * `role="alert"` with `aria-live="assertive"` so screen readers announce the
 * message as soon as it appears.
 */
export function ErrorBox({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  variant = "inline",
  children,
}: ErrorBoxProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${styles.box} ${styles[variant]}`}
    >
      <AlertCircle size={20} aria-hidden className={styles.icon} />
      <div className={styles.content}>
        {title ? <strong>{title}</strong> : null}
        {message ? <p className={styles.message}>{message}</p> : null}
        {children}
      </div>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCw size={14} aria-hidden />}
        >
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
