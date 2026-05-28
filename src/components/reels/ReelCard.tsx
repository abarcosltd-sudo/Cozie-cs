/**
 * One reel viewport.
 *
 * Layers (z stacked):
 *   1. `<ReelPlayer>` — full-bleed background, owns playback semantics.
 *   2. Bottom-left overlay — author handle, caption, song chip.
 *   3. Right rail — like / comment / share buttons.
 *
 * Memoized so the windowed list in `Reels.tsx` can re-render the wrapper
 * without thrashing the player (which re-mounting would visibly stall).
 */
import { memo, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Music } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { ReelActionRail } from "./ReelActionRail";
import { ReelPlayer } from "./ReelPlayer";
import type { Reel } from "../../types/api";
import styles from "./ReelCard.module.css";

interface ReelCardProps {
  reel: Reel;
  active: boolean;
  onView?: (reelId: string) => void;
  onLike?: (reelId: string) => void;
  onComment?: (reel: Reel) => void;
  onShare?: (reel: Reel) => void;
}

function ReelCardImpl({
  reel,
  active,
  onView,
  onLike,
  onComment,
  onShare,
}: ReelCardProps) {
  // Mute toggles independently per active reel. Default to muted to satisfy
  // browser autoplay policies; the user can tap to unmute.
  const [muted, setMuted] = useState(true);

  const handleView = useCallback(() => {
    onView?.(reel.id);
  }, [onView, reel.id]);

  const ready = reel.status === "ready" && Boolean(reel.playbackUrl);
  const errored = reel.status === "errored";

  return (
    <article className={styles.card} aria-label={`Reel by ${reel.userName ?? "user"}`}>
      {reel.playbackUrl ? (
        <ReelPlayer
          src={reel.playbackUrl}
          posterUrl={reel.thumbnailUrl}
          active={active}
          muted={muted}
          ready={ready}
          onToggleMute={() => setMuted((m) => !m)}
          onView={handleView}
          className={styles.player}
        />
      ) : (
        <div className={styles.placeholder}>
          {errored ? (
            <div className={styles.errored}>
              <span>This reel failed to upload.</span>
              {reel.errorMessage ? (
                <small>{reel.errorMessage}</small>
              ) : null}
            </div>
          ) : (
            <div className={styles.processingBlock}>
              <span className={styles.spinner} aria-hidden />
              <span>Processing…</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom-left content overlay */}
      <div className={styles.overlay}>
        <Link
          to={`/profile/${reel.userId}`}
          className={styles.author}
          aria-label={`Open ${reel.userName ?? "user"}'s profile`}
        >
          <Avatar
            src={reel.userAvatarUrl}
            name={reel.userName ?? "User"}
            seed={reel.userId}
            size={36}
          />
          <span className={styles.authorName}>
            {reel.userName ?? "Unknown"}
          </span>
        </Link>
        {reel.caption ? (
          <p className={styles.caption}>{reel.caption}</p>
        ) : null}
        {reel.songSnapshot ? (
          <div className={styles.songChip}>
            <Music size={14} aria-hidden />
            <span className={styles.songLabel}>
              {reel.songSnapshot.title} · {reel.songSnapshot.artist}
            </span>
          </div>
        ) : null}
      </div>

      {/* Right action rail */}
      <div className={styles.rail}>
        <ReelActionRail
          likeCount={reel.likeCount}
          commentCount={reel.commentCount}
          shareCount={reel.shareCount}
          likedByUser={reel.likedByUser}
          onLike={() => onLike?.(reel.id)}
          onComment={() => onComment?.(reel)}
          onShare={() => onShare?.(reel)}
        />
      </div>
    </article>
  );
}

export const ReelCard = memo(ReelCardImpl);
