/**
 * All Reels-related TanStack Query hooks.
 *
 * Mirrors the conventions in `useFeed.ts`:
 *   - Centralised `KEYS` object so cache invalidation never typos.
 *   - Optimistic `onMutate` / rollback `onError` for engagement mutations.
 *   - `enabled: isAuthenticated` so logged-out users don't make stray requests.
 *
 * The discover and by-user feeds use `useInfiniteQuery` because the backend
 * exposes cursor pagination. The following feed is a fixed top-N because the
 * fan-out across follows doesn't pair cleanly with a single cursor (same
 * compromise the music-post following feed has lived with — see backend
 * `PROGRESS.md`).
 */
import { useEffect, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type {
  AddReelCommentResponse,
  CreateReelResponse,
  DeleteReelResponse,
  Reel,
  ReelComment,
  ReelCommentsResponse,
  ReelFeedResponse,
  RegisterReelViewResponse,
  ShareReelResponse,
  SingleReelResponse,
  ToggleCommentLikeResponse,
  ToggleReelLikeResponse,
} from "../types/api";

export const REEL_KEYS = {
  all: ["reels"] as const,
  discover: ["reels", "discover"] as const,
  following: ["reels", "following"] as const,
  byUser: (userId: string) => ["reels", "user", userId] as const,
  single: (reelId: string) => ["reels", "single", reelId] as const,
  comments: (reelId: string) => ["reels", reelId, "comments"] as const,
  replies: (reelId: string, commentId: string) =>
    ["reels", reelId, "comments", commentId, "replies"] as const,
};

const DISCOVER_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 30;
const COMMENT_PAGE_SIZE = 20;

// ---- Reads ---------------------------------------------------------------

export function useInfiniteReelsDiscover() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery<
    ReelFeedResponse,
    Error,
    InfiniteData<ReelFeedResponse>,
    typeof REEL_KEYS.discover,
    string | undefined
  >({
    queryKey: REEL_KEYS.discover,
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<ReelFeedResponse>(
        `/api/reels/discover?limit=${DISCOVER_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""),
        { signal }
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isAuthenticated,
  });
}

export function useFollowingReelsFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: REEL_KEYS.following,
    queryFn: () => api.get<ReelFeedResponse>("/api/reels/feed"),
    enabled: isAuthenticated,
  });
}

export function useUserReels(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery<
    ReelFeedResponse,
    Error,
    InfiniteData<ReelFeedResponse>,
    ReturnType<typeof REEL_KEYS.byUser>,
    string | undefined
  >({
    queryKey: REEL_KEYS.byUser(userId ?? "__none__"),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<ReelFeedResponse>(
        `/api/reels/user/${userId}?limit=${USER_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""),
        { signal }
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isAuthenticated && !!userId,
  });
}

/**
 * Single reel. While the reel is still uploading or processing we poll every
 * 5 s so the compose-toast and detail view can transition to `ready` without
 * a manual refetch. Once ready (or errored), polling stops.
 *
 * Self-healing: when the Mux webhook fails to deliver (the canonical reason a
 * reel gets stuck in `pending_upload`/`processing` forever), we auto-fire the
 * reconcile endpoint after the 3rd, 8th, and 15th poll for that reel. Each
 * attempt asks the backend to query Mux directly and patch the doc — once it
 * succeeds, polling sees `ready` and stops. The reconcile call has its own
 * server-side rate limit so this is safe even if we miscount.
 */
export function useReel(reelId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const pollCountRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: REEL_KEYS.single(reelId ?? "__none__"),
    queryFn: () =>
      api.get<SingleReelResponse>(`/api/reels/${reelId}`),
    enabled: isAuthenticated && !!reelId,
    refetchInterval: (q) => {
      const status = (q.state.data as SingleReelResponse | undefined)?.reel
        ?.status;
      if (!status) return false;
      return status === "pending_upload" || status === "processing"
        ? 5_000
        : false;
    },
  });

  // Auto-reconcile trigger. Keyed on `dataUpdatedAt` so we count per
  // successful poll, not per render. On a terminal state we wipe the
  // counter so a subsequent stuck reel starts from zero.
  const reel = query.data?.reel;
  const reelStatus = reel?.status;
  const focusedReelId = reel?.id;
  const dataUpdatedAt = query.dataUpdatedAt;
  useEffect(() => {
    if (!focusedReelId) return;
    const isPending =
      reelStatus === "pending_upload" || reelStatus === "processing";
    if (!isPending) {
      pollCountRef.current.delete(focusedReelId);
      inFlightRef.current.delete(focusedReelId);
      return;
    }
    const count = (pollCountRef.current.get(focusedReelId) ?? 0) + 1;
    pollCountRef.current.set(focusedReelId, count);
    if (count !== 3 && count !== 8 && count !== 15) return;
    if (inFlightRef.current.has(focusedReelId)) return;
    inFlightRef.current.add(focusedReelId);
    api
      .post<SingleReelResponse>(`/api/reels/${focusedReelId}/reconcile`)
      .then((resp) => {
        qc.setQueryData(REEL_KEYS.single(focusedReelId), resp);
      })
      .catch(() => {
        /* best-effort — surface nothing to the user; polling continues */
      })
      .finally(() => {
        inFlightRef.current.delete(focusedReelId);
      });
  }, [focusedReelId, reelStatus, dataUpdatedAt, qc]);

  return query;
}

export function useReelComments(reelId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery<
    ReelCommentsResponse,
    Error,
    InfiniteData<ReelCommentsResponse>,
    ReturnType<typeof REEL_KEYS.comments>,
    string | undefined
  >({
    queryKey: REEL_KEYS.comments(reelId ?? "__none__"),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<ReelCommentsResponse>(
        `/api/reels/${reelId}/comments?limit=${COMMENT_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""),
        { signal }
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isAuthenticated && !!reelId,
  });
}

/**
 * Replies under a single top-level reel comment. `enabled` lets the UI
 * lazily fire the query only when the user expands the thread, so we
 * don't pre-fetch replies for every comment in the sheet.
 */
export function useReelCommentReplies(
  reelId: string,
  commentId: string,
  enabled: boolean
) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery<
    ReelCommentsResponse,
    Error,
    InfiniteData<ReelCommentsResponse>,
    ReturnType<typeof REEL_KEYS.replies>,
    string | undefined
  >({
    queryKey: REEL_KEYS.replies(reelId, commentId),
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      api.get<ReelCommentsResponse>(
        `/api/reels/${reelId}/comments/${commentId}/replies?limit=${COMMENT_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""),
        { signal }
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: isAuthenticated && enabled,
  });
}

/**
 * Manually reconcile a reel against Mux. Surface this on a "Sync" / "Retry"
 * button when a reel has been processing too long — the user gets an
 * immediate self-heal action instead of waiting for the auto-trigger in
 * `useReel`. Updates the single-reel cache on success.
 */
export function useReconcileReel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reelId: string) =>
      api.post<SingleReelResponse>(`/api/reels/${reelId}/reconcile`),
    onSuccess: (data, reelId) => {
      qc.setQueryData(REEL_KEYS.single(reelId), data);
      // If the reconcile flipped status, the feeds may have stale rows.
      // Cheap targeted invalidation rather than a global cache wipe.
      if (data.reel.status === "ready" || data.reel.status === "errored") {
        qc.invalidateQueries({ queryKey: REEL_KEYS.discover });
        qc.invalidateQueries({ queryKey: REEL_KEYS.following });
        qc.invalidateQueries({
          queryKey: ["reels", "user", data.reel.userId],
        });
      }
    },
  });
}

// ---- Mutations -----------------------------------------------------------

/**
 * Apply a patch function to every cached copy of a single reel:
 *   - discover infinite query
 *   - following list query
 *   - byUser infinite queries (all user ids)
 *   - single-reel queries
 *
 * Wrapped in a helper so the like / share optimistic updates stay one line.
 */
function patchReelInCaches(
  qc: QueryClient,
  reelId: string,
  patch: (r: Reel) => Reel
) {
  qc.setQueriesData<InfiniteData<ReelFeedResponse>>(
    { queryKey: REEL_KEYS.discover },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              reels: p.reels.map((r) => (r.id === reelId ? patch(r) : r)),
            })),
          }
        : data
  );
  qc.setQueriesData<ReelFeedResponse>(
    { queryKey: REEL_KEYS.following },
    (data) =>
      data
        ? {
            ...data,
            reels: data.reels.map((r) => (r.id === reelId ? patch(r) : r)),
          }
        : data
  );
  qc.setQueriesData<InfiniteData<ReelFeedResponse>>(
    { queryKey: ["reels", "user"] },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              reels: p.reels.map((r) => (r.id === reelId ? patch(r) : r)),
            })),
          }
        : data
  );
  qc.setQueriesData<SingleReelResponse>(
    { queryKey: REEL_KEYS.single(reelId) },
    (data) => (data ? { reel: patch(data.reel) } : data)
  );
}

/**
 * Snapshot of every cached slice that mentions a reel, captured BEFORE
 * we optimistically remove it. We restore from this if the server delete
 * fails so the tile pops back in place — same shape as the like/share
 * burst snapshots above but extended to the user-feed infinite queries
 * (which the like/share paths leave best-effort).
 */
interface ReelRemovalSnapshot {
  discover: Array<[
    readonly unknown[],
    InfiniteData<ReelFeedResponse> | undefined
  ]>;
  following: ReelFeedResponse | undefined;
  byUser: Array<[
    readonly unknown[],
    InfiniteData<ReelFeedResponse> | undefined
  ]>;
  single: SingleReelResponse | undefined;
}

/**
 * Strip a single reel out of every cached list/single query. Used by
 * `useDeleteReel`'s optimistic `onMutate`. We snapshot first so an error
 * can restore byte-for-byte; the rollback path simply writes each
 * snapshot back to its key. Mirrors the `patchReelInCaches` surface area
 * so we can't drift between the two.
 */
function removeReelFromCaches(
  qc: QueryClient,
  reelId: string
): ReelRemovalSnapshot {
  const discover = qc.getQueriesData<InfiniteData<ReelFeedResponse>>({
    queryKey: REEL_KEYS.discover,
  });
  const following = qc.getQueryData<ReelFeedResponse>(REEL_KEYS.following);
  const byUser = qc.getQueriesData<InfiniteData<ReelFeedResponse>>({
    queryKey: ["reels", "user"],
  });
  const single = qc.getQueryData<SingleReelResponse>(
    REEL_KEYS.single(reelId)
  );

  qc.setQueriesData<InfiniteData<ReelFeedResponse>>(
    { queryKey: REEL_KEYS.discover },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              reels: p.reels.filter((r) => r.id !== reelId),
              count: p.reels.filter((r) => r.id !== reelId).length,
            })),
          }
        : data
  );
  qc.setQueriesData<ReelFeedResponse>(
    { queryKey: REEL_KEYS.following },
    (data) =>
      data
        ? {
            ...data,
            reels: data.reels.filter((r) => r.id !== reelId),
            count: data.reels.filter((r) => r.id !== reelId).length,
          }
        : data
  );
  qc.setQueriesData<InfiniteData<ReelFeedResponse>>(
    { queryKey: ["reels", "user"] },
    (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              reels: p.reels.filter((r) => r.id !== reelId),
              count: p.reels.filter((r) => r.id !== reelId).length,
            })),
          }
        : data
  );
  // NOTE: we deliberately do NOT remove the single-reel / comments caches
  // here. If the caller is on `/reels/:reelId` for the reel being deleted,
  // removing the cache would trigger an immediate refetch → 404 → flash
  // of the "Could not load reel" page before the caller's onSuccess can
  // navigate away. Single/comments cleanup happens in `onSettled` below,
  // by which point the caller will have navigated.

  return { discover, following, byUser, single };
}

/**
 * A "burst" is a sequence of concurrent like toggles on the same reel — most
 * commonly a frustrated double-tap or a stuck network that lets the second
 * click squeak through before the first settles. We track one pre-burst
 * snapshot per reel and a counter for how many mutations are still in flight.
 *
 * Why not snapshot per mutation? Each `onMutate` call after the first would
 * capture an *already-optimistically-toggled* cache. If that mutation later
 * errored, the rollback would restore "the cache after the previous
 * optimistic write" — i.e. it would un-do a successful toggle. Burst-scoped
 * snapshots dodge this: there is exactly one snapshot per (reel, burst), and
 * we only restore it when the last mutation in the burst settles AND
 * something errored along the way.
 */
interface LikeBurst {
  count: number;
  snapshot: {
    prevDiscover: InfiniteData<ReelFeedResponse> | undefined;
    prevFollowing: ReelFeedResponse | undefined;
    prevSingle: SingleReelResponse | undefined;
  };
  errored: boolean;
}

export function useToggleReelLike() {
  const qc = useQueryClient();
  const bursts = useRef(new Map<string, LikeBurst>());

  return useMutation<ToggleReelLikeResponse, Error, string>({
    mutationFn: (reelId) =>
      api.post<ToggleReelLikeResponse>(`/api/reels/${reelId}/like`),
    onMutate: async (reelId) => {
      await qc.cancelQueries({ queryKey: REEL_KEYS.discover });
      await qc.cancelQueries({ queryKey: REEL_KEYS.following });
      await qc.cancelQueries({ queryKey: REEL_KEYS.single(reelId) });

      let burst = bursts.current.get(reelId);
      if (!burst) {
        burst = {
          count: 0,
          snapshot: {
            prevDiscover: qc.getQueryData<InfiniteData<ReelFeedResponse>>(
              REEL_KEYS.discover
            ),
            prevFollowing: qc.getQueryData<ReelFeedResponse>(
              REEL_KEYS.following
            ),
            prevSingle: qc.getQueryData<SingleReelResponse>(
              REEL_KEYS.single(reelId)
            ),
          },
          errored: false,
        };
        bursts.current.set(reelId, burst);
      }
      burst.count++;

      patchReelInCaches(qc, reelId, (r) => ({
        ...r,
        likedByUser: !r.likedByUser,
        likeCount: r.likedByUser
          ? Math.max(0, r.likeCount - 1)
          : r.likeCount + 1,
      }));
    },
    onError: (_err, reelId) => {
      const burst = bursts.current.get(reelId);
      if (burst) burst.errored = true;
    },
    onSettled: (_data, _err, reelId) => {
      const burst = bursts.current.get(reelId);
      if (!burst) return;
      burst.count--;
      if (burst.count > 0) {
        // Other mutations in this burst are still in flight; defer cleanup
        // to the last settle so the snapshot reflects the pre-burst state.
        return;
      }

      if (burst.errored) {
        // Restore to pre-burst. We only restore the three caches we
        // snapshotted; the by-user caches are best-effort and will resync
        // on the invalidation below.
        if (burst.snapshot.prevDiscover !== undefined) {
          qc.setQueryData(REEL_KEYS.discover, burst.snapshot.prevDiscover);
        }
        if (burst.snapshot.prevFollowing !== undefined) {
          qc.setQueryData(REEL_KEYS.following, burst.snapshot.prevFollowing);
        }
        if (burst.snapshot.prevSingle !== undefined) {
          qc.setQueryData(
            REEL_KEYS.single(reelId),
            burst.snapshot.prevSingle
          );
        }
        // Force a server reconcile so anything we couldn't snapshot (other
        // by-user caches, the following feed if it had grown, etc.) gets
        // the authoritative count.
        qc.invalidateQueries({ queryKey: REEL_KEYS.discover });
        qc.invalidateQueries({ queryKey: REEL_KEYS.following });
      }
      bursts.current.delete(reelId);
      // Always reconcile the single-reel cache for count accuracy. Cheap —
      // it's a single doc fetch, not a feed page.
      qc.invalidateQueries({ queryKey: REEL_KEYS.single(reelId) });
    },
  });
}

/**
 * Add a top-level reel comment OR a reply (when `parentCommentId` is set).
 * Same cache-update shape as `useAddComment` for posts:
 *   - top-level → prepend to top-level comments cache (page 0)
 *   - reply     → prepend to parent's replies cache + bump parent.replyCount
 * Both bump the reel's denormalized `commentCount` across every reel-list
 * cache so the comment-button label stays in sync.
 */
export function useAddReelComment(reelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      text,
      parentCommentId,
    }: {
      text: string;
      parentCommentId?: string | null;
    }) =>
      api.post<AddReelCommentResponse>(
        `/api/reels/${reelId}/comments`,
        parentCommentId ? { text, parentCommentId } : { text }
      ),
    onSuccess: ({ comment }) => {
      const attachedParent = comment.parentCommentId;
      if (attachedParent) {
        qc.setQueryData<InfiniteData<ReelCommentsResponse>>(
          REEL_KEYS.replies(reelId, attachedParent),
          (data) => {
            if (!data) return data;
            const [first, ...rest] = data.pages;
            const newFirst: ReelCommentsResponse = first
              ? {
                  ...first,
                  comments: [comment, ...first.comments],
                  count: first.count + 1,
                }
              : { comments: [comment], nextCursor: null, count: 1 };
            return { ...data, pages: [newFirst, ...rest] };
          }
        );
        qc.setQueryData<InfiniteData<ReelCommentsResponse>>(
          REEL_KEYS.comments(reelId),
          (data) => {
            if (!data) return data;
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                comments: page.comments.map((c) =>
                  c.id === attachedParent
                    ? { ...c, replyCount: (c.replyCount || 0) + 1 }
                    : c
                ),
              })),
            };
          }
        );
      } else {
        qc.setQueryData<InfiniteData<ReelCommentsResponse>>(
          REEL_KEYS.comments(reelId),
          (data) => {
            if (!data) return data;
            const [first, ...rest] = data.pages;
            const newFirst: ReelCommentsResponse = first
              ? {
                  ...first,
                  comments: [comment, ...first.comments],
                  count: first.count + 1,
                }
              : { comments: [comment], nextCursor: null, count: 1 };
            return { ...data, pages: [newFirst, ...rest] };
          }
        );
      }
      patchReelInCaches(qc, reelId, (r) => ({
        ...r,
        commentCount: r.commentCount + 1,
      }));
    },
  });
}

/**
 * Toggle a like on a single reel comment (top-level or reply). Optimistic
 * flip across the top-level cache AND every open replies cache for the
 * reel — the comment may live in either.
 */
export function useToggleReelCommentLike(reelId: string) {
  const qc = useQueryClient();
  type Ctx = {
    snapshots: { key: ReadonlyArray<unknown>; data: unknown }[];
  };

  const flipComment = (c: ReelComment, commentId: string): ReelComment =>
    c.id === commentId
      ? {
          ...c,
          likedByUser: !c.likedByUser,
          likeCount: c.likedByUser
            ? Math.max(0, c.likeCount - 1)
            : c.likeCount + 1,
        }
      : c;

  return useMutation<ToggleCommentLikeResponse, Error, string, Ctx>({
    mutationFn: (commentId) =>
      api.post<ToggleCommentLikeResponse>(
        `/api/reels/${reelId}/comments/${commentId}/like`
      ),
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: REEL_KEYS.comments(reelId) });
      const allRepliesKeys = qc
        .getQueryCache()
        .findAll({ queryKey: ["reels", reelId, "comments"] })
        .map((q) => q.queryKey)
        .filter(
          (k) =>
            Array.isArray(k) && k.length === 5 && k[4] === "replies"
        );

      const snapshots: { key: ReadonlyArray<unknown>; data: unknown }[] = [];
      const topKey = REEL_KEYS.comments(reelId);
      const topPrev = qc.getQueryData(topKey);
      snapshots.push({ key: topKey, data: topPrev });
      qc.setQueryData<InfiniteData<ReelCommentsResponse>>(topKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({
                ...p,
                comments: p.comments.map((c) => flipComment(c, commentId)),
              })),
            }
          : data
      );

      for (const key of allRepliesKeys) {
        const prev = qc.getQueryData(key);
        snapshots.push({ key, data: prev });
        qc.setQueryData<InfiniteData<ReelCommentsResponse>>(key, (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  comments: p.comments.map((c) => flipComment(c, commentId)),
                })),
              }
            : data
        );
      }

      return { snapshots };
    },
    onError: (_err, _commentId, ctx) => {
      if (!ctx) return;
      for (const { key, data } of ctx.snapshots) {
        qc.setQueryData(key, data);
      }
    },
    onSuccess: (resp, commentId) => {
      const reconcile = (c: ReelComment): ReelComment =>
        c.id === commentId
          ? { ...c, likedByUser: resp.liked, likeCount: resp.likeCount }
          : c;

      qc.setQueryData<InfiniteData<ReelCommentsResponse>>(
        REEL_KEYS.comments(reelId),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  comments: p.comments.map(reconcile),
                })),
              }
            : data
      );
      const allRepliesKeys = qc
        .getQueryCache()
        .findAll({ queryKey: ["reels", reelId, "comments"] })
        .map((q) => q.queryKey)
        .filter(
          (k) => Array.isArray(k) && k.length === 5 && k[4] === "replies"
        );
      for (const key of allRepliesKeys) {
        qc.setQueryData<InfiniteData<ReelCommentsResponse>>(key, (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((p) => ({
                  ...p,
                  comments: p.comments.map(reconcile),
                })),
              }
            : data
        );
      }
    },
  });
}

/**
 * Fire-and-forget view ping. The component layer is responsible for calling
 * this exactly once per (reel, session) after 3 s of continuous playback.
 * We deliberately don't touch any caches — the displayed `viewCount` was set
 * at hydration time and re-hydrates on next refetch.
 */
export function useRegisterReelView() {
  return useMutation({
    mutationFn: (reelId: string) =>
      api.post<RegisterReelViewResponse>(`/api/reels/${reelId}/view`),
  });
}

interface ShareSnapshot {
  prevDiscover: InfiniteData<ReelFeedResponse> | undefined;
  prevFollowing: ReelFeedResponse | undefined;
  prevSingle: SingleReelResponse | undefined;
}

export function useShareReel(reelId: string) {
  const qc = useQueryClient();
  return useMutation<
    ShareReelResponse,
    Error,
    { platforms: string[] },
    ShareSnapshot
  >({
    mutationFn: ({ platforms }) =>
      api.post<ShareReelResponse>(`/api/reels/${reelId}/share`, { platforms }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: REEL_KEYS.single(reelId) });
      const prevDiscover = qc.getQueryData<InfiniteData<ReelFeedResponse>>(
        REEL_KEYS.discover
      );
      const prevFollowing = qc.getQueryData<ReelFeedResponse>(
        REEL_KEYS.following
      );
      const prevSingle = qc.getQueryData<SingleReelResponse>(
        REEL_KEYS.single(reelId)
      );

      patchReelInCaches(qc, reelId, (r) => ({
        ...r,
        shareCount: r.shareCount + 1,
      }));
      return { prevDiscover, prevFollowing, prevSingle };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevDiscover) {
        qc.setQueryData(REEL_KEYS.discover, ctx.prevDiscover);
      }
      if (ctx?.prevFollowing) {
        qc.setQueryData(REEL_KEYS.following, ctx.prevFollowing);
      }
      if (ctx?.prevSingle) {
        qc.setQueryData(REEL_KEYS.single(reelId), ctx.prevSingle);
      }
    },
  });
}

/**
 * Author-only reel delete. Optimistically strips the reel from every
 * cached feed and single-reel slot so the tile disappears immediately;
 * on server error we restore the snapshot byte-for-byte and the tile
 * pops back. On success we invalidate discover/following/byUser so
 * counts and ordering re-converge with the server. Errors propagate to
 * the caller's `.mutate(..., { onError })` so the UI can show a toast
 * or alert without us coupling to a global notification system.
 */
export function useDeleteReel() {
  const qc = useQueryClient();
  return useMutation<
    DeleteReelResponse,
    Error,
    string,
    { snapshot: ReelRemovalSnapshot; authorId: string | undefined }
  >({
    mutationFn: (reelId) =>
      api.delete<DeleteReelResponse>(`/api/reels/${reelId}`),
    onMutate: async (reelId) => {
      await qc.cancelQueries({ queryKey: REEL_KEYS.discover });
      await qc.cancelQueries({ queryKey: REEL_KEYS.following });
      await qc.cancelQueries({ queryKey: ["reels", "user"] });
      await qc.cancelQueries({ queryKey: REEL_KEYS.single(reelId) });

      const single = qc.getQueryData<SingleReelResponse>(
        REEL_KEYS.single(reelId)
      );
      const authorId = single?.reel.userId;
      const snapshot = removeReelFromCaches(qc, reelId);
      return { snapshot, authorId };
    },
    onError: (_err, _reelId, ctx) => {
      if (!ctx) return;
      for (const [key, value] of ctx.snapshot.discover) {
        if (value !== undefined) qc.setQueryData(key, value);
      }
      if (ctx.snapshot.following !== undefined) {
        qc.setQueryData(REEL_KEYS.following, ctx.snapshot.following);
      }
      for (const [key, value] of ctx.snapshot.byUser) {
        if (value !== undefined) qc.setQueryData(key, value);
      }
      // No restore needed for single/comments: `onMutate` deliberately
      // does NOT touch those caches (see the note in `removeReelFromCaches`),
      // so they still hold the pre-delete data. The `onSettled` purge
      // below is gated on `data?.deleted`, so it's a no-op on error.
    },
    onSettled: (data, _err, reelId, ctx) => {
      qc.invalidateQueries({ queryKey: REEL_KEYS.discover });
      qc.invalidateQueries({ queryKey: REEL_KEYS.following });
      if (ctx?.authorId) {
        qc.invalidateQueries({ queryKey: REEL_KEYS.byUser(ctx.authorId) });
      } else {
        // Author id unknown (single cache was already empty) — fall back
        // to a broader prefix invalidation so any open profile reel grid
        // reconciles. Cheap because it only touches the reels namespace.
        qc.invalidateQueries({ queryKey: ["reels", "user"] });
      }
      // Only purge the single-reel / comments caches once the delete has
      // actually succeeded on the server. On success the caller will
      // have navigated away by now, so this is a safe sweep; on error
      // we leave the single cache alone so the user can still see what
      // they tried to delete.
      if (data?.deleted) {
        qc.removeQueries({ queryKey: REEL_KEYS.single(reelId) });
        qc.removeQueries({ queryKey: REEL_KEYS.comments(reelId) });
      }
    },
  });
}

// ---- Compose -------------------------------------------------------------

export interface CreateReelInput {
  caption?: string;
  songId?: string | null;
}

export function useCreateReel() {
  return useMutation({
    mutationFn: (input: CreateReelInput) =>
      api.post<CreateReelResponse>("/api/reels", {
        caption: (input.caption || "").trim(),
        songId: input.songId || null,
      }),
  });
}
