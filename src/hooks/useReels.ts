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
import { useRef } from "react";
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
  Reel,
  ReelCommentsResponse,
  ReelFeedResponse,
  RegisterReelViewResponse,
  ShareReelResponse,
  SingleReelResponse,
  ToggleReelLikeResponse,
} from "../types/api";

export const REEL_KEYS = {
  all: ["reels"] as const,
  discover: ["reels", "discover"] as const,
  following: ["reels", "following"] as const,
  byUser: (userId: string) => ["reels", "user", userId] as const,
  single: (reelId: string) => ["reels", "single", reelId] as const,
  comments: (reelId: string) => ["reels", reelId, "comments"] as const,
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
 */
export function useReel(reelId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
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

export function useAddReelComment(reelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<AddReelCommentResponse>(
        `/api/reels/${reelId}/comments`,
        { text }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REEL_KEYS.comments(reelId) });
      // commentCount bumped — let any reel-list query refresh too.
      patchReelInCaches(qc, reelId, (r) => ({
        ...r,
        commentCount: r.commentCount + 1,
      }));
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
