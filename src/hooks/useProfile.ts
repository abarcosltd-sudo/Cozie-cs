import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { MusicPost, MusicTrack, User } from "../types/api";

export function usePublicProfile(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["user", "profile", userId],
    queryFn: () => api.get<{ user: User }>(`/api/users/${userId}/profile`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useUserPosts(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["user", "posts", userId],
    queryFn: () =>
      api.get<{ posts: MusicPost[] }>(`/api/users/${userId}/posts`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useUserLikedSongs(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["user", "liked", userId],
    queryFn: () =>
      api.get<{ likedSongs: MusicTrack[] }>(`/api/users/${userId}/liked-songs`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useTrending() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["music", "trending"],
    queryFn: () => api.get<{ trending: MusicTrack[] }>("/api/music/trending"),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useCharts() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["music", "charts"],
    queryFn: () =>
      api.get<{ charts: (MusicTrack & { number: number })[] }>(
        "/api/music/charts"
      ),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}
