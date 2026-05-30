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
  AddMusicCommentResponse,
  MusicComment,
  MusicCommentsResponse,
  MusicPost,
  ToggleCommentLikeResponse,
} from "../types/api";

const KEYS = {
  feed: ["feed", "following"] as const,
  explore: ["feed", "explore"] as const,
  comments: (postId: string) => ["post", postId, "comments"] as const,
  replies: (postId: string, commentId: string) =>
    ["post", postId, "comments", commentId, "replies"] as const,
};

interface FeedResponse {
  posts: MusicPost[];
}

const COMMENT_PAGE_SIZE = 20;

export function useFollowingFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.feed,
    queryFn: () => api.get<FeedResponse>("/api/posts/feed"),
    enabled: isAuthenticated,
  });
}

export function useExploreFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.explore,
    queryFn: () => api.get<FeedResponse>("/api/posts/explore"),
    enabled: isAuthenticated,
  });
}

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      api.post<{ liked: boolean; likeCount: number }>(
        `/api/posts/${postId}/like`
      ),
    // Optimistic toggle on both feed queries.
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: KEYS.feed });
      await qc.cancelQueries({ queryKey: KEYS.explore });
      const prevFeed = qc.getQueryData<FeedResponse>(KEYS.feed);
      const prevExplore = qc.getQueryData<FeedResponse>(KEYS.explore);
      const flip = (data: FeedResponse | undefined): FeedResponse | undefined =>
        data
          ? {
              posts: data.posts.map((p) =>
                p.id === postId
                  ? {
                      ...p,
                      likedByUser: !p.likedByUser,
                      likes: p.likedByUser
                        ? Math.max(0, p.likes - 1)
                        : p.likes + 1,
                    }
                  : p
              ),
            }
          : data;
      qc.setQueryData<FeedResponse>(KEYS.feed, flip);
      qc.setQueryData<FeedResponse>(KEYS.explore, flip);
      return { prevFeed, prevExplore };
    },
    onError: (_err, _postId, ctx) => {
      if (ctx?.prevFeed) qc.setQueryData(KEYS.feed, ctx.prevFeed);
      if (ctx?.prevExplore) qc.setQueryData(KEYS.explore, ctx.prevExplore);
    },
  });
}

/**
 * Paginated top-level comments for a post. Reply trees live under their
 * own cache key (`usePostCommentReplies`) so a parent invalidation doesn't
 * cascade-rebuild every open reply expander.
 */
export function usePostComments(postId: string | null) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: postId ? KEYS.comments(postId) : ["post", "__none__", "comments"],
    queryFn: ({ pageParam }) =>
      api.get<MusicCommentsResponse>(
        `/api/posts/${postId}/comments?limit=${COMMENT_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam as string)}` : "")
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: isAuthenticated && !!postId,
  });
}

export function usePostCommentReplies(
  postId: string,
  commentId: string,
  enabled: boolean
) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: KEYS.replies(postId, commentId),
    queryFn: ({ pageParam }) =>
      api.get<MusicCommentsResponse>(
        `/api/posts/${postId}/comments/${commentId}/replies?limit=${COMMENT_PAGE_SIZE}` +
          (pageParam ? `&cursor=${encodeURIComponent(pageParam as string)}` : "")
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: isAuthenticated && enabled,
  });
}

/**
 * Add a top-level comment OR a reply.
 *   - When `parentCommentId` is null/undefined: prepends to the top-level
 *     comments cache (page 0) and bumps the post's `comments` counter on
 *     both feeds.
 *   - When `parentCommentId` is set: prepends to the parent's replies cache
 *     (page 0), bumps the parent comment's `replyCount` in the top-level
 *     cache, AND bumps the post's `comments` counter (because backend
 *     does too — replies count toward the visible total).
 *
 * Note: backend silently re-parents replies-of-replies to the top-level,
 * so `comment.parentCommentId` in the response is authoritative.
 */
export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      text,
      parentCommentId,
    }: {
      text: string;
      parentCommentId?: string | null;
    }) =>
      api.post<AddMusicCommentResponse>(
        `/api/posts/${postId}/comments`,
        parentCommentId ? { text, parentCommentId } : { text }
      ),
    onSuccess: ({ comment }) => {
      const attachedParent = comment.parentCommentId;
      if (attachedParent) {
        // 1) Prepend the reply to the parent's replies cache.
        qc.setQueryData<InfiniteData<MusicCommentsResponse>>(
          KEYS.replies(postId, attachedParent),
          (data) => {
            if (!data) return data;
            const [first, ...rest] = data.pages;
            const newFirst: MusicCommentsResponse = first
              ? {
                  ...first,
                  comments: [comment, ...first.comments],
                  count: first.count + 1,
                }
              : { comments: [comment], nextCursor: null, count: 1 };
            return { ...data, pages: [newFirst, ...rest] };
          }
        );
        // 2) Bump the parent comment's `replyCount` in the top-level list.
        qc.setQueryData<InfiniteData<MusicCommentsResponse>>(
          KEYS.comments(postId),
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
        // Prepend the new top-level comment.
        qc.setQueryData<InfiniteData<MusicCommentsResponse>>(
          KEYS.comments(postId),
          (data) => {
            if (!data) return data;
            const [first, ...rest] = data.pages;
            const newFirst: MusicCommentsResponse = first
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
      // Post-level `comments` counter changes either way.
      qc.invalidateQueries({ queryKey: KEYS.feed });
      qc.invalidateQueries({ queryKey: KEYS.explore });
    },
  });
}

/**
 * Toggle a like on a single comment (top-level or reply). Optimistic flip
 * across the top-level list AND every replies cache for this post — the
 * comment may be displayed in either place. On error, rolls back to the
 * pre-mutate snapshots.
 */
export function useTogglePostCommentLike(postId: string) {
  const qc = useQueryClient();
  type Ctx = {
    snapshots: { key: ReadonlyArray<unknown>; data: unknown }[];
  };

  const flipComment = (c: MusicComment, commentId: string): MusicComment =>
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
        `/api/posts/${postId}/comments/${commentId}/like`
      ),
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: KEYS.comments(postId) });
      // Match every replies cache under this post — the comment could
      // live in any of them.
      const allRepliesKeys = qc
        .getQueryCache()
        .findAll({ queryKey: ["post", postId, "comments"] })
        .map((q) => q.queryKey)
        .filter(
          (k) =>
            Array.isArray(k) && k.length === 5 && k[4] === "replies"
        );

      const snapshots: { key: ReadonlyArray<unknown>; data: unknown }[] = [];
      const topKey = KEYS.comments(postId);
      const topPrev = qc.getQueryData(topKey);
      snapshots.push({ key: topKey, data: topPrev });
      qc.setQueryData<InfiniteData<MusicCommentsResponse>>(topKey, (data) =>
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
        qc.setQueryData<InfiniteData<MusicCommentsResponse>>(key, (data) =>
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
      // Reconcile to authoritative server count in case of concurrent
      // toggles. Walk both top-level + every replies cache.
      const reconcile = (c: MusicComment): MusicComment =>
        c.id === commentId
          ? { ...c, likedByUser: resp.liked, likeCount: resp.likeCount }
          : c;

      qc.setQueryData<InfiniteData<MusicCommentsResponse>>(
        KEYS.comments(postId),
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
        .findAll({ queryKey: ["post", postId, "comments"] })
        .map((q) => q.queryKey)
        .filter(
          (k) => Array.isArray(k) && k.length === 5 && k[4] === "replies"
        );
      for (const key of allRepliesKeys) {
        qc.setQueryData<InfiniteData<MusicCommentsResponse>>(key, (data) =>
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
