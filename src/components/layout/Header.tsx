import { ChevronLeft, Bell, MessageCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useUnreadNotificationCount } from "../../hooks/useNotifications";
import styles from "./Header.module.css";

interface HeaderProps {
  title?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  /** Slot to the right of the title. Defaults to the notification bell. */
  right?: ReactNode;
  /** Hide the bell entirely (e.g. on the splash/login screens). */
  hideBell?: boolean;
  /** Branding header shown on top-level screens (Home, Discover) — the title slot is replaced with "COZIE". */
  branded?: boolean;
}

export function Header({
  title,
  showBack = false,
  onBack,
  right,
  hideBell = false,
  branded = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleBack}
            aria-label="Go back"
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
        ) : null}
        {branded ? <span className={styles.brand}>COZIE</span> : null}
        {title && !branded ? <h1 className={styles.title}>{title}</h1> : null}
      </div>
      <div className={styles.right}>
        {right}
        {!hideBell ? <MessagesLink /> : null}
        {!hideBell ? <NotificationBell /> : null}
      </div>
    </header>
  );
}

/**
 * Messages got demoted from the bottom nav (the slot is now taken by the
 * Create sheet trigger that lets the user pick between music-share and
 * reels). Surface it as a header icon so it's still one tap from every
 * screen that shows the header.
 */
function MessagesLink() {
  return (
    <Link
      to="/messages"
      className={styles.iconButton}
      aria-label="Messages"
    >
      <MessageCircle size={20} aria-hidden />
    </Link>
  );
}

function NotificationBell() {
  const { data } = useUnreadNotificationCount();
  const count = data?.unreadCount ?? 0;
  return (
    <Link
      to="/notifications"
      className={styles.iconButton}
      aria-label={
        count > 0
          ? `Notifications (${count} unread)`
          : "Notifications (no unread)"
      }
    >
      <Bell size={20} aria-hidden />
      {count > 0 ? (
        <span className={styles.badge} aria-hidden>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
