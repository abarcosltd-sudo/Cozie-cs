import { useMemo } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  /** Stable identity for the placeholder gradient (e.g. userId). */
  seed?: string;
  className?: string;
}

const GRADIENTS = [
  "linear-gradient(135deg, #c084fc 0%, #ec4899 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)",
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Avatar with deterministic gradient fallback. Renders an `<img>` when
 * `src` is provided, otherwise the user's first letter on a gradient picked
 * by `seed` so the same user always gets the same color.
 */
export function Avatar({
  src,
  name,
  size = 40,
  seed,
  className,
}: AvatarProps) {
  const gradient = useMemo(() => {
    const key = seed || name || "anon";
    return GRADIENTS[hash(key) % GRADIENTS.length];
  }, [seed, name]);

  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : "User avatar"}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={[styles.avatar, className].filter(Boolean).join(" ")}
      />
    );
  }
  return (
    <span
      className={[styles.avatar, styles.placeholder, className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size, background: gradient }}
      aria-label={name ? `${name}'s avatar` : "User avatar"}
      role="img"
    >
      <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initial}</span>
    </span>
  );
}
