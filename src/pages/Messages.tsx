import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  MessageCircle,
  Music,
  Play,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ErrorBox } from "../components/ui/ErrorBox";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useDeleteMessage,
  useAvailableUsers,
} from "../hooks/useMessages";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import type { Conversation } from "../types/api";
import styles from "./Messages.module.css";

function formatTimeShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  /**
   * Active chat tracks both pieces independently. The previous version
   * conflated `conversationId` and `otherUserId` into a single field, which
   * meant sending the first message to a new contact would POST to a URL
   * that the backend interpreted as a conversation id and reject.
   */
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activeOtherUserId, setActiveOtherUserId] = useState<string | null>(
    null
  );
  const [activeName, setActiveName] = useState<string>("");
  const [activeAvatar, setActiveAvatar] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const conversations = useConversations();
  const messages = useMessages(activeConversationId);
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const filteredConversations = useMemo(() => {
    const list = conversations.data?.conversations ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations.data, searchQuery]);

  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [messages.data?.messages.length]);

  const openConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setActiveOtherUserId(conv.otherUserId);
    setActiveName(conv.name);
    setActiveAvatar(conv.avatar);
  };

  const closeConversation = () => {
    setActiveConversationId(null);
    setActiveOtherUserId(null);
    setActiveName("");
    setActiveAvatar(null);
    setMessageInput("");
  };

  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !activeOtherUserId || sendMessage.isPending) return;
    setMessageInput("");
    try {
      const result = await sendMessage.mutateAsync({
        recipientId: activeOtherUserId,
        text,
      });
      // The backend returns the canonical conversation id — if we were on a
      // brand-new chat (no convo yet) make sure subsequent fetches use the
      // real id instead of the user id.
      if (
        result.conversationId &&
        result.conversationId !== activeConversationId
      ) {
        setActiveConversationId(result.conversationId);
      }
    } catch {
      setMessageInput(text);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <PageLayout
      navKey="messages"
      title={activeConversationId ? activeName : "Messages"}
      showBack={!!activeConversationId}
      onBack={closeConversation}
      headerRight={
        !activeConversationId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewChatModal(true)}
            aria-label="Start new conversation"
          >
            <Edit size={18} aria-hidden />
          </Button>
        ) : undefined
      }
    >
      {activeConversationId ? (
        <ChatView
          ref={messagesAreaRef}
          activeName={activeName}
          activeAvatar={activeAvatar}
          activeUserId={activeOtherUserId}
          messagesState={messages}
          currentUserId={user?.id}
          onPlayMusic={(title, artist) =>
            navigate("/play-music", { state: { title, artist } })
          }
          onDeleteMessage={(messageId) => {
            if (!activeConversationId) return;
            const ok = window.confirm("Delete this message for you?");
            if (!ok) return;
            deleteMessage.mutate({
              conversationId: activeConversationId,
              messageId,
            });
          }}
          deletingMessageId={
            deleteMessage.isPending ? deleteMessage.variables?.messageId ?? null : null
          }
        />
      ) : (
        <ConversationsView
          conversations={filteredConversations}
          isPending={conversations.isPending}
          error={conversations.error}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpen={openConversation}
          onRetry={() => conversations.refetch()}
        />
      )}

      {activeConversationId ? (
        <div className={styles.composer}>
          <textarea
            ref={composerRef}
            className={styles.composerInput}
            placeholder="Type a message…"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            aria-label="Message"
            disabled={sendMessage.isPending}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!messageInput.trim() || !activeOtherUserId}
            loading={sendMessage.isPending}
            aria-label="Send message"
          >
            <Send size={16} aria-hidden />
          </Button>
        </div>
      ) : null}

      <NewChatModal
        open={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onPick={(u) => {
          setShowNewChatModal(false);
          // We don't yet have a real conversation id; use the user id so the
          // first GET returns 404-safe empty, then a real id arrives back from
          // the first send.
          setActiveConversationId(u.id);
          setActiveOtherUserId(u.id);
          setActiveName(u.name);
          setActiveAvatar(u.photoURL);
        }}
      />
    </PageLayout>
  );
}

// ---------- Sub-components ---------------------------------------------------

interface ConversationsViewProps {
  conversations: Conversation[];
  isPending: boolean;
  error: unknown;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpen: (c: Conversation) => void;
  onRetry: () => void;
}

function ConversationsView({
  conversations,
  isPending,
  error,
  searchQuery,
  onSearchChange,
  onOpen,
  onRetry,
}: ConversationsViewProps) {
  if (isPending) {
    return (
      <div className={styles.loading}>
        <Spinner /> Loading conversations…
      </div>
    );
  }
  if (error) {
    return (
      <ErrorBox
        variant="page"
        title="Could not load messages"
        message={error instanceof ApiError ? error.message : "Network error"}
        onRetry={onRetry}
      />
    );
  }
  return (
    <>
      <div className={styles.searchBar}>
        <Search size={18} aria-hidden className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search messages…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search conversations"
        />
      </div>
      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={36} aria-hidden />}
          title="No conversations yet"
          description="Use the edit button up top to start a new chat."
        />
      ) : (
        <ul className={styles.conversations}>
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                type="button"
                className={`${styles.convRow} ${
                  conv.unreadCount > 0 ? styles.convUnread : ""
                }`}
                onClick={() => onOpen(conv)}
              >
                <div className={styles.convAvatar}>
                  <Avatar
                    src={conv.avatar}
                    name={conv.name}
                    seed={conv.id}
                    size={48}
                  />
                  {conv.isOnline ? (
                    <span className={styles.online} aria-label="Online" />
                  ) : null}
                </div>
                <div className={styles.convBody}>
                  <div className={styles.convTopLine}>
                    <span className={styles.convName}>{conv.name}</span>
                    <span className={styles.convTime}>
                      {formatDateShort(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className={styles.convPreview}>
                    <span className={styles.convLast}>
                      {conv.lastMessage || "Say hi 👋"}
                    </span>
                    {conv.unreadCount > 0 ? (
                      <span className={styles.unreadBadge} aria-hidden>
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface ChatViewProps {
  activeName: string;
  activeAvatar: string | null;
  activeUserId: string | null;
  messagesState: ReturnType<typeof useMessages>;
  currentUserId: string | undefined;
  onPlayMusic: (title?: string, artist?: string) => void;
  onDeleteMessage: (messageId: string) => void;
  deletingMessageId: string | null;
}

const ChatView = forwardRef<HTMLDivElement, ChatViewProps>(function ChatView(
  {
    activeAvatar,
    activeName,
    activeUserId,
    messagesState,
    currentUserId,
    onPlayMusic,
    onDeleteMessage,
    deletingMessageId,
  },
  ref: Ref<HTMLDivElement>
) {
  return (
    <>
      <div className={styles.chatHeader}>
        <Avatar
          src={activeAvatar}
          name={activeName}
          seed={activeUserId || activeName}
          size={40}
        />
        <div>
          <div className={styles.chatHeaderName}>{activeName}</div>
          <div className={styles.chatHeaderStatus}>Tap to view profile</div>
        </div>
      </div>
      <div className={styles.messagesArea} ref={ref}>
        {messagesState.isPending ? (
          <div className={styles.loading}>
            <Spinner /> Loading messages…
          </div>
        ) : (messagesState.data?.messages.length ?? 0) === 0 ? (
          <EmptyState
            icon={<MessageCircle size={32} aria-hidden />}
            title="No messages yet"
            description="Say hi to start the conversation."
          />
        ) : (
          messagesState.data!.messages.map((msg) => {
            const sent = msg.senderId === currentUserId;
            const deleting = deletingMessageId === msg.id;
            return (
              <div
                key={msg.id}
                className={`${styles.bubbleRow} ${
                  sent ? styles.bubbleRowSent : ""
                }`}
              >
                <div className={styles.bubble}>
                  {msg.isMusic ? (
                    <button
                      type="button"
                      className={styles.musicCard}
                      onClick={() =>
                        onPlayMusic(msg.musicTitle, msg.musicArtist)
                      }
                    >
                      <Music size={20} aria-hidden />
                      <div>
                        <div className={styles.musicTitle}>
                          {msg.musicTitle}
                        </div>
                        <div className={styles.musicArtist}>
                          {msg.musicArtist}
                        </div>
                      </div>
                      <Play size={16} aria-hidden />
                    </button>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
                <div className={styles.bubbleMeta}>
                  <span className={styles.bubbleTime}>
                    {formatTimeShort(msg.timestamp)}
                  </span>
                  {sent ? (
                    <button
                      type="button"
                      className={styles.bubbleAction}
                      aria-label="Delete message for you"
                      title="Delete for me"
                      onClick={() => onDeleteMessage(msg.id)}
                      disabled={deleting}
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
});

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (user: {
    id: string;
    name: string;
    photoURL: string | null;
  }) => void;
}

function NewChatModal({ open, onClose, onPick }: NewChatModalProps) {
  const users = useAvailableUsers();
  return (
    <Modal open={open} onClose={onClose} title="New message">
      {users.isPending ? (
        <div className={styles.loading}>
          <Spinner /> Loading…
        </div>
      ) : users.error ? (
        <ErrorBox
          variant="inline"
          message="Could not load users."
          onRetry={() => users.refetch()}
        />
      ) : (
        <ul className={styles.userList}>
          {(users.data?.users ?? []).map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className={styles.userRow}
                onClick={() =>
                  onPick({
                    id: u.id,
                    name: u.name,
                    photoURL: u.photoURL,
                  })
                }
              >
                <Avatar
                  src={u.photoURL}
                  name={u.name}
                  seed={u.id}
                  size={40}
                />
                <span className={styles.userMeta}>
                  <span className={styles.userName}>{u.name}</span>
                  <span className={styles.userHandle}>@{u.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
