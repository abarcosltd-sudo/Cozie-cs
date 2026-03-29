import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './messages.css';
import { socket } from '../socket'; // adjust path if needed

interface Conversation {
  id: string;
  otherUserId: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar: string | null;
  avatarGradient: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  text: string;
  timestamp: string;
  sent: boolean;
  isMusic?: boolean;
  musicTitle?: string;
  musicArtist?: string;
  musicUrl?: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  photoURL: string | null;
  isOnline: boolean;
}

export default function Messages() {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const token = localStorage.getItem('token');
  
  // Fetch conversations on mount
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token]);

  useEffect(() => {
    if (userId) {
      socket.emit('join', userId);
      console.log('Joined socket room:', userId);
    }
  }, [userId]);

  const fetchMessages = async (conversationId: string, scroll = true) => {
    try {
      const res = await fetch(`https://cozie-kohl.vercel.app/api/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text || '',
          timestamp: formatTime(msg.timestamp),
          sent: msg.senderId === getUserIdFromToken(),
          isMusic: msg.isMusic || false,
          musicTitle: msg.musicTitle,
          musicArtist: msg.musicArtist,
          musicUrl: msg.musicUrl
        }));
        setMessages(formattedMessages);
        if (scroll) {
          setTimeout(() => scrollToBottom(), 100);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('https://cozie-kohl.vercel.app/api/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat && token) {
      fetchMessages(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    socket.on('newMessage', (data) => {
      console.log('Realtime message:', data);
  
      // Only update if it's the current chat
      if (data.conversationId === activeChat) {
        const newMsg: Message = {
          id: data.message.id,
          text: data.message.text,
          timestamp: formatTime(data.message.timestamp),
          sent: data.message.senderId === userId,
          isMusic: data.message.isMusic,
          musicTitle: data.message.musicTitle,
          musicArtist: data.message.musicArtist,
          musicUrl: data.message.musicUrl
        };
  
        setMessages(prev => [...prev, newMsg]);
        scrollToBottom();
      }
  
      // Optional: update conversations list
      fetchConversations();
    });
  
    return () => {
      socket.off('newMessage');
    };
  }, [activeChat]);

  

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch('https://cozie-kohl.vercel.app/api/users/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvailableUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const openNewChat = () => {
    fetchAvailableUsers();
    setShowNewChatModal(true);
  };

  const startNewChat = (user: User) => {
    // Create a temporary conversation
    const newConversation: Conversation = {
      id: user.id,
      otherUserId: user.id,
      name: user.name,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
      avatar: user.photoURL,
      avatarGradient: getRandomGradient(),
      isOnline: user.isOnline
    };
    setConversations([newConversation, ...conversations]);
    setActiveChat(user.id);
    setShowNewChatModal(false);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChat || sending) return;
    
    setSending(true);
    const text = messageInput.trim();
    setMessageInput('');
    
    // Optimistic update
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: formatTime(new Date().toISOString()),
      sent: true,
      isMusic: false
    };
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();
    
    try {
      const res = await fetch(`https://cozie-kohl.vercel.app/api/messages/${activeChat}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh messages to get real data
        fetchMessages(activeChat);
        // Refresh conversations list
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  };

  // const sendMusicShare = async (musicTitle: string, musicArtist: string, musicUrl?: string) => {
  //   if (!activeChat) return;
    
  //   try {
  //     const res = await fetch(`https://cozie-kohl.vercel.app/api/messages/${activeChat}`, {
  //       method: 'POST',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         text: '',
  //         isMusic: true,
  //         musicTitle,
  //         musicArtist,
  //         musicUrl
  //       })
  //     });
      
  //     if (res.ok) {
  //       fetchMessages(activeChat);
  //     }
  //   } catch (error) {
  //     console.error('Error sharing music:', error);
  //   }
  // };

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUserIdFromToken = (): string => {
    // Parse JWT to get user ID (you can also store user ID in localStorage)
    return localStorage.getItem('userId') || '';
  };

  const getRandomGradient = () => {
    const gradients = [
      'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = Math.min(
        messageInputRef.current.scrollHeight,
        100
      ) + 'px';
    }
  };
  
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = conversations.find(c => c.id === activeChat);
  
  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">Loading messages...</div>
      </div>
    );
  }
  
  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div className="header-banner">
        <div className="header-left">
          {activeChat && (
            <div className="back-button" onClick={() => setActiveChat(null)}>
              ←
            </div>
          )}
          <div className="header-title">
            {activeChat ? currentConversation?.name : 'Messages'}
          </div>
        </div>
        <button className="new-message-button" onClick={openNewChat}>
          ✏️
        </button>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button onClick={() => setShowNewChatModal(false)}>✕</button>
            </div>
            <div className="users-list">
              {availableUsers.map(user => (
                <div key={user.id} className="user-item" onClick={() => startNewChat(user)}>
                  <div className="user-avatar" style={{
                    background: user.photoURL ? `url(${user.photoURL})` : getRandomGradient(),
                    backgroundSize: 'cover'
                  }}></div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-username">@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="messages-container">
        {!activeChat && (
          <>
            {/* Search Bar */}
            <div className="search-section">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="conversations-list">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => setActiveChat(conversation.id)}
                  >
                    <div
                      className="avatar"
                      style={{
                        background: conversation.avatar ? `url(${conversation.avatar})` : conversation.avatarGradient,
                        backgroundSize: conversation.avatar ? 'cover' : 'auto'
                      }}
                    >
                      {conversation.isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <span className="conversation-name">{conversation.name}</span>
                        <span className="conversation-time">
                          {new Date(conversation.lastMessageTime).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <span className="last-message">{conversation.lastMessage}</span>
                        {conversation.unreadCount > 0 && (
                          <span className="unread-badge">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <div className="empty-text">No conversations yet</div>
                  <div className="empty-subtext">Click the ✏️ button to start a new chat</div>
                </div>
              )}
            </div>
          </>
        )}

        {activeChat && (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div
                className="chat-avatar"
                style={{
                  background: currentConversation?.avatar ? `url(${currentConversation.avatar})` : currentConversation?.avatarGradient,
                  backgroundSize: 'cover'
                }}
              ></div>
              <div className="chat-user-info">
                <div className="chat-user-name">{currentConversation?.name}</div>
                <div className="chat-user-status">
                  {currentConversation?.isOnline ? 'Active now' : 'Offline'}
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area" ref={messagesAreaRef}>
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sent ? 'sent' : ''}`}>
                  <div className="message-content">
                    <div className="message-bubble">
                      {message.isMusic ? (
                        <div
                          className="music-share"
                          onClick={() => navigate('/play-music', { state: { title: message.musicTitle, artist: message.musicArtist } })}
                        >
                          <div className="music-share-art">🎸</div>
                          <div className="music-share-info">
                            <div className="music-share-title">{message.musicTitle}</div>
                            <div className="music-share-artist">{message.musicArtist}</div>
                          </div>
                          <div className="play-icon">▶️</div>
                        </div>
                      ) : (
                        <div className="message-text">{message.text}</div>
                      )}
                    </div>
                    <div className="message-time">{message.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <div className="message-input-wrapper">
                <textarea
                  ref={messageInputRef}
                  className="message-input"
                  placeholder="Type a message..."
                  rows={1}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  disabled={sending}
                />
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-container">
          <div className="nav-item" onClick={() => navigate('/home-feed')}>
            <div className="nav-icon">🏠</div>
          </div>
          <div className="nav-item" onClick={() => navigate('/discover')}>
            <div className="nav-icon">🔍</div>
          </div>
          <div className="nav-item" onClick={() => navigate('/add-music')}>
            <div className="nav-icon">➕</div>
          </div>
          <div className="nav-item active">
            <div className="nav-icon">💬</div>
          </div>
          <div className="nav-item" onClick={() => navigate('/profile')}>
            <div className="nav-icon">👤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
