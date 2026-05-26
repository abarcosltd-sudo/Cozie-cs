import { useParams } from "react-router-dom";
import { useFollowers } from "../hooks/useFollow";
import { useAuth } from "../contexts/AuthContext";
import { PageLayout } from "../components/layout/PageLayout";
import { UserList } from "../components/users/UserList";

export default function Followers() {
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const userId = paramUserId || user?.id;

  const query = useFollowers(userId);
  const users = query.data?.followers ?? [];

  return (
    <PageLayout title="Followers" showBack>
      <UserList
        users={users}
        isPending={query.isPending}
        error={(query.error as Error) || null}
        onRetry={() => query.refetch()}
        emptyTitle="No followers yet"
        emptyDescription="Share something fresh and friends will follow you back."
      />
    </PageLayout>
  );
}
