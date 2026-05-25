import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FullPageSpinner } from "../ui/Spinner";

/**
 * Gates a route behind auth. While the AuthProvider is still hydrating (token
 * from localStorage → /me round-trip) we show a spinner instead of flashing
 * to /login, which would log out a perfectly-valid user on every refresh.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, bootstrapping, token } = useAuth();
  const location = useLocation();

  if (bootstrapping) return <FullPageSpinner label="Loading…" />;

  if (!isAuthenticated) {
    // Stash where the user was heading so we can bounce them back post-login.
    const search = new URLSearchParams({ next: location.pathname + location.search });
    const target = token
      ? `/login?${search.toString()}&reason=expired`
      : `/login?${search.toString()}`;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
