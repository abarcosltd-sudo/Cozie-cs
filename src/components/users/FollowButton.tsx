import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "../ui/Button";
import {
  useFollowMutation,
  useFollowStatus,
  useUnfollowMutation,
} from "../../hooks/useFollow";

interface FollowButtonProps {
  /** User to follow / unfollow. */
  userId: string;
  /** Hide entirely when viewing own profile. */
  hideOnSelf?: boolean;
}

export function FollowButton({ userId, hideOnSelf = true }: FollowButtonProps) {
  const status = useFollowStatus(userId);
  const followMut = useFollowMutation();
  const unfollowMut = useUnfollowMutation();

  if (!userId) return null;
  if (status.isPending) {
    return (
      <Button variant="secondary" size="sm" loading aria-label="Loading follow status">
        …
      </Button>
    );
  }
  if (status.error || !status.data) return null;
  if (hideOnSelf && status.data.isSelf) return null;

  const following = status.data.isFollowing;
  const isWorking = followMut.isPending || unfollowMut.isPending;

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="sm"
      loading={isWorking}
      leftIcon={
        following ? <UserMinus size={14} aria-hidden /> : <UserPlus size={14} aria-hidden />
      }
      onClick={() => {
        if (following) unfollowMut.mutate(userId);
        else followMut.mutate(userId);
      }}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
