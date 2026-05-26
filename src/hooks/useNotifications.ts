import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { AppNotification } from "../types/api";

const KEYS = {
  list: ["notifications", "list"] as const,
  unread: ["notifications", "unread-count"] as const,
};

interface UnreadCountResponse {
  unreadCount: number;
}

interface ListNotificationsResponse {
  notifications: AppNotification[];
  nextCursor: string | null;
  count: number;
}

/**
 * Lightweight badge poll. Only runs when authenticated; React Query refetches
 * every 30s so the bell stays roughly fresh without a real-time channel.
 */
export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.unread,
    queryFn: () => api.get<UnreadCountResponse>("/api/notifications/unread-count"),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useNotifications(unreadOnly = false) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [...KEYS.list, { unreadOnly }],
    queryFn: () =>
      api.get<ListNotificationsResponse>(
        `/api/notifications${unreadOnly ? "?unreadOnly=true" : ""}`
      ),
    enabled: isAuthenticated,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids?: string[]; markAll?: boolean }) =>
      api.post<{ markedRead: number; unreadCount: number }>(
        "/api/notifications/mark-read",
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.unread });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ dismissed: boolean }>(`/api/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.unread });
      qc.invalidateQueries({ queryKey: KEYS.list });
    },
  });
}
