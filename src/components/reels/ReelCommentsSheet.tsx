/**
 * Bottom-sheet variant of the comments modal for a single reel.
 *
 * All comment-thread rendering (likes, replies, expanders, composer) is
 * delegated to the shared `CommentThread` component so the post-feed
 * modal and this sheet stay byte-for-byte identical. This file just
 * binds the reel-specific TanStack Query hooks.
 */
import { Modal } from "../ui/Modal";
import {
  CommentThread,
  CommentComposer,
} from "../comments/CommentThread";
import {
  useReelComments,
  useReelCommentReplies,
  useAddReelComment,
  useToggleReelCommentLike,
} from "../../hooks/useReels";
import type { Reel } from "../../types/api";

interface ReelCommentsSheetProps {
  reel: Reel | null;
  onClose: () => void;
}

export function ReelCommentsSheet({ reel, onClose }: ReelCommentsSheetProps) {
  const reelId = reel?.id ?? "";
  const comments = useReelComments(reel?.id ?? null);
  const addCommentMut = useAddReelComment(reelId);
  const toggleLikeMut = useToggleReelCommentLike(reelId);

  return (
    <Modal
      open={!!reel}
      title="Comments"
      onClose={onClose}
      footer={
        <CommentComposer
          isPending={addCommentMut.isPending}
          onSubmit={async (text) => {
            await addCommentMut.mutateAsync({ text });
          }}
        />
      }
    >
      {reel ? (
        <CommentThread
          bindings={{
            comments,
            addComment: (text, parentCommentId) =>
              addCommentMut.mutateAsync({ text, parentCommentId }),
            toggleLike: (commentId) => toggleLikeMut.mutateAsync(commentId),
            useReplies: (commentId, enabled) =>
              useReelCommentReplies(reelId, commentId, enabled),
            isAddingComment: addCommentMut.isPending,
          }}
        />
      ) : null}
    </Modal>
  );
}
