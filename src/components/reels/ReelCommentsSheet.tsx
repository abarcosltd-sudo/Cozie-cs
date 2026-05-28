/**
 * Bottom-sheet variant of the comments modal for a single reel.
 *
 * Differences vs `CommentsModal` in `HomeFeed.tsx`:
 *   - Cursor-paginated via `useInfiniteQuery` — backend supports it, and
 *     popular reels comfortably blow past a single page.
 *   - Mounts/unmounts based on the `reel` prop being non-null so the parent
 *     can drive open state with one piece of state.
 */
import { useState, type KeyboardEvent } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorBox } from "../ui/ErrorBox";
import { Spinner } from "../ui/Spinner";
import { useReelComments, useAddReelComment } from "../../hooks/useReels";
import { useAuth } from "../../contexts/AuthContext";
import type { Reel } from "../../types/api";
import styles from "./ReelCommentsSheet.module.css";

interface ReelCommentsSheetProps {
  reel: Reel | null;
  onClose: () => void;
}

function timeAgo(iso: string): string {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ReelCommentsSheet({ reel, onClose }: ReelCommentsSheetProps) {
  const { user } = useAuth();
  const comments = useReelComments(reel?.id ?? null);
  const addComment = useAddReelComment(reel?.id ?? "");
  const [text, setText] = useState("");

  const allComments =
    comments.data?.pages.flatMap((p) => p.comments) ?? [];

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !reel) return;
    setText("");
    try {
      await addComment.mutateAsync(trimmed);
    } catch {
      // Surface a friendly retry by restoring the text.
      setText(trimmed);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <Modal
      open={!!reel}
      title="Comments"
      onClose={() => {
        setText("");
        onClose();
      }}
      footer={
        <>
          <textarea
            className={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Write a comment…"
            rows={2}
            disabled={addComment.isPending}
            aria-label="Write a comment"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={!text.trim()}
            loading={addComment.isPending}
            leftIcon={<Send size={14} aria-hidden />}
          >
            Post
          </Button>
        </>
      }
    >
      {comments.isPending ? (
        <div className={styles.loading}>
          <Spinner /> Loading comments…
        </div>
      ) : comments.error ? (
        <ErrorBox
          variant="inline"
          message="Could not load comments."
          onRetry={() => comments.refetch()}
        />
      ) : allComments.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={32} aria-hidden />}
          title="No comments yet"
          description="Be the first to say something."
        />
      ) : (
        <>
          <ul className={styles.list}>
            {allComments.map((c) => (
              <li key={c.id} className={styles.item}>
                <Avatar
                  src={c.userAvatarUrl}
                  name={c.userName}
                  seed={c.userId}
                  size={32}
                />
                <div className={styles.body}>
                  <div className={styles.meta}>
                    <strong>
                      {c.userId === user?.id ? "You" : c.userName}
                    </strong>
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className={styles.text}>{c.text}</div>
                </div>
              </li>
            ))}
          </ul>
          {comments.hasNextPage ? (
            <div className={styles.loadMore}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => comments.fetchNextPage()}
                loading={comments.isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}
