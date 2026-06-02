import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Globe,
  Lock,
  Music,
  Sparkles,
  Users,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import {
  useBubble,
  useBubblePosts,
  useJoinBubble,
  useLeaveBubble,
  useReleaseBubblePost,
} from "../hooks/useBubbles";
import type { MusicPost } from "../types/api";
import styles from "./BubbleProfile.module.css";

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

export default function BubbleProfile() {
  const { artistId = "" } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bubbleQuery = useBubble(artistId);
  const isOwner = bubbleQuery.data?.userMembership.isOwner ?? false;
  const isMember = bubbleQuery.data?.userMembership.isMember ?? false;
  const canSeePosts = isOwner || isMember;

  // Only fetch posts when the viewer is allowed — otherwise we'd flood
  // the API with 403s on every render of a non-member's preview.
  const posts = useBubblePosts(canSeePosts ? artistId : null);

  const joinMut = useJoinBubble(artistId);
  const leaveMut = useLeaveBubble(artistId);

  return (
    <PageLayout title="Artist Bubble" showBack onBack={() => navigate(-1)}>
      {bubbleQuery.isPending ? (
        <div className={styles.loader}>
          <Spinner /> Loading bubble…
        </div>
      ) : bubbleQuery.error ? (
        <div style={{ padding: "16px" }}>
          <ErrorBox
            variant="page"
            title="Could not load bubble"
            message={
              bubbleQuery.error instanceof ApiError
                ? bubbleQuery.error.message
                : "Network error"
            }
            onRetry={() => bubbleQuery.refetch()}
          />
        </div>
      ) : (
        <div className={styles.page}>
          <Hero
            bubble={bubbleQuery.data!.bubble}
            isOwner={isOwner}
            isMember={isMember}
            joining={joinMut.isPending}
            leaving={leaveMut.isPending}
            onJoin={() => joinMut.mutate()}
            onLeave={() => leaveMut.mutate()}
            onShare={() => navigate("/share-music")}
          />

          {isOwner ? (
            <OwnerBanner />
          ) : isMember ? (
            <MemberBanner />
          ) : (
            <LockedPreview
              bubble={bubbleQuery.data!.bubble}
              joining={joinMut.isPending}
              onJoin={() => joinMut.mutate()}
            />
          )}

          {canSeePosts ? (
            <PostsSection
              posts={posts}
              ownerArtistId={artistId}
              viewerIsOwner={isOwner}
              viewerIsArtist={user?.userType === "artist"}
            />
          ) : null}
        </div>
      )}
    </PageLayout>
  );
}

interface HeroProps {
  bubble: NonNullable<ReturnType<typeof useBubble>["data"]>["bubble"];
  isOwner: boolean;
  isMember: boolean;
  joining: boolean;
  leaving: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onShare: () => void;
}

function Hero({
  bubble,
  isOwner,
  isMember,
  joining,
  leaving,
  onJoin,
  onLeave,
  onShare,
}: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroRow}>
        <Avatar name={bubble.artistName} seed={bubble.artistId} size={72} />
        <div className={styles.heroMeta}>
          <h1 className={styles.artistName}>
            {bubble.artistName}
            <Badge variant="artist" icon={<Sparkles size={10} aria-hidden />}>
              Artist
            </Badge>
          </h1>
          <p className={styles.handle}>Cozie bubble</p>
        </div>
      </div>
      <div className={styles.statsRow}>
        <span>
          <span className={styles.statValue}>
            {bubble.memberCount.toLocaleString()}
          </span>{" "}
          members
        </span>
        <span>
          <span className={styles.statValue}>
            {bubble.postCount.toLocaleString()}
          </span>{" "}
          posts
        </span>
      </div>
      <div className={styles.ctaRow}>
        {isOwner ? (
          <Button
            variant="primary"
            size="md"
            onClick={onShare}
            leftIcon={<Music size={16} aria-hidden />}
          >
            Share to bubble
          </Button>
        ) : isMember ? (
          <Button
            variant="secondary"
            size="md"
            loading={leaving}
            onClick={onLeave}
          >
            Joined
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            loading={joining}
            onClick={onJoin}
            leftIcon={<Users size={16} aria-hidden />}
          >
            Join bubble
          </Button>
        )}
      </div>
    </section>
  );
}

function OwnerBanner() {
  return (
    <div className={styles.banner}>
      <Sparkles size={18} aria-hidden className={styles.bannerIcon} />
      <div>
        <div className={styles.bannerTitle}>Your bubble</div>
        <div className={styles.bannerSubtitle}>
          Drop a song here first and your members get an early listen. When
          you're ready, hit Release to push it public.
        </div>
      </div>
    </div>
  );
}

function MemberBanner() {
  return (
    <div className={styles.banner}>
      <CheckCircle2 size={18} aria-hidden className={styles.bannerIcon} />
      <div>
        <div className={styles.bannerTitle}>You're in</div>
        <div className={styles.bannerSubtitle}>
          You'll get bubble-only drops in your home feed before they go public.
        </div>
      </div>
    </div>
  );
}

interface LockedPreviewProps {
  bubble: NonNullable<ReturnType<typeof useBubble>["data"]>["bubble"];
  joining: boolean;
  onJoin: () => void;
}

function LockedPreview({ bubble, joining, onJoin }: LockedPreviewProps) {
  return (
    <div className={styles.lockedPreview}>
      <Lock size={28} aria-hidden style={{ color: "#c084fc" }} />
      <div className={styles.lockedTitle}>Members-only content</div>
      <p className={styles.lockedSubtitle}>
        Join {bubble.artistName}'s bubble to hear unreleased tracks and exclusive
        posts before anyone else.
      </p>
      <Button variant="primary" size="md" loading={joining} onClick={onJoin}>
        Join bubble
      </Button>
    </div>
  );
}

interface PostsSectionProps {
  posts: ReturnType<typeof useBubblePosts>;
  ownerArtistId: string;
  viewerIsOwner: boolean;
  viewerIsArtist: boolean;
}

function PostsSection({
  posts,
  ownerArtistId,
  viewerIsOwner,
  viewerIsArtist,
}: PostsSectionProps) {
  const releaseMut = useReleaseBubblePost(ownerArtistId);
  const [pendingPost, setPendingPost] = useState<MusicPost | null>(null);

  const flat = useMemo(
    () => posts.data?.pages.flatMap((p) => p.posts) ?? [],
    [posts.data?.pages]
  );

  if (posts.isPending) {
    return (
      <div className={styles.loader}>
        <Spinner /> Loading posts…
      </div>
    );
  }
  if (posts.error) {
    return (
      <div style={{ padding: "0 14px" }}>
        <ErrorBox
          variant="inline"
          message={
            posts.error instanceof ApiError ? posts.error.message : "Failed to load"
          }
          onRetry={() => posts.refetch()}
        />
      </div>
    );
  }
  if (flat.length === 0) {
    return (
      <EmptyState
        icon={<Music size={32} aria-hidden />}
        title="No bubble posts yet"
        description={
          viewerIsOwner
            ? "Share your first track to start your bubble."
            : "Your artist hasn't dropped anything yet."
        }
      />
    );
  }

  return (
    <>
      <ul className={styles.postList}>
        {flat.map((post) => (
          <li key={post.id}>
            <BubblePostCard
              post={post}
              canRelease={
                viewerIsOwner && viewerIsArtist && post.bubbleInfo.isBubbleOnly
              }
              onRelease={() => setPendingPost(post)}
            />
          </li>
        ))}
      </ul>
      {posts.hasNextPage ? (
        <div className={styles.loadMoreWrap}>
          <Button
            variant="secondary"
            size="sm"
            loading={posts.isFetchingNextPage}
            onClick={() => posts.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}

      <ReleaseDialog
        post={pendingPost}
        onClose={() => setPendingPost(null)}
        onConfirm={async () => {
          if (!pendingPost) return;
          try {
            await releaseMut.mutateAsync(pendingPost.id);
          } finally {
            setPendingPost(null);
          }
        }}
        isReleasing={releaseMut.isPending}
      />
    </>
  );
}

interface BubblePostCardProps {
  post: MusicPost;
  canRelease: boolean;
  onRelease: () => void;
}

function BubblePostCard({ post, canRelease, onRelease }: BubblePostCardProps) {
  const isBubbleOnly = post.bubbleInfo.isBubbleOnly;
  return (
    <article
      className={`${styles.postCard} ${
        isBubbleOnly ? styles.postBubbleOnly : ""
      }`}
    >
      <header className={styles.postHead}>
        <div className={styles.songRow}>
          <Avatar
            src={post.songSnapshot.albumArtUrl}
            name={post.songSnapshot.title}
            seed={post.songId}
            size={48}
          />
          <div className={styles.songMeta}>
            <span className={styles.songTitle}>{post.songSnapshot.title}</span>
            <span className={styles.songArtist}>
              {post.songSnapshot.artist}
            </span>
          </div>
        </div>
        {isBubbleOnly ? (
          <Badge variant="bubbleOnly" icon={<Lock size={10} aria-hidden />}>
            Bubble Only
          </Badge>
        ) : (
          <Badge variant="released" icon={<Globe size={10} aria-hidden />}>
            Released
          </Badge>
        )}
      </header>

      {post.caption ? <p className={styles.caption}>{post.caption}</p> : null}

      <div className={styles.postFooter}>
        <span className={styles.timestamp}>{timeAgo(post.createdAt)}</span>
        {canRelease ? (
          <Button variant="primary" size="sm" onClick={onRelease}>
            Release to public
          </Button>
        ) : null}
      </div>
    </article>
  );
}

interface ReleaseDialogProps {
  post: MusicPost | null;
  isReleasing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ReleaseDialog({
  post,
  isReleasing,
  onClose,
  onConfirm,
}: ReleaseDialogProps) {
  return (
    <Modal
      open={Boolean(post)}
      title="Release this post?"
      onClose={isReleasing ? () => {} : onClose}
      footer={
        <div className={styles.releaseDialogFooter}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isReleasing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={isReleasing}
            onClick={onConfirm}
          >
            Release now
          </Button>
        </div>
      }
    >
      <div className={styles.releaseDialogBody}>
        <p>
          Releasing{" "}
          <span className={styles.releaseDialogStrong}>
            "{post?.songSnapshot.title}"
          </span>{" "}
          will make it public — everyone (not just bubble members) will be able
          to see it and share it.
        </p>
        <p>
          This <span className={styles.releaseDialogStrong}>can't be undone</span>:
          once a track is public on Cozie, it stays public.
        </p>
      </div>
    </Modal>
  );
}
