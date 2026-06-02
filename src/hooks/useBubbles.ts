import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type {
  AvailableArtistsResponse,
  BubblePostsResponse,
  GetBubbleResponse,
  JoinBubbleResponse,
  LeaveBubbleResponse,
  MusicPost,
  MyBubbleResponse,
  ReleaseBubblePostResponse,
} from "../types/api";

export const BUBBLE_KEYS = {
  my: ["bubble", "my"] as const,
  bubble: (artistId: string) => ["bubble", artistId] as const,
  posts: (artistId: string) => ["bubble", artistId, "posts"] as const,
  availableArtists: ["bubble", "available-artists"] as const,
};

const ARTISTS_PAGE_SIZE = 20;
const POSTS_PAGE_SIZE = 20;

/**
 * Caller is an artist; fetch their own bubble (dashboard data).
 * Disabled for non-artists so we don't generate spurious 403s in the
 * react-query devtools.
 */
export function useMyBubble() {
  const { isAuthenticated, user } = useAuth();
  return useQuery({
    queryKey: BUBBLE_KEYS.my,
    queryFn: () => api.get<MyBubbleResponse>("/api/bubbles/my"),
    enabled: isAuthenticated && user?.userType === "artist",
  });
}

/**
 * Public-ish bubble profile fetch. Server returns metadata + the
 * caller's membership state (isMember/isOwner/joinedAt) so the
 * BubbleProfile page can branch into non-member / member / owner.
 */
export function useBubble(artistId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: BUBBLE_KEYS.bubble(artistId ?? "__none__"),
    queryFn: () => api.get<GetBubbleResponse>(`/api/bubbles/${artistId}`),
    enabled: isAuthenticated && Boolean(artistId),
  });
}

export function useBubblePosts(artistId: string | null | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: BUBBLE_KEYS.posts(artistId ?? "__none__"),
    queryFn: ({ pageParam }) =>
      api.get<BubblePostsResponse>(
        `/api/bubbles/${artistId}/posts?limit=${POSTS_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam as string)}` : "")
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: isAuthenticated && Boolean(artistId),
  });
}

export function useAvailableArtists() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: BUBBLE_KEYS.availableArtists,
    queryFn: ({ pageParam }) =>
      api.get<AvailableArtistsResponse>(
        `/api/users/available-artists?limit=${ARTISTS_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam as string)}` : "")
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: isAuthenticated,
  });
}

/**
 * Optimistic join — flips `isMember` and bumps `memberCount` in the
 * useBubble cache immediately, also patches the AvailableArtists list
 * so the Discover → Bubbles tab updates without a refetch. On success
 * we also invalidate the home feed (the user can now see this bubble's
 * unreleased posts).
 */
export function useJoinBubble(artistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<JoinBubbleResponse>(`/api/bubbles/${artistId}/join`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: BUBBLE_KEYS.bubble(artistId) });
      const prevBubble = qc.getQueryData<GetBubbleResponse>(
        BUBBLE_KEYS.bubble(artistId)
      );
      const prevArtists = qc.getQueryData<InfiniteData<AvailableArtistsResponse>>(
        BUBBLE_KEYS.availableArtists
      );

      qc.setQueryData<GetBubbleResponse>(
        BUBBLE_KEYS.bubble(artistId),
        (data) =>
          data
            ? {
                ...data,
                userMembership: {
                  ...data.userMembership,
                  isMember: true,
                  joinedAt: data.userMembership.joinedAt || new Date().toISOString(),
                },
                bubble: {
                  ...data.bubble,
                  memberCount: data.bubble.memberCount + 1,
                },
              }
            : data
      );

      qc.setQueryData<InfiniteData<AvailableArtistsResponse>>(
        BUBBLE_KEYS.availableArtists,
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  artists: page.artists.map((a) =>
                    a.id === artistId && a.bubble
                      ? {
                          ...a,
                          bubble: {
                            ...a.bubble,
                            userIsMember: true,
                            memberCount: a.bubble.memberCount + 1,
                          },
                        }
                      : a
                  ),
                })),
              }
            : data
      );

      return { prevBubble, prevArtists };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevBubble) {
        qc.setQueryData(BUBBLE_KEYS.bubble(artistId), ctx.prevBubble);
      }
      if (ctx?.prevArtists) {
        qc.setQueryData(BUBBLE_KEYS.availableArtists, ctx.prevArtists);
      }
    },
    onSuccess: () => {
      // The viewer can now see this bubble's unreleased posts in the
      // home feed; force a refetch.
      qc.invalidateQueries({ queryKey: ["feed", "following"] });
      qc.invalidateQueries({ queryKey: BUBBLE_KEYS.posts(artistId) });
    },
  });
}

/**
 * Optimistic leave — mirror of useJoinBubble. Forces a feed refetch so
 * the now-hidden bubble posts disappear without a manual reload.
 */
export function useLeaveBubble(artistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.delete<LeaveBubbleResponse>(`/api/bubbles/${artistId}/join`),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: BUBBLE_KEYS.bubble(artistId) });
      const prevBubble = qc.getQueryData<GetBubbleResponse>(
        BUBBLE_KEYS.bubble(artistId)
      );
      const prevArtists = qc.getQueryData<InfiniteData<AvailableArtistsResponse>>(
        BUBBLE_KEYS.availableArtists
      );

      qc.setQueryData<GetBubbleResponse>(
        BUBBLE_KEYS.bubble(artistId),
        (data) =>
          data
            ? {
                ...data,
                userMembership: {
                  ...data.userMembership,
                  isMember: false,
                  joinedAt: null,
                },
                bubble: {
                  ...data.bubble,
                  memberCount: Math.max(0, data.bubble.memberCount - 1),
                },
              }
            : data
      );

      qc.setQueryData<InfiniteData<AvailableArtistsResponse>>(
        BUBBLE_KEYS.availableArtists,
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  artists: page.artists.map((a) =>
                    a.id === artistId && a.bubble
                      ? {
                          ...a,
                          bubble: {
                            ...a.bubble,
                            userIsMember: false,
                            memberCount: Math.max(0, a.bubble.memberCount - 1),
                          },
                        }
                      : a
                  ),
                })),
              }
            : data
      );

      return { prevBubble, prevArtists };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevBubble) {
        qc.setQueryData(BUBBLE_KEYS.bubble(artistId), ctx.prevBubble);
      }
      if (ctx?.prevArtists) {
        qc.setQueryData(BUBBLE_KEYS.availableArtists, ctx.prevArtists);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed", "following"] });
      qc.invalidateQueries({ queryKey: BUBBLE_KEYS.posts(artistId) });
    },
  });
}

/**
 * Release an unreleased bubble post. Irreversible per API contract.
 * Optimistically flips visibility/isReleased/bubbleInfo in:
 *   - the home feed (it's now a public post)
 *   - the bubble's own post list (badge changes from "Bubble" to "Released")
 */
export function useReleaseBubblePost(artistId: string) {
  const qc = useQueryClient();

  const patchPost = (post: MusicPost): MusicPost => ({
    ...post,
    visibility: "public",
    isReleased: true,
    releasedAt: post.releasedAt || new Date().toISOString(),
    bubbleInfo: {
      ...post.bubbleInfo,
      isBubbleOnly: false,
      canShareExternally: true,
      isReleased: true,
      visibility: "public",
    },
  });

  return useMutation<ReleaseBubblePostResponse, Error, string>({
    mutationFn: (postId) =>
      api.post<ReleaseBubblePostResponse>(
        `/api/bubbles/posts/${postId}/release`
      ),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: BUBBLE_KEYS.posts(artistId) });
      await qc.cancelQueries({ queryKey: ["feed", "following"] });

      const prevBubblePosts = qc.getQueryData<InfiniteData<BubblePostsResponse>>(
        BUBBLE_KEYS.posts(artistId)
      );
      const prevFeed = qc.getQueryData<{ posts: MusicPost[] }>([
        "feed",
        "following",
      ]);

      qc.setQueryData<InfiniteData<BubblePostsResponse>>(
        BUBBLE_KEYS.posts(artistId),
        (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  posts: page.posts.map((p) =>
                    p.id === postId ? patchPost(p) : p
                  ),
                })),
              }
            : data
      );

      qc.setQueryData<{ posts: MusicPost[] }>(["feed", "following"], (data) =>
        data
          ? {
              ...data,
              posts: data.posts.map((p) =>
                p.id === postId ? patchPost(p) : p
              ),
            }
          : data
      );

      return { prevBubblePosts, prevFeed };
    },
    onError: (_err, _postId, ctx) => {
      const typed = ctx as
        | {
            prevBubblePosts?: InfiniteData<BubblePostsResponse>;
            prevFeed?: { posts: MusicPost[] };
          }
        | undefined;
      if (typed?.prevBubblePosts) {
        qc.setQueryData(BUBBLE_KEYS.posts(artistId), typed.prevBubblePosts);
      }
      if (typed?.prevFeed) {
        qc.setQueryData(["feed", "following"], typed.prevFeed);
      }
    },
  });
}
