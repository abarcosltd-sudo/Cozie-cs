import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "bubbleOnly"
  | "released"
  | "verified"
  | "artist"
  | "pending";

export type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Small inline status pill used across the Artist Bubble surfaces:
 *   - bubbleOnly: pink/rose "🔒 Bubble Only" pill on unreleased posts
 *   - released:   green "Released" pill on a post that has gone public
 *   - verified:   blue "Verified" check on official artist accounts
 *   - artist:     purple "Artist" pill on listener-facing profiles
 *
 * The visual treatment matches the wireframe (`cozie-wireframes.html`)
 * design notes — Lock Badge Pattern + Tiered Access States.
 */
export function Badge({
  variant = "neutral",
  size = "sm",
  icon,
  children,
  className,
  ...rest
}: BadgeProps) {
  const cls = [
    styles.badge,
    styles[variant],
    size === "md" ? styles.sizeMd : styles.sizeSm,
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {icon ? (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
