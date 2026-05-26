import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { MusicComment, MusicPost } from "../types/api";

const KEYS = {
  feed: ["feed", "following"] as const,
  explore: ["feed", "explore"] as const,
  comments: (postId: string) => ["post", postId, "comments"] as const,
};

interface FeedResponse {
  posts: MusicPost[];
}

interface CommentsResponse {
  comments: MusicComment[];
  count: number;
}

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

export function usePostComments(postId: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: postId ? KEYS.comments(postId) : ["post", "__none__", "comments"],
    queryFn: () =>
      api.get<CommentsResponse>(`/api/posts/${postId}/comments`),
    enabled: isAuthenticated && !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<{ commentId: string; comment: MusicComment }>(
        `/api/posts/${postId}/comments`,
        { text }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.comments(postId) });
      // The post's commentCount changed too — bust both feeds.
      qc.invalidateQueries({ queryKey: KEYS.feed });
      qc.invalidateQueries({ queryKey: KEYS.explore });
    },
  });
}
