import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music } from "lucide-react";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import { signupWithGoogle } from "../lib/auth";
import {
  attachGoogleSignIn,
  isGoogleSignInConfigured,
} from "../lib/oauth/google";
import type { AuthSignupResponse, UserType } from "../types/api";
import authStyles from "./_authShared.module.css";
import styles from "./signup.module.css";

interface FormState {
  fullname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: UserType;
  artistName: string;
  genres: string[];
  label: string;
  website: string;
  bio: string;
}

const INITIAL_FORM: FormState = {
  fullname: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  userType: "user",
  artistName: "",
  genres: [],
  label: "",
  website: "",
  bio: "",
};

const GENRE_OPTIONS = [
  "Pop",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Rock",
  "Indie",
  "Country",
  "Jazz",
  "Classical",
  "Lofi",
  "Latin",
  "K-Pop",
];

const MAX_GENRES = 5;

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

// --- Pure validators ------------------------------------------------------
// Defined outside the component so they are stable references, which keeps
// the Google `useEffect` dependency array clean (the GIS callback closure
// shouldn't churn on every keystroke).

function validateArtistFields(state: FormState): string | null {
  if (state.userType !== "artist") return null;
  if (state.artistName.trim().length < 2)
    return "Artist name must be at least 2 characters long";
  if (state.genres.length === 0)
    return "Pick at least one genre for your bubble";
  if (state.website.trim() && !/^https?:\/\//i.test(state.website.trim()))
    return "Website must start with http:// or https://";
  return null;
}

function validateUsername(state: FormState): string | null {
  if (state.username.trim().length < 3)
    return "Username must be at least 3 characters long";
  if (!/^[a-zA-Z0-9_]+$/.test(state.username))
    return "Username can only contain letters, numbers, and underscores";
  return null;
}

/**
 * Validation for the Google sign-up button. Skips fullname / email /
 * password (Google supplies those); still requires username and the
 * artist fields when the role toggle is set to artist.
 */
function validateForGoogle(state: FormState): string | null {
  const usernameError = validateUsername(state);
  if (usernameError) return usernameError;
  return validateArtistFields(state);
}

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleSlotRef = useRef<HTMLDivElement | null>(null);
  // GIS calls its callback with whatever closure was in place when the
  // button was rendered. We mirror the form into a ref so the callback
  // always reads the *latest* values (role, artist fields, username)
  // without re-rendering the Google button on every keystroke.
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const googleEnabled = isGoogleSignInConfigured();

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);
  const confirmMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const isArtist = form.userType === "artist";

  const onField =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setUserType = (userType: UserType) => {
    setForm((prev) => {
      if (prev.userType === userType) return prev;
      return userType === "artist"
        ? {
            ...prev,
            userType,
            // Default artistName to fullname so artists who use the same
            // stage name don't have to re-type it.
            artistName: prev.artistName || prev.fullname,
          }
        : {
            ...prev,
            userType,
            // Clear artist-only fields when switching back to listener
            // so a stray value can't leak into the request body.
            artistName: "",
            genres: [],
            label: "",
            website: "",
            bio: "",
          };
    });
  };

  const toggleGenre = (genre: string) => {
    setForm((prev) => {
      const has = prev.genres.includes(genre);
      if (has) return { ...prev, genres: prev.genres.filter((g) => g !== genre) };
      if (prev.genres.length >= MAX_GENRES) return prev;
      return { ...prev, genres: [...prev.genres, genre] };
    });
  };

  function validate(): string | null {
    if (form.fullname.trim().length < 2)
      return "Full name must be at least 2 characters long";
    const usernameError = validateUsername(form);
    if (usernameError) return usernameError;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address";
    if (form.password.length < 8)
      return "Password must be at least 8 characters long";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match";
    return validateArtistFields(form);
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
      const baseBody = {
        fullname: form.fullname.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        userType: form.userType,
      };
      const body = isArtist
        ? {
            ...baseBody,
            artistProfile: {
              artistName: form.artistName.trim(),
              genres: form.genres,
              // Only send the optional fields if the user filled them in
              // — omit-vs-null lets the backend Zod schema treat them as
              // truly optional.
              ...(form.label.trim() ? { label: form.label.trim() } : {}),
              ...(form.website.trim() ? { website: form.website.trim() } : {}),
              ...(form.bio.trim() ? { bio: form.bio.trim() } : {}),
            },
          }
        : baseBody;

      const res = await api.post<AuthSignupResponse>(
        "/api/users/signup",
        body,
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

  /**
   * Fire after GIS gives us an ID token. Validates the bits of the form
   * we still need from the user (username + artist fields), POSTs to
   * `/api/users/google/signup` with the current role + artist data, and
   * lands them straight on `/preference` because Google has already
   * verified the email — no OTP step.
   *
   * If the user clicked the Google button while the form was invalid,
   * we discard the ID token and surface an inline error. They can fix
   * the form and click Google again to get a fresh token.
   */
  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      const snapshot = formRef.current;
      const validation = validateForGoogle(snapshot);
      if (validation) {
        setError(validation);
        return;
      }
      setError(null);
      setGoogleLoading(true);
      try {
        const artistIsArtist = snapshot.userType === "artist";
        const res = await signupWithGoogle({
          idToken,
          username: snapshot.username.trim(),
          userType: snapshot.userType,
          ...(artistIsArtist
            ? {
                artistProfile: {
                  artistName: snapshot.artistName.trim(),
                  genres: snapshot.genres,
                  ...(snapshot.label.trim()
                    ? { label: snapshot.label.trim() }
                    : {}),
                  ...(snapshot.website.trim()
                    ? { website: snapshot.website.trim() }
                    : {}),
                  ...(snapshot.bio.trim() ? { bio: snapshot.bio.trim() } : {}),
                },
              }
            : {}),
        });
        await login(res.token, res.user);
        // Skip /verification — Google's email_verified claim is our
        // proof of ownership and the backend already set isVerified:true.
        navigate("/preference", { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.code === "USERNAME_TAKEN") {
          setError(
            "That username is already taken. Pick a different one and try again."
          );
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Google sign-up failed. Please try again."
          );
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [login, navigate]
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
          console.warn("Google sign-up unavailable:", err.message);
        }
      },
      text: "signup_with",
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

  const formDisabled = loading || googleLoading;

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
            <span className={authStyles.label}>I want to join Cozie as a…</span>
            <div className={styles.roleSegment} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={!isArtist}
                onClick={() => setUserType("user")}
                disabled={formDisabled}
                className={`${styles.roleOption} ${
                  !isArtist ? styles.roleOptionActive : ""
                }`}
              >
                <span>Listener</span>
                <span className={styles.roleSubtitle}>
                  Discover & share music
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isArtist}
                onClick={() => setUserType("artist")}
                disabled={formDisabled}
                className={`${styles.roleOption} ${
                  isArtist ? styles.roleOptionActive : ""
                }`}
              >
                <span>Artist</span>
                <span className={styles.roleSubtitle}>
                  Release & build a bubble
                </span>
              </button>
            </div>
            <p className={styles.roleNote}>
              This choice is permanent — you can't switch later.
            </p>
          </div>

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
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
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
              disabled={formDisabled}
              aria-invalid={confirmMismatch || undefined}
              aria-describedby={confirmMismatch ? "signup-confirm-help" : undefined}
            />
            {confirmMismatch ? (
              <div id="signup-confirm-help" className={styles.confirmHelp}>
                Passwords don't match
              </div>
            ) : null}
          </div>

          {isArtist ? (
            <section
              className={styles.artistSection}
              aria-labelledby="signup-artist-section-title"
            >
              <header className={styles.artistSectionHeader}>
                <span
                  id="signup-artist-section-title"
                  className={styles.artistSectionTitle}
                >
                  Artist profile
                </span>
                <span className={styles.artistSectionSubtitle}>
                  We'll create your bubble using these details.
                </span>
              </header>

              <div className={authStyles.field}>
                <label htmlFor="signup-artistname" className={authStyles.label}>
                  Artist name
                </label>
                <input
                  id="signup-artistname"
                  type="text"
                  className={authStyles.input}
                  value={form.artistName}
                  onChange={onField("artistName")}
                  required
                  minLength={2}
                  maxLength={60}
                  disabled={formDisabled}
                />
              </div>

              <div className={authStyles.field}>
                <span className={authStyles.label}>
                  Genres ({form.genres.length}/{MAX_GENRES})
                </span>
                <div className={styles.genreGrid}>
                  {GENRE_OPTIONS.map((genre) => {
                    const active = form.genres.includes(genre);
                    const disabled =
                      formDisabled ||
                      (!active && form.genres.length >= MAX_GENRES);
                    return (
                      <button
                        type="button"
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        disabled={disabled}
                        aria-pressed={active}
                        className={`${styles.genreChip} ${
                          active ? styles.genreChipActive : ""
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
                <span className={styles.genreHelper}>
                  Pick 1–{MAX_GENRES} genres that best describe your sound.
                </span>
              </div>

              <div className={authStyles.field}>
                <label htmlFor="signup-label" className={authStyles.label}>
                  Label <span className={styles.genreHelper}>(optional)</span>
                </label>
                <input
                  id="signup-label"
                  type="text"
                  className={authStyles.input}
                  value={form.label}
                  onChange={onField("label")}
                  maxLength={60}
                  disabled={formDisabled}
                />
              </div>

              <div className={authStyles.field}>
                <label htmlFor="signup-website" className={authStyles.label}>
                  Website <span className={styles.genreHelper}>(optional)</span>
                </label>
                <input
                  id="signup-website"
                  type="url"
                  className={authStyles.input}
                  placeholder="https://"
                  value={form.website}
                  onChange={onField("website")}
                  disabled={formDisabled}
                />
              </div>

              <div className={authStyles.field}>
                <label htmlFor="signup-bio" className={authStyles.label}>
                  Bio <span className={styles.genreHelper}>(optional)</span>
                </label>
                <textarea
                  id="signup-bio"
                  className={`${authStyles.input} ${styles.textareaLike}`}
                  value={form.bio}
                  onChange={onField("bio")}
                  maxLength={500}
                  rows={3}
                  disabled={formDisabled}
                />
              </div>
            </section>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={formDisabled}
          >
            {loading
              ? "Creating account…"
              : isArtist
                ? "Create artist account"
                : "Create account"}
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
              aria-label={
                isArtist ? "Sign up as artist with Google" : "Sign up with Google"
              }
            />
            <p className={authStyles.oauthHint}>
              {isArtist
                ? "Fill in your username and artist details first, then click the Google button to finish."
                : "Pick a username, then click the Google button to skip the verification step."}
            </p>
          </>
        ) : null}

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
