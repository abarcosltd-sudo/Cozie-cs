import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { FollowStatus, PublicProfile } from "../types/api";

const KEYS = {
  status: (userId: string) => ["follow", "status", userId] as const,
  followers: (userId: string) => ["follow", "followers", userId] as const,
  following: (userId: string) => ["follow", "following", userId] as const,
};

interface FollowListResponse {
  followers?: (PublicProfile & { followedAt: string })[];
  following?: (PublicProfile & { followedAt: string })[];
  nextCursor: string | null;
  count: number;
}

export function useFollowStatus(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: userId ? KEYS.status(userId) : ["follow", "status", "__none__"],
    queryFn: () => api.get<FollowStatus>(`/api/users/${userId}/follow-status`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useFollowers(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: userId
      ? KEYS.followers(userId)
      : ["follow", "followers", "__none__"],
    queryFn: () => api.get<FollowListResponse>(`/api/users/${userId}/followers`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useFollowing(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: userId
      ? KEYS.following(userId)
      : ["follow", "following", "__none__"],
    queryFn: () => api.get<FollowListResponse>(`/api/users/${userId}/following`),
    enabled: isAuthenticated && !!userId,
  });
}

export function useFollowMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post<{ following: boolean; followerCount: number }>(
        `/api/users/${userId}/follow`
      ),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: KEYS.status(userId) });
      qc.invalidateQueries({ queryKey: KEYS.followers(userId) });
      // Invalidate the personalized feed since following someone changes it.
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useUnfollowMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<{ following: boolean; followerCount: number }>(
        `/api/users/${userId}/follow`
      ),
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: KEYS.status(userId) });
      qc.invalidateQueries({ queryKey: KEYS.followers(userId) });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
