import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Film,
  Heart,
  ListMusic,
  LogOut,
  Music,
  Play,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { FollowButton } from "../components/users/FollowButton";
import { useAuth } from "../contexts/AuthContext";
import {
  usePublicProfile,
  useUserLikedSongs,
  useUserPosts,
} from "../hooks/useProfile";
import { useDeleteReel, useUserReels } from "../hooks/useReels";
import { ApiError } from "../lib/api";
import type { MusicPost, MusicTrack, Reel, User } from "../types/api";
import styles from "./UserProfile.module.css";

type Tab = "posts" | "reels" | "playlists" | "liked";

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const isSelf = !paramUserId || paramUserId === me?.id;
  const effectiveUserId = paramUserId || me?.id;

  const profileQuery = usePublicProfile(isSelf ? undefined : paramUserId);
  const profile: User | null = isSelf ? me : profileQuery.data?.user ?? null;

  const posts = useUserPosts(effectiveUserId);
  const liked = useUserLikedSongs(effectiveUserId);
  const reels = useUserReels(effectiveUserId);

  const [tab, setTab] = useState<Tab>("posts");

  const loading = isSelf ? false : profileQuery.isPending;
  const error = isSelf ? null : profileQuery.error;

  const headerRight = useMemo(() => {
    if (!isSelf) return null;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/settings")}
        aria-label="Settings"
      >
        <Settings size={18} aria-hidden />
      </Button>
    );
  }, [isSelf, navigate]);

  if (loading) {
    return (
      <PageLayout navKey={isSelf ? "profile" : undefined} showBack={!isSelf}>
        <div className={styles.loading}>
          <Spinner /> Loading profile…
        </div>
      </PageLayout>
    );
  }
  if (error || !profile) {
    return (
      <PageLayout navKey={isSelf ? "profile" : undefined} showBack={!isSelf}>
        <ErrorBox
          variant="page"
          title="Could not load profile"
          message={
            error instanceof ApiError ? error.message : "Try again later."
          }
          onRetry={() => profileQuery.refetch()}
        />
      </PageLayout>
    );
  }

  const handle = profile.username ? `@${profile.username}` : "";
  const displayName = profile.displayName || profile.fullname || "User";
  const postCount = posts.data?.posts?.length ?? 0;

  return (
    <PageLayout
      navKey={isSelf ? "profile" : undefined}
      showBack={!isSelf}
      headerRight={headerRight}
    >
      <header className={styles.profileHeader}>
        <Avatar
          src={profile.photoURL || null}
          name={displayName}
          seed={profile.id}
          size={96}
          className={styles.avatar}
        />
        <h1 className={styles.name}>{displayName}</h1>
        {handle ? <p className={styles.handle}>{handle}</p> : null}
        {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}

        <ul className={styles.stats}>
          <li>
            <Link
              to={isSelf ? "/followers" : `/followers/${profile.id}`}
              className={styles.statBlock}
            >
              <span className={styles.statNumber}>{profile.followerCount}</span>
              <span className={styles.statLabel}>Followers</span>
            </Link>
          </li>
          <li>
            <Link
              to={isSelf ? "/following" : `/following/${profile.id}`}
              className={styles.statBlock}
            >
              <span className={styles.statNumber}>{profile.followingCount}</span>
              <span className={styles.statLabel}>Following</span>
            </Link>
          </li>
          <li>
            <div className={styles.statBlock}>
              <span className={styles.statNumber}>{postCount}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
          </li>
        </ul>

        <div className={styles.actions}>
          {isSelf ? (
            <>
              <Button
                variant="primary"
                onClick={() => navigate("/edit-profile")}
              >
                Edit profile
              </Button>
              {profile.userType === "artist" ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/bubble/${profile.id}`)}
                  leftIcon={<Sparkles size={14} aria-hidden />}
                >
                  My bubble
                </Button>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => logout()}
                leftIcon={<LogOut size={14} aria-hidden />}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <FollowButton userId={profile.id} />
              {profile.userType === "artist" ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/bubble/${profile.id}`)}
                  leftIcon={<Sparkles size={14} aria-hidden />}
                >
                  View bubble
                </Button>
              ) : null}
            </>
          )}
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Profile sections">
        <TabButton
          active={tab === "posts"}
          onClick={() => setTab("posts")}
          icon={<Music size={16} aria-hidden />}
          label="Posts"
        />
        <TabButton
          active={tab === "reels"}
          onClick={() => setTab("reels")}
          icon={<Film size={16} aria-hidden />}
          label="Reels"
        />
        <TabButton
          active={tab === "playlists"}
          onClick={() => setTab("playlists")}
          icon={<ListMusic size={16} aria-hidden />}
          label="Playlists"
        />
        <TabButton
          active={tab === "liked"}
          onClick={() => setTab("liked")}
          icon={<Heart size={16} aria-hidden />}
          label="Liked"
        />
      </nav>

      <div className={styles.tabPanel}>
        {tab === "posts" ? <PostsGrid query={posts} /> : null}
        {tab === "reels" ? (
          <ReelsGrid
            query={reels}
            canDelete={isSelf}
            onOpen={(reelId) => navigate(`/reels/${reelId}`)}
          />
        ) : null}
        {tab === "playlists" ? (
          <EmptyState
            icon={<ListMusic size={36} aria-hidden />}
            title="No playlists yet"
            description="Playlists are coming soon."
          />
        ) : null}
        {tab === "liked" ? <LikedGrid query={liked} /> : null}
      </div>
    </PageLayout>
  );
}

/**
 * 3-column thumbnail grid for a user's reels. Tapping a tile opens the
 * single-reel viewer at `/reels/:reelId`, which then permits vertical swipe
 * through the rest of the author's clips. When `canDelete` is true (the
 * profile owner is viewing their own grid) each tile gets a trash overlay
 * that runs `useDeleteReel` after a `window.confirm` — same lightweight
 * confirmation pattern as the messages screen.
 */
function ReelsGrid({
  query,
  canDelete,
  onOpen,
}: {
  query: ReturnType<typeof useUserReels>;
  canDelete: boolean;
  onOpen: (reelId: string) => void;
}) {
  const deleteReel = useDeleteReel();

  if (query.isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading reels…
      </div>
    );
  }
  if (query.error) {
    return (
      <ErrorBox
        variant="inline"
        message="Couldn't load reels."
        onRetry={() => query.refetch()}
      />
    );
  }
  const items: Reel[] = query.data?.pages.flatMap((p) => p.reels) ?? [];
  if (!items.length) {
    return (
      <EmptyState
        icon={<Film size={36} aria-hidden />}
        title="No reels yet"
        description="Share a clip to fill this grid."
      />
    );
  }

  const handleDelete = (reelId: string) => {
    if (
      !window.confirm(
        "Delete this reel? This permanently removes the video and all its likes, views, and comments."
      )
    ) {
      return;
    }
    deleteReel.mutate(reelId, {
      onError: (err) => {
        window.alert(
          err instanceof ApiError
            ? err.message
            : "Couldn't delete the reel. Please try again."
        );
      },
    });
  };

  return (
    <>
      <div className={styles.grid}>
        {items.map((reel) => (
          <div key={reel.id} className={styles.reelTileWrap}>
            <button
              type="button"
              className={styles.gridItem}
              style={{
                backgroundImage: reel.thumbnailUrl
                  ? `url(${reel.thumbnailUrl})`
                  : undefined,
              }}
              aria-label={`Open reel${
                reel.caption ? `: ${reel.caption}` : ""
              }`}
              onClick={() => onOpen(reel.id)}
            >
              {!reel.thumbnailUrl ? (
                <div className={styles.gridFallback}>
                  <Film size={22} aria-hidden />
                </div>
              ) : null}
              <span className={styles.reelTileBadge}>
                <Play size={12} aria-hidden fill="currentColor" />
                <span>{reel.viewCount.toLocaleString()}</span>
              </span>
            </button>
            {canDelete ? (
              <button
                type="button"
                className={styles.reelDeleteBtn}
                aria-label="Delete reel"
                title="Delete reel"
                disabled={
                  deleteReel.isPending &&
                  deleteReel.variables === reel.id
                }
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(reel.id);
                }}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {query.hasNextPage ? (
        <div className={styles.gridLoadMore}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.fetchNextPage()}
            loading={query.isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`${styles.tab} ${active ? styles.tabActive : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PostsGrid({ query }: { query: ReturnType<typeof useUserPosts> }) {
  if (query.isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading posts…
      </div>
    );
  }
  if (query.error) {
    return (
      <ErrorBox
        variant="inline"
        message="Couldn't load posts."
        onRetry={() => query.refetch()}
      />
    );
  }
  const posts = query.data?.posts ?? [];
  if (!posts.length) {
    return (
      <EmptyState
        icon={<Music size={36} aria-hidden />}
        title="No posts yet"
        description="Share a song to fill this grid."
      />
    );
  }
  return (
    <div className={styles.grid}>
      {posts.map((p: MusicPost) => (
        <button
          key={p.id}
          type="button"
          className={styles.gridItem}
          style={{
            backgroundImage: p.songSnapshot.albumArtUrl
              ? `url(${p.songSnapshot.albumArtUrl})`
              : undefined,
          }}
          aria-label={`Open post about ${p.songSnapshot.title}`}
        >
          {!p.songSnapshot.albumArtUrl ? (
            <div className={styles.gridFallback}>
              <Music size={22} aria-hidden />
              <span>{p.songSnapshot.title}</span>
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function LikedGrid({ query }: { query: ReturnType<typeof useUserLikedSongs> }) {
  if (query.isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading liked songs…
      </div>
    );
  }
  if (query.error) {
    return (
      <ErrorBox
        variant="inline"
        message="Couldn't load liked songs."
        onRetry={() => query.refetch()}
      />
    );
  }
  const songs = query.data?.likedSongs ?? [];
  if (!songs.length) {
    return (
      <EmptyState
        icon={<Heart size={36} aria-hidden />}
        title="No liked songs yet"
        description="Tap the heart on any song to save it here."
      />
    );
  }
  return (
    <ul className={styles.likedList}>
      {songs.map((song: MusicTrack) => (
        <li key={song.id} className={styles.likedRow}>
          <Avatar
            src={song.albumArtUrl || null}
            name={song.title}
            seed={song.id}
            size={44}
          />
          <div className={styles.likedMeta}>
            <span className={styles.likedTitle}>{song.title}</span>
            <span className={styles.likedArtist}>{song.artist}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
