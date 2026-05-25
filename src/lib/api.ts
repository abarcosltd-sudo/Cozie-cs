/**
 * Single HTTP client for every backend call.
 *
 *  - Reads VITE_API_URL from Vite env. Falls back to the legacy hardcoded host
 *    so an unconfigured `.env` doesn't break dev.
 *  - Injects a JWT bearer from a module-scoped cache. AuthContext is the
 *    canonical writer — `setAuthToken(token | null)` syncs both sides.
 *  - Parses the backend's `{ success, data, message }` envelope and throws
 *    `ApiError` on `!res.ok` so callers can `try/catch` once instead of
 *    threading `res.ok` checks through every page.
 *  - Centralizes 401 handling: a one-shot callback wired up by AuthContext
 *    boots the user back to /login (and clears state) when the token expires.
 *
 * This file knows nothing about React on purpose so it can also be used from
 * non-React code (workers, tests, scripts) later.
 */

const DEFAULT_API_URL = "https://cozie-kohl.vercel.app";

const baseUrl: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  DEFAULT_API_URL;

const TOKEN_STORAGE_KEY = "token";

let authToken: string | null = readStoredToken();
let onUnauthorized: (() => void) | null = null;

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage may be unavailable (private mode, SSR). non-fatal. */
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Wired by AuthContext on mount. Single source of truth for "what to do when
 * any request returns 401" — typically clear local state and bounce to /login.
 */
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export interface ApiErrorPayload {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

export class ApiError extends Error implements ApiErrorPayload {
  status: number;
  code?: string;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

interface RequestOptions<TBody = unknown> {
  /** Path beginning with `/api/...`. Don't include the host. */
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  /** Override the default Content-Type: application/json (e.g. for FormData). */
  rawBody?: BodyInit;
  /** Per-call header overrides. */
  headers?: Record<string, string>;
  /** Opt out of the bearer injection (e.g. /api/users/signup). */
  skipAuth?: boolean;
  /** Opt out of the `{success, data}` envelope unwrap. */
  rawResponse?: boolean;
  signal?: AbortSignal;
}

async function request<TResp = unknown, TBody = unknown>(
  opts: RequestOptions<TBody>
): Promise<TResp> {
  const url = `${baseUrl}${opts.path.startsWith("/") ? "" : "/"}${opts.path}`;
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  let body: BodyInit | undefined;
  if (opts.rawBody !== undefined) {
    body = opts.rawBody;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(opts.body);
  }

  if (!opts.skipAuth && authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method || "GET",
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    // Network failure / CORS preflight failure / aborted.
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiError({
      status: 0,
      message: (err as Error)?.message || "Network error",
      code: "network_error",
    });
  }

  if (res.status === 401 && !opts.skipAuth) {
    onUnauthorized?.();
  }

  // Empty responses (e.g. 204) — return undefined typed as TResp.
  if (res.status === 204) return undefined as unknown as TResp;

  let parsed: unknown;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    parsed = await res.json().catch(() => undefined);
  } else {
    const text = await res.text().catch(() => "");
    parsed = text ? { message: text } : undefined;
  }

  if (!res.ok) {
    const payload = (parsed || {}) as Record<string, unknown>;
    throw new ApiError({
      status: res.status,
      message:
        (typeof payload.message === "string" && payload.message) ||
        (typeof payload.error === "string" && (payload.error as string)) ||
        `Request failed with ${res.status}`,
      code:
        typeof payload.code === "string"
          ? (payload.code as string)
          : undefined,
      details: payload.details ?? payload.errors,
    });
  }

  if (opts.rawResponse) return parsed as TResp;

  // Backend convention: { success: true, ...payload } — return everything
  // except `success` so callers can destructure their domain fields directly.
  if (parsed && typeof parsed === "object" && "success" in parsed) {
    const rest: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key !== "success") rest[key] = value;
    }
    return rest as TResp;
  }
  return parsed as TResp;
}

export const api = {
  request,
  get: <TResp>(path: string, opts: Omit<RequestOptions, "path" | "method"> = {}) =>
    request<TResp>({ ...opts, path, method: "GET" }),
  post: <TResp, TBody = unknown>(
    path: string,
    body?: TBody,
    opts: Omit<RequestOptions<TBody>, "path" | "method" | "body"> = {}
  ) => request<TResp, TBody>({ ...opts, path, method: "POST", body }),
  put: <TResp, TBody = unknown>(
    path: string,
    body?: TBody,
    opts: Omit<RequestOptions<TBody>, "path" | "method" | "body"> = {}
  ) => request<TResp, TBody>({ ...opts, path, method: "PUT", body }),
  patch: <TResp, TBody = unknown>(
    path: string,
    body?: TBody,
    opts: Omit<RequestOptions<TBody>, "path" | "method" | "body"> = {}
  ) => request<TResp, TBody>({ ...opts, path, method: "PATCH", body }),
  delete: <TResp>(path: string, opts: Omit<RequestOptions, "path" | "method"> = {}) =>
    request<TResp>({ ...opts, path, method: "DELETE" }),
  /**
   * Direct PUT to an external URL (e.g. Firebase Storage signed URL).
   * Skips the envelope, bearer, and host prefix.
   */
  async putExternal(
    url: string,
    body: BodyInit,
    contentType: string
  ): Promise<void> {
    const res = await fetch(url, {
      method: "PUT",
      body,
      headers: { "Content-Type": contentType },
    });
    if (!res.ok) {
      throw new ApiError({
        status: res.status,
        message: `External upload failed (${res.status})`,
      });
    }
  },
};

export { baseUrl as apiBaseUrl };
