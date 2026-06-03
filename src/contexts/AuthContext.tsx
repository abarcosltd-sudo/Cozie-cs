import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  getAuthToken,
  setAuthToken,
  setOnUnauthorized,
} from "../lib/api";
import type { User } from "../types/api";

interface AuthState {
  /** `true` while we're still figuring out whether the user is logged in. */
  bootstrapping: boolean;
  token: string | null;
  user: User | null;
  /** Convenience: token && user. Re-check on every render is fine. */
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  /**
   * Persist a token returned by login/verify-otp/google-auth and load /me.
   * The hint user is whatever subset of `User` the calling endpoint
   * returns (login/verify-otp/google-auth each return a slightly
   * different projection). `loadMe()` runs immediately after and is the
   * source of truth — the hint is purely to avoid a flash of unloaded
   * state on first paint.
   */
  login: (
    token: string,
    hintUser?: Partial<User> | null
  ) => Promise<void>;
  /** Clear local auth state. Optionally redirect (defaults to /login). */
  logout: (opts?: { redirect?: string | false }) => void;
  /** Force a /me refetch (e.g. after editing the profile). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Single source of truth for "is the user logged in, and who are they".
 *
 *  - On mount, hydrates from localStorage and (best-effort) fetches /me.
 *  - Registers a 401 handler with api.ts so any expired-token response
 *    centrally bounces the user to /login.
 *  - Cross-tab sync via the `storage` event so logging out on tab A logs
 *    out tab B.
 *
 * If we move to httpOnly cookies later, only this file (and api.ts's
 * `setAuthToken`) need to change.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const loadingMeRef = useRef<Promise<void> | null>(null);

  const loadMe = useCallback(async () => {
    if (loadingMeRef.current) return loadingMeRef.current;
    const p = (async () => {
      try {
        const { user: me } = await api.get<{ user: User }>("/api/users/me");
        setUser(me);
      } catch (err) {
        // 401 is handled by the global hook; for anything else just log.
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error("Failed to load /me", err);
        }
        setUser(null);
      }
    })();
    loadingMeRef.current = p;
    try {
      await p;
    } finally {
      loadingMeRef.current = null;
    }
  }, []);

  const logout = useCallback<AuthContextValue["logout"]>(
    (opts) => {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem("user");
      } catch {
        /* non-fatal */
      }
      const redirect = opts?.redirect ?? "/login";
      if (redirect) navigate(redirect, { replace: true });
    },
    [navigate]
  );

  const login = useCallback<AuthContextValue["login"]>(
    async (nextToken, hintUser) => {
      setAuthToken(nextToken);
      setToken(nextToken);
      // Hint may be a partial (Google/login return different subsets).
      // `loadMe()` immediately re-fetches `/me` so this is just a hand-off
      // to suppress a flash of "loading" between login and the /me reply.
      if (hintUser) setUser(hintUser as User);
      await loadMe();
    },
    [loadMe]
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    await loadMe();
  }, [loadMe, token]);

  // Register the centralized 401 handler with api.ts. When any request comes
  // back 401 we clear local state and bounce to /login.
  useEffect(() => {
    setOnUnauthorized(() => {
      logout({ redirect: "/login" });
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  // Hydrate on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (token) await loadMe();
      if (!cancelled) setBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab sync. If another tab writes/removes the token, mirror it here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "token") return;
      const next = e.newValue;
      if (next === token) return;
      if (next) {
        setAuthToken(next);
        setToken(next);
        loadMe();
      } else {
        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadMe, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapping,
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshUser,
    }),
    [bootstrapping, token, user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
