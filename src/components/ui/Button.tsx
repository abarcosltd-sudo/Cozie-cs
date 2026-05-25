import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Spinner } from "./Spinner";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * Accessible button with built-in loading state. Always pass an aria-label
 * when the visible content is just an icon.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      children,
      type = "button",
      ...rest
    },
    ref
  ) {
    const cls = [
      styles.btn,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : "",
      loading ? styles.loading : "",
      className || "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <button
        ref={ref}
        type={type}
        className={cls}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <Spinner size={size === "lg" ? 18 : 14} />
        ) : leftIcon ? (
          <span className={styles.iconLeft} aria-hidden>
            {leftIcon}
          </span>
        ) : null}
        <span className={styles.label}>{children}</span>
        {rightIcon && !loading ? (
          <span className={styles.iconRight} aria-hidden>
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  }
);
