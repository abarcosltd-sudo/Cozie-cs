/**
 * Right-side action rail of a `ReelCard`.
 *
 * Pure UI — every action is delegated through callback props so the parent
 * (the Reels page or detail viewer) controls cache mutations and modal state.
 */
import { Heart, MessageCircle, Share2 } from "lucide-react";
import styles from "./ReelActionRail.module.css";

interface ReelActionRailProps {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByUser: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}

export function ReelActionRail({
  likeCount,
  commentCount,
  shareCount,
  likedByUser,
  onLike,
  onComment,
  onShare,
}: ReelActionRailProps) {
  return (
    <div className={styles.rail}>
      <button
        type="button"
        className={`${styles.btn} ${likedByUser ? styles.liked : ""}`}
        onClick={onLike}
        aria-pressed={likedByUser}
        aria-label={likedByUser ? "Unlike reel" : "Like reel"}
      >
        <Heart
          size={28}
          aria-hidden
          fill={likedByUser ? "currentColor" : "none"}
        />
        <span className={styles.count}>{formatCount(likeCount)}</span>
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onComment}
        aria-label="Open comments"
      >
        <MessageCircle size={28} aria-hidden />
        <span className={styles.count}>{formatCount(commentCount)}</span>
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onShare}
        aria-label="Share reel"
      >
        <Share2 size={28} aria-hidden />
        <span className={styles.count}>{formatCount(shareCount)}</span>
      </button>
    </div>
  );
}
