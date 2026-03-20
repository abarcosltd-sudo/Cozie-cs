import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './messages.css';

interface Conversation {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  avatar: string;
  isOnline: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  sent: boolean;
  isMusic?: boolean;
  musicTitle?: string;
  musicArtist?: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hey! How's it going?",
      time: '10:30 AM',
      sent: false,
    },
    {
      id: 2,
      text: 'Great! Just discovered this amazing song 🎵',
      time: '10:32 AM',
      sent: true,
    },
    {
      id: 3,
      text: 'Oh nice! What is it?',
      time: '10:33 AM',
      sent: false,
    },
    {
      id: 4,
      text: 'Bohemian Rhapsody',
      time: '10:35 AM',
      sent: true,
      isMusic: true,
      musicTitle: 'Bohemian Rhapsody',
      musicArtist: 'Queen',
    },
    {
      id: 5,
      text: 'Classic! Love this one 💜',
      time: '10:36 AM',
      sent: false,
    },
  ]);

  const [conversations] = useState<Conversation[]>([
    {
      id: 1,
      name: 'Sarah Johnson',
      lastMessage: 'Check out this song! 🎵',
      time: '2m ago',
      unreadCount: 2,
      avatar: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      isOnline: true,
    },
    {
      id: 2,
      name: 'Mike Chen',
      lastMessage: 'That concert was amazing!',
      time: '1h ago',
      avatar: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      isOnline: true,
    },
    {
      id: 3,
      name: 'Emma Davis',
      lastMessage: 'Have you heard the new album?',
      time: '3h ago',
      unreadCount: 1,
      avatar: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      isOnline: false,
    },
    {
      id: 4,
      name: 'Alex Thompson',
      lastMessage: 'Thanks for the playlist!',
      time: 'Yesterday',
      avatar: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      isOnline: true,
    },
    {
      id: 5,
      name: 'Lisa Park',
      lastMessage: 'See you at the show! 🎸',
      time: '2d ago',
      avatar: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
      isOnline: false,
    },
  ]);

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const currentConversation = conversations.find((c) => c.id === activeChat);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [messages, activeChat]);

  // Auto-resize textarea
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

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const newMessage: Message = {
        id: messages.length + 1,
        text: messageInput,
        time: timeStr,
        sent: true,
      };

      setMessages([...messages, newMessage]);
      setMessageInput('');
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openChat = (id: number) => {
    setActiveChat(id);
  };

  const closeChat = () => {
    setActiveChat(null);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery) ||
    conv.lastMessage.toLowerCase().includes(searchQuery)
  );

  const handleNavigation = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/homefeed');
        break;
      case 'search':
        navigate('/discover');
        break;
      case 'add':
        navigate('/add-music');
        break;
      case 'messages':
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const playSharedMusic = () => {
    navigate('/play-music');
  };

  const newMessage = () => {
    console.log('New message');
  };

  const audioCall = () => {
    console.log('Starting audio call...');
  };

  const videoCall = () => {
    console.log('Starting video call...');
  };

  const chatInfo = () => {
    console.log('Opening chat info...');
  };

  const attachMusic = () => {
    console.log('Attach music');
  };

  const attachImage = () => {
    console.log('Attach image');
  };

  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div className="header-banner">
        <div className="header-left">
          {activeChat && (
            <div className="back-button" onClick={closeChat}>
              ←
            </div>
          )}
          <div className="header-title">
            {activeChat ? currentConversation?.name : 'Messages'}
          </div>
        </div>
        <button className="new-message-button" onClick={newMessage}>
          ✏️
        </button>
      </div>

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
                  onChange={handleSearch}
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="conversations-list">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${
                      conversation.unreadCount ? 'unread' : ''
                    }`}
                    onClick={() => openChat(conversation.id)}
                  >
                    <div
                      className="avatar"
                      style={{ background: conversation.avatar }}
                    >
                      {conversation.isOnline && (
                        <div className="online-indicator"></div>
                      )}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <span className="conversation-name">
                          {conversation.name}
                        </span>
                        <span className="conversation-time">
                          {conversation.time}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <span className="last-message">
                          {conversation.lastMessage}
                        </span>
                        {conversation.unreadCount && (
                          <span className="unread-badge">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <div className="empty-text">No conversations found</div>
                  <div className="empty-subtext">
                    Start a new conversation to begin chatting
                  </div>
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
                style={{ background: currentConversation?.avatar }}
              ></div>
              <div className="chat-user-info">
                <div className="chat-user-name">
                  {currentConversation?.name}
                </div>
                <div className="chat-user-status">
                  {currentConversation?.isOnline ? 'Active now' : 'Offline'}
                </div>
              </div>
              <div className="chat-actions">
                <button className="chat-action-button" onClick={audioCall}>
                  📞
                </button>
                <button className="chat-action-button" onClick={videoCall}>
                  📹
                </button>
                <button className="chat-action-button" onClick={chatInfo}>
                  ℹ️
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area" ref={messagesAreaRef}>
              <div className="date-separator">Today</div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.sent ? 'sent' : ''}`}
                >
                  <div className="message-avatar"></div>
                  <div className="message-content">
                    <div className="message-bubble">
                      {message.isMusic ? (
                        <div
                          className="music-share"
                          onClick={playSharedMusic}
                        >
                          <div className="music-share-art">🎸</div>
                          <div className="music-share-info">
                            <div className="music-share-title">
                              {message.musicTitle}
                            </div>
                            <div className="music-share-artist">
                              {message.musicArtist}
                            </div>
                          </div>
                          <div className="play-icon">▶️</div>
                        </div>
                      ) : (
                        <div className="message-text">{message.text}</div>
                      )}
                    </div>
                    <div className="message-time">{message.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <div className="message-input-wrapper">
                <div className="input-actions">
                  <button
                    className="input-action-button"
                    onClick={attachMusic}
                  >
                    🎵
                  </button>
                  <button
                    className="input-action-button"
                    onClick={attachImage}
                  >
                    📷
                  </button>
                </div>
                <textarea
                  ref={messageInputRef}
                  className="message-input"
                  placeholder="Type a message..."
                  rows={1}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                />
                <button
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
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
          <div
            className="nav-item"
            onClick={() => handleNavigation('home')}
            title="Home"
          >
            <div className="nav-icon">🏠</div>
          </div>
          <div
            className="nav-item"
            onClick={() => handleNavigation('search')}
            title="Discover"
          >
            <div className="nav-icon">🔍</div>
          </div>
          <div
            className="nav-item"
            onClick={() => handleNavigation('add')}
            title="Add Music"
          >
            <div className="nav-icon">➕</div>
          </div>
          <div
            className="nav-item active"
            onClick={() => handleNavigation('messages')}
            title="Messages"
          >
            <div className="nav-icon">💬</div>
          </div>
          <div
            className="nav-item"
            onClick={() => handleNavigation('profile')}
            title="Profile"
          >
            <div className="nav-icon">👤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
