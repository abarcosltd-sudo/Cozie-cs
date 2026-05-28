/**
 * Global state for the persistent upload toast.
 *
 * One upload at a time — if the user tries to start a second while one is
 * in flight, `start()` returns `false` and the compose page surfaces a
 * friendly error. This keeps the model simple and matches the spec's "single
 * upload state machine".
 *
 * Lifecycle:
 *   queued → uploading → processing → ready | errored
 *
 * "Queued" exists primarily for the brief gap between `start()` (we've got a
 * file but haven't called the backend yet) and the XHR actually firing.
 *
 * The XHR continues even if the user navigates away from the compose page;
 * the toast lives in `App.tsx` so it persists across route changes.
 *
 * Why a context instead of TanStack Query state: this isn't a server cache —
 * it's per-tab in-progress work that doesn't have a backend representation
 * (the backend just sees PUT bytes, then a webhook). Mixing it into the
 * query cache muddies the abstraction.
 */
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
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import {
  putVideoWithProgress,
  UploadError,
} from "../lib/upload";
import { REEL_KEYS } from "../hooks/useReels";
import type { Reel, SingleReelResponse } from "../types/api";

export type UploadPhase =
  | "idle"
  | "queued"
  | "uploading"
  | "processing"
  | "ready"
  | "errored";

export interface UploadStateBase {
  reelId: string;
  fileName: string;
  /** Local thumbnail / preview URL (object URL of the file) for the toast. */
  previewUrl?: string;
}

export interface UploadState extends UploadStateBase {
  phase: UploadPhase;
  /** 0..1, or null when the byte total is unknown. */
  progress: number | null;
  errorMessage?: string;
}

interface StartArgs {
  reelId: string;
  uploadUrl: string;
  file: File;
}

interface UploadContextValue {
  /** Current upload, or null when idle. */
  current: UploadState | null;
  /**
   * Start a new upload. Returns `false` if another upload is already in
   * flight; the caller should surface an error to the user.
   */
  start: (args: StartArgs) => boolean;
  /** Cancel the current upload. No-op when idle. */
  cancel: () => void;
  /** Dismiss the toast — only valid when `phase === "ready" | "errored"`. */
  dismiss: () => void;
}

const UploadCtx = createContext<UploadContextValue | null>(null);

const PROCESSING_POLL_MS = 5_000;
const PROCESSING_POLL_BACKOFF_MS = 30_000;
const POLL_BACKOFF_AFTER_MS = 60_000;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<UploadState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // True from `start()` until the upload reaches a terminal state
  // (ready / errored / cancelled). Tracked in a ref so the guard in
  // `start()` doesn't read a stale `current` from a memoized closure.
  const inFlightRef = useRef(false);
  const qc = useQueryClient();

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearPolling();
    abortRef.current = null;
    inFlightRef.current = false;
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        /* noop */
      }
      previewUrlRef.current = null;
    }
  }, [clearPolling]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    cleanup();
    setCurrent(null);
  }, [cleanup]);

  const dismiss = useCallback(() => {
    setCurrent((c) => {
      if (!c) return null;
      if (c.phase === "ready" || c.phase === "errored") {
        cleanup();
        return null;
      }
      return c;
    });
  }, [cleanup]);

  // Polling helper. Wrapped in useCallback so `start()` can list it as a
  // proper dep (and so the linter is happy without disables).
  //
  // Self-healing: every Nth tick we also POST to /reconcile, which forces
  // the backend to query Mux directly and patch the doc. This is the
  // backstop for the case where Mux's `video.upload.asset_created` /
  // `video.asset.ready` webhooks never deliver — the toast would
  // otherwise sit on "Processing" forever even though the asset is fine.
  // We do it on ticks 3, 6, and 10 only — the server-side rate limit
  // would catch us anyway, but being polite here costs nothing.
  const startPolling = useCallback(
    (reelId: string, base: UploadStateBase, sinceMs: number) => {
      clearPolling();
      let tickN = 0;
      let reconcileInFlight = false;
      const maybeReconcile = (currentReelId: string) => {
        if (tickN !== 3 && tickN !== 6 && tickN !== 10) return;
        if (reconcileInFlight) return;
        reconcileInFlight = true;
        api
          .post<SingleReelResponse>(`/api/reels/${currentReelId}/reconcile`)
          .then((resp) => {
            qc.setQueryData<SingleReelResponse>(
              REEL_KEYS.single(currentReelId),
              resp
            );
          })
          .catch(() => {
            /* best-effort — poll loop continues */
          })
          .finally(() => {
            reconcileInFlight = false;
          });
      };

      const tick = async () => {
        tickN += 1;
        try {
          const resp = await api.get<SingleReelResponse>(
            `/api/reels/${reelId}`
          );
          const reel: Reel = resp.reel;
          // Hand the latest reel back to TanStack Query so subscribed views
          // (Reels feed, profile grid) flip to "ready" naturally.
          qc.setQueryData<SingleReelResponse>(REEL_KEYS.single(reelId), resp);

          if (reel.status === "ready") {
            inFlightRef.current = false;
            setCurrent({ ...base, phase: "ready", progress: 1 });
            clearPolling();
            // Bust the feeds so the new reel shows up.
            qc.invalidateQueries({ queryKey: REEL_KEYS.discover });
            qc.invalidateQueries({ queryKey: REEL_KEYS.following });
            qc.invalidateQueries({
              queryKey: ["reels", "user", reel.userId],
            });
            return;
          }
          if (reel.status === "errored") {
            inFlightRef.current = false;
            setCurrent({
              ...base,
              phase: "errored",
              progress: 1,
              errorMessage:
                reel.errorMessage || "We couldn't process this video.",
            });
            clearPolling();
            return;
          }
          // Still pending or processing — try a server-side reconcile on
          // the schedule above. Fire-and-forget; the next tick will pick
          // up whatever state Mux returned.
          maybeReconcile(reelId);
        } catch (err) {
          // Transient network error — keep polling. Only bail if the reel
          // doc is genuinely gone (404).
          if (err instanceof ApiError && err.status === 404) {
            inFlightRef.current = false;
            setCurrent({
              ...base,
              phase: "errored",
              progress: 1,
              errorMessage: "Reel record disappeared. Please try again.",
            });
            clearPolling();
            return;
          }
          // Surface unknown transient errors at debug volume; never silently
          // swallowed. The poll loop continues so we'll recover when the
          // network is back.
          console.warn("[UploadContext] poll tick failed; will retry", err);
        }

        const elapsed = Date.now() - sinceMs;
        const next =
          elapsed > POLL_BACKOFF_AFTER_MS
            ? PROCESSING_POLL_BACKOFF_MS
            : PROCESSING_POLL_MS;
        pollTimerRef.current = window.setTimeout(tick, next);
      };
      pollTimerRef.current = window.setTimeout(tick, PROCESSING_POLL_MS);
    },
    [clearPolling, qc]
  );

  const start = useCallback<UploadContextValue["start"]>(
    ({ reelId, uploadUrl, file }) => {
      // Ref-based guard so the check can't read a stale React closure.
      if (inFlightRef.current) {
        return false;
      }
      // Clean up any leftover state from a prior completed upload. cleanup
      // also resets the in-flight flag, so we must mark in-flight AFTER.
      cleanup();
      inFlightRef.current = true;

      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      const controller = new AbortController();
      abortRef.current = controller;

      const base: UploadStateBase = {
        reelId,
        fileName: file.name,
        previewUrl,
      };

      setCurrent({
        ...base,
        phase: "uploading",
        progress: 0,
      });

      void (async () => {
        try {
          await putVideoWithProgress(uploadUrl, file, {
            signal: controller.signal,
            onProgress: ({ ratio }) => {
              setCurrent((c) =>
                c && c.reelId === reelId && c.phase === "uploading"
                  ? { ...c, progress: ratio }
                  : c
              );
            },
          });

          // PUT succeeded — Mux now does ingest + transcode. Move to
          // "processing" and start polling the backend.
          setCurrent((c) =>
            c && c.reelId === reelId
              ? { ...c, phase: "processing", progress: 1 }
              : c
          );
          startPolling(reelId, base, Date.now());
        } catch (err) {
          if (err instanceof UploadError && err.aborted) {
            // Cancelled by the user; state was already cleared by `cancel()`.
            return;
          }
          inFlightRef.current = false;
          const message =
            err instanceof UploadError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Upload failed";
          setCurrent((c) =>
            c && c.reelId === reelId
              ? { ...c, phase: "errored", errorMessage: message }
              : c
          );
        }
      })();

      return true;
    },
    [cleanup, startPolling]
  );

  // Cleanup on unmount (HMR, logout-driven remount). Also abort any
  // in-flight upload so we don't keep pushing bytes to Mux for a
  // never-to-be-rendered session.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      cleanup();
    },
    [cleanup]
  );

  const value = useMemo<UploadContextValue>(
    () => ({ current, start, cancel, dismiss }),
    [current, start, cancel, dismiss]
  );

  return <UploadCtx.Provider value={value}>{children}</UploadCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadCtx);
  if (!ctx) {
    throw new Error("useUpload must be used inside <UploadProvider>");
  }
  return ctx;
}
