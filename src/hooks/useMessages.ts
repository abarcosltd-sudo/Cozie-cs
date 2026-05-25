import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { Conversation, DirectMessage } from "../types/api";

const KEYS = {
  conversations: ["messages", "conversations"] as const,
  messages: (conversationId: string) =>
    ["messages", "conversation", conversationId] as const,
};

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  messages: DirectMessage[];
  count: number;
}

interface SendMessageInput {
  /** Recipient *user* id (not conversation id). */
  recipientId: string;
  text: string;
}

interface DeleteMessageInput {
  conversationId: string;
  messageId: string;
}

export function useConversations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEYS.conversations,
    queryFn: () => api.get<ConversationsResponse>("/api/messages/conversations"),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });
}

export function useMessages(conversationId: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: conversationId
      ? KEYS.messages(conversationId)
      : ["messages", "conversation", "__none__"],
    queryFn: () =>
      api.get<MessagesResponse>(`/api/messages/${conversationId}`),
    enabled: isAuthenticated && !!conversationId,
    refetchInterval: 10_000,
  });
}

/**
 * Sends a message addressed to a *recipient user id* — backend looks up or
 * creates the conversation deterministically. We invalidate both the
 * conversations list and the specific conversation thread.
 */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, text }: SendMessageInput) =>
      api.post<{
        message: DirectMessage;
        conversationId: string;
      }>(`/api/messages/${recipientId}`, { text }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.conversations });
      qc.invalidateQueries({
        queryKey: KEYS.messages(data.conversationId),
      });
    },
  });
}

/**
 * Soft-delete (for-me-only) a message. The backend writes the deletion
 * onto the user's read-cursor side and the message disappears from this
 * viewer's subsequent `GET /api/messages/:conversationId` results.
 *
 * We do an optimistic remove on the cached thread and invalidate the
 * conversations list (last-message preview may change).
 */
export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: DeleteMessageInput) =>
      api.delete<{ deleted: boolean }>(`/api/messages/${messageId}`, {
        body: { conversationId },
      }),
    onMutate: async ({ conversationId, messageId }) => {
      const key = KEYS.messages(conversationId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<MessagesResponse>(key);
      if (prev) {
        qc.setQueryData<MessagesResponse>(key, {
          messages: prev.messages.filter((m) => m.id !== messageId),
          count: Math.max(0, prev.count - 1),
        });
      }
      return { prev, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, { conversationId }) => {
      qc.invalidateQueries({ queryKey: KEYS.conversations });
      qc.invalidateQueries({ queryKey: KEYS.messages(conversationId) });
    },
  });
}

export function useAvailableUsers() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["users", "available"],
    queryFn: () =>
      api.get<{ users: { id: string; name: string; username: string; email: string; photoURL: string | null; isOnline: boolean }[] }>(
        "/api/users/available"
      ),
    enabled: isAuthenticated,
  });
}
