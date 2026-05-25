import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, Check, Heart, MessageCircle, Music, UserPlus } from "lucide-react";
import {
  useNotifications,
  useMarkNotificationsRead,
  useDismissNotification,
} from "../hooks/useNotifications";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorBox } from "../components/ui/ErrorBox";
import { Spinner } from "../components/ui/Spinner";
import { ApiError } from "../lib/api";
import type { AppNotification } from "../types/api";
import styles from "./Notifications.module.css";

function describe(n: AppNotification): string {
  switch (n.type) {
    case "follow":
      return "started following you";
    case "post_like":
      return n.snapshot?.songTitle
        ? `liked your post about “${n.snapshot.songTitle}”`
        : "liked your post";
    case "post_comment":
      return n.snapshot?.commentText
        ? `commented: “${n.snapshot.commentText}”`
        : "commented on your post";
    case "song_like":
      return n.snapshot?.songTitle
        ? `liked your song “${n.snapshot.songTitle}”`
        : "liked your song";
    default:
      return "interacted with you";
  }
}

function iconFor(type: AppNotification["type"]) {
  switch (type) {
    case "follow":
      return <UserPlus size={14} aria-hidden />;
    case "post_like":
    case "song_like":
      return <Heart size={14} aria-hidden />;
    case "post_comment":
      return <MessageCircle size={14} aria-hidden />;
    default:
      return <Music size={14} aria-hidden />;
  }
}

function destination(n: AppNotification): string | null {
  switch (n.targetType) {
    case "user":
      return `/profile/${n.targetId}`;
    case "post":
      // No single-post route today; jump to home-feed.
      return "/home-feed";
    case "song":
      return `/play-music`;
    default:
      return null;
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  const dismiss = useDismissNotification();

  const notifications = useMemo(
    () => list.data?.notifications ?? [],
    [list.data?.notifications]
  );
  const hasUnread = useMemo(
    () => notifications.some((n) => !n.read),
    [notifications]
  );

  const errorMessage =
    list.error instanceof ApiError ? list.error.message : null;

  return (
    <PageLayout
      title="Notifications"
      showBack
      navKey="home"
      headerRight={
        hasUnread ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markRead.mutate({ markAll: true })}
            loading={markRead.isPending}
            leftIcon={<Check size={14} aria-hidden />}
          >
            Mark all read
          </Button>
        ) : undefined
      }
    >
      {list.isPending ? (
        <div className={styles.loading}>
          <Spinner /> Loading…
        </div>
      ) : errorMessage ? (
        <ErrorBox
          variant="page"
          title="Could not load notifications"
          message={errorMessage}
          onRetry={() => list.refetch()}
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff size={36} aria-hidden />}
          title="You're all caught up"
          description="When someone follows you, likes your music, or comments on your posts, you'll see it here."
        />
      ) : (
        <ul className={styles.list} aria-label="Notifications">
          {notifications.map((n) => {
            const dest = destination(n);
            return (
              <li
                key={n.id}
                className={`${styles.row} ${!n.read ? styles.unread : ""}`}
              >
                <button
                  type="button"
                  className={styles.main}
                  onClick={() => {
                    if (!n.read) markRead.mutate({ ids: [n.id] });
                    if (dest) navigate(dest);
                  }}
                >
                  <span className={styles.avatarWrap}>
                    <Avatar
                      src={n.actorAvatarUrl}
                      name={n.actorName}
                      seed={n.actorId}
                      size={44}
                    />
                    <span className={styles.typeBadge} aria-hidden>
                      {iconFor(n.type)}
                    </span>
                  </span>
                  <span className={styles.text}>
                    <span className={styles.actor}>{n.actorName}</span>{" "}
                    {describe(n)}
                  </span>
                  <span className={styles.time}>{timeAgo(n.createdAt)}</span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismiss.mutate(n.id)}
                  aria-label={`Dismiss notification from ${n.actorName}`}
                >
                  ✕
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}
