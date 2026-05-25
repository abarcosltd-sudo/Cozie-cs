import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { api, ApiError } from "../lib/api";
import type { AuthSignupResponse } from "../types/api";
import authStyles from "./_authShared.module.css";
import styles from "./signup.module.css";

interface FormState {
  fullname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_FORM: FormState = {
  fullname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return { score: 1, label: "Weak password" };
  if (score === 3) return { score: 2, label: "Medium password" };
  return { score: 3, label: "Strong password" };
}

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const confirmMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const onField =
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function validate(): string | null {
    if (form.fullname.trim().length < 2)
      return "Full name must be at least 2 characters long";
    if (form.username.trim().length < 3)
      return "Username must be at least 3 characters long";
    if (!/^[a-zA-Z0-9_]+$/.test(form.username))
      return "Username can only contain letters, numbers, and underscores";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address";
    if (form.password.length < 8)
      return "Password must be at least 8 characters long";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match";
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<AuthSignupResponse>(
        "/api/users/signup",
        {
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        },
        { skipAuth: true }
      );
      navigate("/verification", {
        state: { email: form.email.trim(), emailSent: res.emailSent !== false },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Signup failed");
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
          <p className={authStyles.tagline}>Create your account</p>
        </div>

        {error ? <ErrorBox message={error} variant="inline" /> : null}

        <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
          <div className={authStyles.field}>
            <label htmlFor="signup-fullname" className={authStyles.label}>
              Full name
            </label>
            <input
              id="signup-fullname"
              type="text"
              className={authStyles.input}
              value={form.fullname}
              onChange={onField("fullname")}
              required
              minLength={2}
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className={authStyles.field}>
            <label htmlFor="signup-username" className={authStyles.label}>
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              className={authStyles.input}
              value={form.username}
              onChange={onField("username")}
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className={authStyles.field}>
            <label htmlFor="signup-email" className={authStyles.label}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              className={authStyles.input}
              value={form.email}
              onChange={onField("email")}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className={authStyles.field}>
            <label htmlFor="signup-password" className={authStyles.label}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className={authStyles.input}
              value={form.password}
              onChange={onField("password")}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
              aria-describedby="signup-password-strength"
            />
            <div
              id="signup-password-strength"
              className={`${styles.strength} ${styles[`strength${strength.score}`]}`}
              aria-live="polite"
            >
              {strength.label}
            </div>
          </div>

          <div className={authStyles.field}>
            <label htmlFor="signup-confirm" className={authStyles.label}>
              Confirm password
            </label>
            <input
              id="signup-confirm"
              type="password"
              className={`${authStyles.input} ${
                confirmMismatch ? styles.inputError : ""
              }`}
              value={form.confirmPassword}
              onChange={onField("confirmPassword")}
              required
              autoComplete="new-password"
              disabled={loading}
              aria-invalid={confirmMismatch || undefined}
              aria-describedby={confirmMismatch ? "signup-confirm-help" : undefined}
            />
            {confirmMismatch ? (
              <div id="signup-confirm-help" className={styles.confirmHelp}>
                Passwords don't match
              </div>
            ) : null}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className={authStyles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>

        <p className={authStyles.terms}>
          By continuing, you agree to Cozie's <a href="/terms">Terms</a> and{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
