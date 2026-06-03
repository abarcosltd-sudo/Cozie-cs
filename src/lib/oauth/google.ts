/**
 * Google Identity Services (GIS) helper.
 *
 * This module is the *only* place we touch the GIS SDK. Every consumer
 * (login page, signup page) talks to the exported `attachGoogleSignIn`
 * function, which is provider-agnostic in shape: caller passes a
 * container element + a `onIdToken(idToken: string)` callback and gets
 * back a cleanup function. Swapping to Firebase Auth later means
 * replacing this file's body with `signInWithPopup` and a custom button
 * — the consuming pages don't change.
 *
 * We use Google's `renderButton` API rather than the One Tap `prompt()`
 * flow because:
 *   1. It always renders a clickable button in our form (no surprise
 *      banner / dismissal behavior).
 *   2. It works the same on first paint, after dismissal, and across
 *      browsers that suppress FedCM.
 *   3. The visual styling stays consistent with Google's brand
 *      guidelines, which simplifies our spec-compliance story.
 *
 * The Google button does its own layout — we just give it a container.
 */

let scriptPromise: Promise<void> | null = null;

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";

function loadGisScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("Google sign-in is only available in the browser"));
      return;
    }
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Sign-In")),
        { once: true }
      );
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Sign-In"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function readClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  return id && id.trim() ? id.trim() : null;
}

/**
 * Whether the build was given a Google client id. The pages use this to
 * decide whether to render the Google sign-in section at all — when the
 * env var isn't set (e.g. local dev without Google credentials) we just
 * hide the button instead of showing a broken one.
 */
export function isGoogleSignInConfigured(): boolean {
  return readClientId() !== null;
}

export type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";

export interface AttachGoogleSignInOptions {
  /** Called with the Google ID token after a successful sign-in click. */
  onIdToken: (idToken: string) => void;
  /** Fired when GIS fails to load or returns no credential. */
  onError?: (err: Error) => void;
  /** Maps to GIS button `text`. Defaults to "continue_with". */
  text?: GoogleButtonText;
  /**
   * Pixel width for the Google button. GIS clamps this to [200, 400].
   * Defaults to 320 so the button fits typical mobile-first forms.
   */
  width?: number;
}

/**
 * Render a Google "Sign in with Google" button into `container` and wire
 * its click callback to `onIdToken`. Returns a teardown function that
 * cancels any in-flight GIS state and clears the container.
 *
 * Throws synchronously if `VITE_GOOGLE_CLIENT_ID` is not configured. UI
 * code should call `isGoogleSignInConfigured()` first and skip rendering
 * the Google block when it returns false.
 */
export async function attachGoogleSignIn(
  container: HTMLElement,
  opts: AttachGoogleSignInOptions
): Promise<() => void> {
  const clientId = readClientId();
  if (!clientId) {
    const err = new Error("Google sign-in is not configured");
    opts.onError?.(err);
    throw err;
  }

  try {
    await loadGisScript();
  } catch (err) {
    opts.onError?.(err as Error);
    throw err;
  }

  const idApi = window.google?.accounts?.id;
  if (!idApi) {
    const err = new Error("Google Identity Services not available");
    opts.onError?.(err);
    throw err;
  }

  // Note: GIS keeps a single module-scoped client; re-initialize is fine
  // and is what they recommend when the callback identity changes (e.g.
  // unmounting login.tsx and mounting signup.tsx).
  idApi.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) {
        opts.onIdToken(response.credential);
      } else {
        opts.onError?.(new Error("Google sign-in did not return a token"));
      }
    },
    auto_select: false,
    use_fedcm_for_prompt: true,
    ux_mode: "popup",
    itp_support: true,
  });

  container.innerHTML = "";
  idApi.renderButton(container, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: opts.text || "continue_with",
    shape: "pill",
    logo_alignment: "left",
    width: Math.max(200, Math.min(400, opts.width ?? 320)),
  });

  return () => {
    try {
      idApi.cancel();
    } catch {
      /* GIS sometimes throws if no prompt is active; safe to ignore. */
    }
    container.innerHTML = "";
  };
}

// --- Ambient typings -------------------------------------------------------
// Minimal GIS surface — just enough for `attachGoogleSignIn`. Keeping this
// here (rather than installing @types/google.accounts) avoids adding a
// dependency for one consumer.

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential?: string; select_by?: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
            ux_mode?: "popup" | "redirect";
            itp_support?: boolean;
          }) => void;
          renderButton: (
            container: HTMLElement,
            options: {
              type: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "small" | "medium" | "large";
              text?: GoogleButtonText;
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
            }
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export {};
