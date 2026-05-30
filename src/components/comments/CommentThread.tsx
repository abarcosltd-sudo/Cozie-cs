/**
 * Shared comments UI used by both `HomeFeed`'s post comments modal and
 * `ReelCommentsSheet`. Renders:
 *   - top-level comments list (paginated, infinite-query)
 *   - per-comment like button (optimistic flip)
 *   - per-comment "Reply" affordance that opens an inline composer
 *   - per-comment "View N replies" expander that lazily fetches replies
 *
 * The component is presentational + coordination only — all data fetching
 * and mutation logic is injected via `bindings` so the same component can
 * be wired against the post-comment hooks or the reel-comment hooks.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { Heart, MessageCircle, Send } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorBox } from "../ui/ErrorBox";
import { Spinner } from "../ui/Spinner";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./CommentThread.module.css";

// Structural shape every comment surface (post + reel) must conform to.
// `MusicComment` and `ReelComment` are intentionally identical so both
// satisfy this interface via TypeScript's structural typing — no casts
// needed at call sites.
export interface CommentLike {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  text: string;
  parentCommentId: string | null;
  likeCount: number;
  likedByUser: boolean;
  replyCount: number;
  createdAt: string;
}

export interface CommentsPageLike {
  comments: CommentLike[];
  nextCursor: string | null;
  count: number;
}

type AnyComment = CommentLike;

export interface CommentThreadBindings {
  comments: UseInfiniteQueryResult<InfiniteData<CommentsPageLike>, Error>;
  /**
   * Pass `parentCommentId` to add a reply. Resolves once the server has
   * confirmed (so the optimistic cache update has already landed via the
   * mutation's `onSuccess`). Must throw on failure so the inline composer
   * can restore its draft text.
   */
  addComment: (
    text: string,
    parentCommentId?: string | null
  ) => Promise<unknown>;
  toggleLike: (commentId: string) => Promise<unknown>;
  /**
   * Factory returning the replies infinite-query for a specific comment.
   * Each row instantiates its own copy when its expander opens — passing
   * `enabled=false` keeps the hook mounted but inert until the user opts
   * in. Named with the `use` prefix so React's hook lint passes.
   */
  useReplies: (
    commentId: string,
    enabled: boolean
  ) => UseInfiniteQueryResult<InfiniteData<CommentsPageLike>, Error>;
  isAddingComment: boolean;
}

interface CommentThreadProps {
  bindings: CommentThreadBindings;
  /** Optional empty-state CTA copy. */
  emptyCopy?: { title?: string; description?: string };
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

export function CommentThread({ bindings, emptyCopy }: CommentThreadProps) {
  const { comments } = bindings;
  const allComments = useMemo<AnyComment[]>(
    () => comments.data?.pages.flatMap((p) => p.comments) ?? [],
    [comments.data]
  );

  if (comments.isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading comments…
      </div>
    );
  }
  if (comments.error) {
    return (
      <ErrorBox
        variant="inline"
        message="Could not load comments."
        onRetry={() => comments.refetch()}
      />
    );
  }
  if (allComments.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle size={32} aria-hidden />}
        title={emptyCopy?.title || "No comments yet"}
        description={emptyCopy?.description || "Be the first to say something."}
      />
    );
  }

  return (
    <>
      <ul className={styles.list}>
        {allComments.map((c) => (
          <CommentRow key={c.id} comment={c} bindings={bindings} />
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
  );
}

interface CommentRowProps {
  comment: AnyComment;
  bindings: CommentThreadBindings;
}

function CommentRow({ comment, bindings }: CommentRowProps) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [liking, setLiking] = useState(false);

  // The replies query mounts when expanded — we keep the hook mounted
  // afterwards so collapsing/re-expanding doesn't refetch.
  const replies = bindings.useReplies(comment.id, repliesExpanded);

  const allReplies = useMemo<AnyComment[]>(
    () => replies.data?.pages.flatMap((p) => p.comments) ?? [],
    [replies.data]
  );

  const handleToggleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      await bindings.toggleLike(comment.id);
    } finally {
      setLiking(false);
    }
  };

  // Only top-level comments get replies / a "Reply" affordance. The tree
  // is flat — replies are never themselves expanded.
  const isTopLevel = !comment.parentCommentId;
  const replyCount = isTopLevel ? comment.replyCount || 0 : 0;

  return (
    <li className={styles.item}>
      <Avatar
        src={comment.userAvatarUrl}
        name={comment.userName}
        seed={comment.userId}
        size={32}
      />
      <div className={styles.body}>
        <div className={styles.meta}>
          <strong>
            {comment.userId === user?.id ? "You" : comment.userName}
          </strong>
          <span>{timeAgo(comment.createdAt)}</span>
        </div>
        <div className={styles.text}>{comment.text}</div>

        <div className={styles.actions}>
          <button
            type="button"
            className={[
              styles.likeBtn,
              comment.likedByUser ? styles.liked : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={handleToggleLike}
            disabled={liking}
            aria-pressed={comment.likedByUser}
            aria-label={comment.likedByUser ? "Unlike comment" : "Like comment"}
          >
            <Heart
              size={14}
              aria-hidden
              fill={comment.likedByUser ? "currentColor" : "none"}
            />
            {comment.likeCount > 0 ? (
              <span className={styles.count}>{comment.likeCount}</span>
            ) : null}
          </button>

          {isTopLevel ? (
            <button
              type="button"
              className={styles.replyBtn}
              onClick={() => setReplyOpen((v) => !v)}
              aria-expanded={replyOpen}
            >
              Reply
            </button>
          ) : null}
        </div>

        {replyOpen ? (
          <ReplyComposer
            placeholder={`Reply to ${
              comment.userId === user?.id ? "yourself" : comment.userName
            }…`}
            isPending={bindings.isAddingComment}
            onSubmit={async (text) => {
              await bindings.addComment(text, comment.id);
              setReplyOpen(false);
              // Auto-expand the thread so the new reply is visible.
              setRepliesExpanded(true);
            }}
            onCancel={() => setReplyOpen(false)}
          />
        ) : null}

        {isTopLevel && replyCount > 0 ? (
          <button
            type="button"
            className={styles.expander}
            onClick={() => setRepliesExpanded((v) => !v)}
            aria-expanded={repliesExpanded}
          >
            <span className={styles.expanderLine} aria-hidden />
            {repliesExpanded
              ? `Hide replies`
              : `View ${replyCount} ${
                  replyCount === 1 ? "reply" : "replies"
                }`}
          </button>
        ) : null}

        {repliesExpanded ? (
          <RepliesList replies={replies} allReplies={allReplies} bindings={bindings} />
        ) : null}
      </div>
    </li>
  );
}

interface RepliesListProps {
  replies: UseInfiniteQueryResult<InfiniteData<CommentsPageLike>, Error>;
  allReplies: AnyComment[];
  bindings: CommentThreadBindings;
}

function RepliesList({ replies, allReplies, bindings }: RepliesListProps) {
  if (replies.isPending) {
    return (
      <div className={styles.repliesLoading}>
        <Spinner /> Loading replies…
      </div>
    );
  }
  if (replies.error) {
    return (
      <div className={styles.repliesError}>
        <ErrorBox
          variant="inline"
          message="Could not load replies."
          onRetry={() => replies.refetch()}
        />
      </div>
    );
  }
  return (
    <ul className={styles.replyList}>
      {allReplies.map((r) => (
        <CommentRow key={r.id} comment={r} bindings={bindings} />
      ))}
      {replies.hasNextPage ? (
        <li className={styles.replyLoadMore}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => replies.fetchNextPage()}
            loading={replies.isFetchingNextPage}
          >
            More replies
          </Button>
        </li>
      ) : null}
    </ul>
  );
}

interface ReplyComposerProps {
  placeholder: string;
  isPending: boolean;
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}

function ReplyComposer({
  placeholder,
  isPending,
  onSubmit,
  onCancel,
}: ReplyComposerProps) {
  const [text, setText] = useState("");

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await onSubmit(trimmed);
    } catch {
      // Restore draft so the user can retry.
      setText(trimmed);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.composerInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={2}
        disabled={isPending}
        aria-label="Write a reply"
        autoFocus
      />
      <div className={styles.composerActions}>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!text.trim()}
          loading={isPending}
          leftIcon={<Send size={14} aria-hidden />}
        >
          Reply
        </Button>
      </div>
    </div>
  );
}

/** Convenience footer composer for the top-level "Write a comment" input
 *  used in the modal footer slot. Same Enter-to-submit semantics as
 *  `ReplyComposer` but laid out for the modal footer (textarea + Post). */
export function CommentComposer({
  isPending,
  onSubmit,
  placeholder,
  postLabel = "Post",
  rightSlot,
}: {
  isPending: boolean;
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  postLabel?: string;
  /** Optional extra slot rendered next to the Post button (unused today). */
  rightSlot?: ReactNode;
}) {
  const [text, setText] = useState("");

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await onSubmit(trimmed);
    } catch {
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
    <>
      <textarea
        className={styles.footerInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder || "Write a comment…"}
        rows={2}
        disabled={isPending}
        aria-label="Write a comment"
      />
      {rightSlot}
      <Button
        variant="primary"
        size="sm"
        onClick={submit}
        disabled={!text.trim()}
        loading={isPending}
        leftIcon={<Send size={14} aria-hidden />}
      >
        {postLabel}
      </Button>
    </>
  );
}
