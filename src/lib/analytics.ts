/**
 * Lightweight analytics surface.
 *
 * No analytics SDK is integrated yet. This module exists so feature code
 * can emit semantic events today; whenever PostHog / Mixpanel / Datadog
 * RUM is wired in, we register a handler in one place and every existing
 * `track()` call lights up — no feature-side rewrites.
 *
 * Behaviour today:
 *   1. If a handler has been registered via `setAnalyticsHandler`, call it.
 *   2. If `window.posthog?.capture` exists (e.g. PostHog snippet loaded
 *      from index.html), forward there too.
 *   3. In dev builds, mirror to `console.debug` so we can see traffic.
 *
 * Events are intentionally additive — we never throw, never block, never
 * await. Analytics failures must not break product flows.
 */

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsPayload = Record<string, AnalyticsValue>;
export type AnalyticsHandler = (event: string, payload: AnalyticsPayload) => void;

let handler: AnalyticsHandler | null = null;

/** Wire a real analytics sink. Idempotent — last registration wins. */
export function setAnalyticsHandler(fn: AnalyticsHandler | null): void {
  handler = fn;
}

interface WindowWithPosthog extends Window {
  posthog?: {
    capture?: (event: string, payload: AnalyticsPayload) => void;
  };
}

export function track(event: string, payload: AnalyticsPayload = {}): void {
  if (handler) {
    try {
      handler(event, payload);
    } catch (err) {
      console.warn("[analytics] handler threw", err);
    }
  }

  if (typeof window !== "undefined") {
    const w = window as WindowWithPosthog;
    if (typeof w.posthog?.capture === "function") {
      try {
        w.posthog.capture(event, payload);
      } catch (err) {
        console.warn("[analytics] posthog.capture threw", err);
      }
    }
  }

  if (import.meta.env.DEV) {
    console.debug("[analytics]", event, payload);
  }
}
