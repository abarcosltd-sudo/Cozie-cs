import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { ErrorBox } from "../ui/ErrorBox";
import { Spinner } from "../ui/Spinner";
import type { PublicProfile } from "../../types/api";
import styles from "./UserList.module.css";

type Row = PublicProfile & { followedAt?: string };

interface UserListProps {
  users: Row[] | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry?: () => void;
  /** Shown when the list is empty. */
  emptyTitle: string;
  emptyDescription?: string;
  /** Optional render slot per row (e.g. follow button). */
  rowAction?: (user: Row) => React.ReactNode;
}

export function UserList({
  users,
  isPending,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  rowAction,
}: UserListProps) {
  if (isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBox
        variant="page"
        title="Could not load users"
        message={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (!users?.length) {
    return (
      <EmptyState
        icon={<Users size={36} aria-hidden />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className={styles.list}>
      {users.map((user) => (
        <li key={user.id} className={styles.row}>
          <Link
            to={`/profile/${user.id}`}
            className={styles.link}
            aria-label={`Open ${user.username || user.fullname}'s profile`}
          >
            <Avatar
              src={user.photoURL}
              name={user.username || user.fullname}
              seed={user.id}
              size={44}
            />
            <span className={styles.meta}>
              <span className={styles.username}>
                {user.username || "user"}
              </span>
              {user.fullname ? (
                <span className={styles.fullname}>{user.fullname}</span>
              ) : null}
            </span>
          </Link>
          {rowAction ? <div className={styles.action}>{rowAction(user)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
