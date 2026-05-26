import { useParams } from "react-router-dom";
import { useFollowing } from "../hooks/useFollow";
import { useAuth } from "../contexts/AuthContext";
import { PageLayout } from "../components/layout/PageLayout";
import { UserList } from "../components/users/UserList";

export default function Following() {
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const userId = paramUserId || user?.id;

  const query = useFollowing(userId);
  const users = query.data?.following ?? [];

  return (
    <PageLayout title="Following" showBack>
      <UserList
        users={users}
        isPending={query.isPending}
        error={(query.error as Error) || null}
        onRetry={() => query.refetch()}
        emptyTitle="Not following anyone yet"
        emptyDescription="Discover artists and friends to start your feed."
      />
    </PageLayout>
  );
}
