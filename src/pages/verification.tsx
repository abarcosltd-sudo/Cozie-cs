import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import type { AuthVerifyOtpResponse, AuthSignupResponse } from "../types/api";
import authStyles from "./_authShared.module.css";
import styles from "./verification.module.css";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

interface NavState {
  email?: string;
  emailSent?: boolean;
}

export default function Verification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const navState = (location.state || {}) as NavState;
  const email = navState.email || "";

  const [code, setCode] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(
    navState.emailSent === false
      ? "We couldn't send the verification email automatically. Tap “Resend code” below."
      : null
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Bounce back to /signup if state was lost (deep-link / refresh).
  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  // Focus first input on mount.
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const updateDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    // Auto-submit when the user fills the last cell.
    if (index === CODE_LENGTH - 1 && value && next.every((d) => d !== "")) {
      void verify(next.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      e.preventDefault();
      const next = [...code];
      next[index - 1] = "";
      setCode(next);
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    const next = [...code];
    for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = digits[i];
    }
    setCode(next);
    const firstEmpty = next.findIndex((d) => !d);
    inputsRef.current[firstEmpty === -1 ? CODE_LENGTH - 1 : firstEmpty]?.focus();
    if (next.every((d) => d !== "")) {
      void verify(next.join(""));
    }
  };

  const verify = async (otp: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.post<AuthVerifyOtpResponse>(
        "/api/users/verify-otp",
        { email, otp },
        { skipAuth: true }
      );
      setSuccess("Verified! Setting up your account…");
      await login(res.token, res.user);
      navigate("/preference", { replace: true, state: { email } });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Invalid verification code. Please try again."
      );
      setCode(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.some((d) => !d)) {
      setError("Please enter all 6 digits");
      return;
    }
    void verify(code.join(""));
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setSuccess(null);
    setResending(true);
    try {
      await api.post<AuthSignupResponse>(
        "/api/users/resend-otp",
        { email },
        { skipAuth: true }
      );
      setSuccess("Verification code resent.");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not resend the code. Please try again."
      );
    } finally {
      setResending(false);
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
        </div>

        <div className={styles.intro}>
          <span className={styles.mailIcon} aria-hidden>
            <Mail size={32} />
          </span>
          <h2 className={styles.heading}>Check your email</h2>
          <p className={styles.subtitle}>
            We've sent a 6-digit code to
            <br />
            <strong className={styles.email}>{email}</strong>
          </p>
        </div>

        {success ? (
          <div className={styles.success} role="status" aria-live="polite">
            {success}
          </div>
        ) : null}
        {error ? <ErrorBox message={error} variant="inline" /> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div
            className={styles.codeRow}
            role="group"
            aria-label="Verification code"
          >
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                pattern="[0-9]"
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                className={styles.codeInput}
                aria-label={`Digit ${index + 1}`}
                disabled={loading}
              />
            ))}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? "Verifying…" : "Verify email"}
          </Button>
        </form>

        <div className={styles.resendSection}>
          Didn't receive the code?{" "}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            loading={resending}
          >
            Resend
            {cooldown > 0 ? ` (${cooldown}s)` : ""}
          </Button>
        </div>

        <div className={authStyles.footer}>
          <Link to="/signup">← Back to sign up</Link>
        </div>
      </div>
    </div>
  );
}
