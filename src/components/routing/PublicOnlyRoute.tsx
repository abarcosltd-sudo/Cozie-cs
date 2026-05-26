import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FullPageSpinner } from "../ui/Spinner";

/**
 * For routes that should only render when *not* logged in (login, signup,
 * splash). If the user is already authenticated, send them to /home-feed.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  if (bootstrapping) return <FullPageSpinner label="Loading…" />;
  if (isAuthenticated) return <Navigate to="/home-feed" replace />;
  return <>{children}</>;
}
