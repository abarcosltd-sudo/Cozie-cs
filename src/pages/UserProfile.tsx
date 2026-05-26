import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart, ListMusic, LogOut, Music, Settings } from "lucide-react";
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
import { ApiError } from "../lib/api";
import type { MusicPost, MusicTrack, User } from "../types/api";
import styles from "./UserProfile.module.css";

type Tab = "posts" | "playlists" | "liked";

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
              <Button
                variant="ghost"
                onClick={() => logout()}
                leftIcon={<LogOut size={14} aria-hidden />}
              >
                Log out
              </Button>
            </>
          ) : (
            <FollowButton userId={profile.id} />
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
