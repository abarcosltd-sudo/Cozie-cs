import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Music, Share2, MoreHorizontal } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import {
  CommentThread,
  CommentComposer,
} from "../components/comments/CommentThread";
import {
  useFollowingFeed,
  useTogglePostLike,
  usePostComments,
  usePostCommentReplies,
  useAddComment,
  useTogglePostCommentLike,
} from "../hooks/useFeed";
import { ApiError } from "../lib/api";
import type { MusicPost } from "../types/api";
import styles from "./HomeFeed.module.css";

function timeAgo(iso: string): string {
  if (!iso) return "Just now";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export default function HomeFeed() {
  const navigate = useNavigate();
  const feed = useFollowingFeed();
  const likeMut = useTogglePostLike();
  const [activeCommentPost, setActiveCommentPost] = useState<MusicPost | null>(
    null
  );

  const posts = feed.data?.posts ?? [];

  const handlePlay = (post: MusicPost) => {
    navigate("/play-music", {
      state: {
        currentSong: {
          id: post.songId,
          title: post.songSnapshot.title,
          artist: post.songSnapshot.artist,
          albumArtUrl: post.songSnapshot.albumArtUrl,
          fileUrl: post.songSnapshot.fileUrl || null,
        },
      },
    });
  };

  return (
    <PageLayout navKey="home" branded>
      {feed.isPending ? (
        <div className={styles.loading}>
          <Spinner /> Loading your feed…
        </div>
      ) : feed.error ? (
        <ErrorBox
          variant="page"
          title="Could not load feed"
          message={
            feed.error instanceof ApiError ? feed.error.message : "Network error"
          }
          onRetry={() => feed.refetch()}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Music size={36} aria-hidden />}
          title="Your feed is empty"
          description="Follow some friends or share your first song to fill it up."
          action={
            <div className={styles.emptyActions}>
              <Button variant="primary" onClick={() => navigate("/share-music")}>
                Share a song
              </Button>
              <Button variant="secondary" onClick={() => navigate("/discover")}>
                Discover music
              </Button>
            </div>
          }
        />
      ) : (
        <ul className={styles.feed}>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                onLike={() => likeMut.mutate(post.id)}
                onComment={() => setActiveCommentPost(post)}
                onPlay={() => handlePlay(post)}
              />
            </li>
          ))}
        </ul>
      )}

      <CommentsModal
        post={activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
      />
    </PageLayout>
  );
}

interface PostCardProps {
  post: MusicPost;
  onLike: () => void;
  onComment: () => void;
  onPlay: () => void;
}

function PostCard({ post, onLike, onComment, onPlay }: PostCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div className={styles.user}>
          <Avatar
            src={post.userAvatarUrl}
            name={post.userName}
            seed={post.userId}
            size={40}
          />
          <div>
            <div className={styles.userName}>{post.userName}</div>
            <div className={styles.postTime}>{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" aria-label="More options">
          <MoreHorizontal size={18} aria-hidden />
        </Button>
      </header>

      <button
        type="button"
        className={styles.albumArt}
        onClick={onPlay}
        aria-label={`Play ${post.songSnapshot.title} by ${post.songSnapshot.artist}`}
      >
        {post.songSnapshot.albumArtUrl ? (
          <img
            src={post.songSnapshot.albumArtUrl}
            alt={`${post.songSnapshot.title} album art`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Music size={48} aria-hidden className={styles.albumIcon} />
        )}
      </button>

      <div className={styles.trackInfo}>
        <div className={styles.trackTitle}>{post.songSnapshot.title}</div>
        <div className={styles.trackArtist}>{post.songSnapshot.artist}</div>
      </div>

      {post.caption ? (
        <p className={styles.caption}>{post.caption}</p>
      ) : null}

      <div className={styles.actionBar}>
        <button
          type="button"
          className={`${styles.actionBtn} ${
            post.likedByUser ? styles.actionLiked : ""
          }`}
          onClick={onLike}
          aria-pressed={post.likedByUser}
          aria-label={post.likedByUser ? "Unlike post" : "Like post"}
        >
          <Heart
            size={20}
            aria-hidden
            fill={post.likedByUser ? "currentColor" : "none"}
          />
          <span>{post.likes}</span>
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onComment}
          aria-label="Open comments"
        >
          <MessageCircle size={20} aria-hidden />
          <span>{post.comments}</span>
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          aria-label="Share post"
        >
          <Share2 size={20} aria-hidden />
        </button>
      </div>
    </article>
  );
}

interface CommentsModalProps {
  post: MusicPost | null;
  onClose: () => void;
}

function CommentsModal({ post, onClose }: CommentsModalProps) {
  const postId = post?.id ?? "";
  const comments = usePostComments(post?.id ?? null);
  const addCommentMut = useAddComment(postId);
  const toggleLikeMut = useTogglePostCommentLike(postId);

  return (
    <Modal
      open={!!post}
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
      {post ? (
        <CommentThread
          bindings={{
            comments,
            addComment: (text, parentCommentId) =>
              addCommentMut.mutateAsync({ text, parentCommentId }),
            toggleLike: (commentId) => toggleLikeMut.mutateAsync(commentId),
            useReplies: (commentId, enabled) =>
              usePostCommentReplies(postId, commentId, enabled),
            isAddingComment: addCommentMut.isPending,
          }}
        />
      ) : null}
    </Modal>
  );
}
