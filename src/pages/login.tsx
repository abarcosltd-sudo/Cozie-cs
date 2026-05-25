import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import type { AuthLoginResponse } from "../types/api";
import authStyles from "./_authShared.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const reason = params.get("reason");
  const next = params.get("next") || "/home-feed";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
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
              disabled={loading}
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
              disabled={loading}
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
