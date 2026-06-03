import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import { loginWithGoogle } from "../lib/auth";
import {
  attachGoogleSignIn,
  isGoogleSignInConfigured,
} from "../lib/oauth/google";
import type { AuthLoginResponse } from "../types/api";
import authStyles from "./_authShared.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignup, setNeedsSignup] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const googleSlotRef = useRef<HTMLDivElement | null>(null);
  const googleEnabled = isGoogleSignInConfigured();

  const reason = params.get("reason");
  const next = params.get("next") || "/home-feed";

  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      setError(null);
      setNeedsSignup(false);
      setGoogleLoading(true);
      try {
        const res = await loginWithGoogle({ idToken });
        await login(res.token, res.user);
        navigate(next, { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.code === "ACCOUNT_NOT_FOUND") {
          setNeedsSignup(true);
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Google sign-in failed. Please try again."
          );
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [login, navigate, next]
  );

  useEffect(() => {
    if (!googleEnabled) return;
    const slot = googleSlotRef.current;
    if (!slot) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    attachGoogleSignIn(slot, {
      onIdToken: (idToken) => {
        if (!cancelled) void handleGoogleToken(idToken);
      },
      onError: (err) => {
        if (!cancelled) {
          // GIS load/runtime failures are non-fatal — keep the password
          // form usable and surface a small inline message.
          console.warn("Google sign-in unavailable:", err.message);
        }
      },
      text: "signin_with",
    })
      .then((cleanup) => {
        if (cancelled) cleanup();
        else teardown = cleanup;
      })
      .catch(() => {
        /* already logged in onError */
      });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [googleEnabled, handleGoogleToken]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNeedsSignup(false);
    setLoading(true);
    try {
      const res = await api.post<AuthLoginResponse>(
        "/api/users/login",
        { email: email.trim(), password },
        { skipAuth: true }
      );
      await login(res.token, res.user);
      navigate(next, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formDisabled = loading || googleLoading;

  return (
    <div className={authStyles.page}>
      <div className={authStyles.container}>
        <div className={authStyles.logoSection}>
          <div className={authStyles.logoMark}>
            <Music size={32} aria-hidden />
          </div>
          <h1 className={authStyles.appName}>COZIE</h1>
          <p className={authStyles.tagline}>Welcome back. Sign in to continue.</p>
        </div>

        {reason === "expired" ? (
          <ErrorBox
            message="Your session expired. Please sign in again."
            variant="inline"
          />
        ) : null}

        {error ? <ErrorBox message={error} variant="inline" /> : null}

        {needsSignup ? (
          <ErrorBox
            message="We couldn't find a Cozie account for that Google email. Create one to continue."
            variant="inline"
          />
        ) : null}

        <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
          <div className={authStyles.field}>
            <label htmlFor="login-email" className={authStyles.label}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className={authStyles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={formDisabled}
              placeholder="you@example.com"
            />
          </div>

          <div className={authStyles.field}>
            <label htmlFor="login-password" className={authStyles.label}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className={authStyles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={formDisabled}
              placeholder="••••••••"
            />
          </div>

          <div className={authStyles.helperRow}>
            <span />
            <Link to="/coming-soon" aria-label="Forgot password">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {googleEnabled ? (
          <>
            <div className={authStyles.oauthDivider} role="separator">
              or
            </div>
            <div
              ref={googleSlotRef}
              className={authStyles.oauthSlot}
              aria-busy={googleLoading || undefined}
              aria-label="Sign in with Google"
            />
            {needsSignup ? (
              <p className={authStyles.oauthHint}>
                <Link to="/signup">Create a Cozie account</Link> to use Google
                sign-in.
              </p>
            ) : null}
          </>
        ) : null}

        <div className={authStyles.footer}>
          New to Cozie? <Link to="/signup">Create an account</Link>
        </div>

        <p className={authStyles.terms}>
          By continuing, you agree to Cozie's <a href="/terms">Terms</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
