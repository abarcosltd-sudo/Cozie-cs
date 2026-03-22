import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, updateDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import './messages.css';

interface User {
  id: string;
  fullname: string;
  username: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
}

interface Message {
  id: string;
  text: string;
  time: Date;
  sent: boolean;
  isMusic?: boolean;
  musicId?: string;
  musicTitle?: string;
  musicArtist?: string;
  musicArtUrl?: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        const res = await fetch('https://cozie-kohl.vercel.app/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, [navigate]);

  // Fetch conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.id),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherParticipant = data.participants.find((p: string) => p !== currentUser.id);
        
        convos.push({
          id: doc.id,
          userId: otherParticipant,
          userName: data.userNames?.[otherParticipant] || 'User',
          userAvatar: data.userAvatars?.[otherParticipant],
          lastMessage: data.lastMessage || '',
          lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
          unreadCount: data.unreadCount?.[currentUser.id] || 0,
          isOnline: data.userStatus?.[otherParticipant]?.online || false,
        });
      });
      setConversations(convos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const q = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      orderBy('time', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text || '',
          time: data.time?.toDate() || new Date(),
          sent: data.senderId === currentUser?.id,
          isMusic: data.isMusic || false,
          musicId: data.musicId,
          musicTitle: data.musicTitle,
          musicArtist: data.musicArtist,
          musicArtUrl: data.musicArtUrl,
        });
      });
      setMessages(msgs);
      
      // Mark messages as read
      if (activeConversation.unreadCount > 0) {
        const conversationRef = doc(db, 'conversations', activeConversation.id);
        updateDoc(conversationRef, {
          [`unreadCount.${currentUser?.id}`]: 0
        });
      }
    });

    return () => unsubscribe();
  }, [activeConversation, currentUser]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch available users for new conversation
  const fetchAvailableUsers = async () => {
    if (!currentUser) return;
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '!=', currentUser.id), limit(50));
      const snapshot = await getDocs(q);
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          fullname: data.fullname || data.displayName,
          username: data.username,
          photoURL: data.photoURL,
        });
      });
      setUsers(usersList);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Start a new conversation
  const startConversation = async (user: User) => {
    if (!currentUser) return;

    // Check if conversation already exists
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.id)
    );
    
    const snapshot = await getDocs(q);
    let existingConversation = null;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants.includes(user.id)) {
        existingConversation = { id: doc.id, ...data };
      }
    });

    if (existingConversation) {
      setActiveConversation({
        id: existingConversation.id,
        userId: user.id,
        userName: user.fullname,
        userAvatar: user.photoURL,
        lastMessage: existingConversation.lastMessage,
        lastMessageTime: existingConversation.lastMessageTime?.toDate(),
        unreadCount: 0,
        isOnline: false,
      });
    } else {
      // Create new conversation
      const conversationRef = await addDoc(collection(db, 'conversations'), {
        participants: [currentUser.id, user.id],
        userNames: {
          [currentUser.id]: currentUser.fullname || currentUser.displayName,
          [user.id]: user.fullname || user.username,
        },
        userAvatars: {
          [currentUser.id]: currentUser.photoURL,
          [user.id]: user.photoURL,
        },
        userStatus: {
          [currentUser.id]: { online: true },
          [user.id]: { online: false },
        },
        unreadCount: {
          [currentUser.id]: 0,
          [user.id]: 0,
        },
        createdAt: new Date(),
        lastMessage: '',
        lastMessageTime: new Date(),
      });
      
      setActiveConversation({
        id: conversationRef.id,
        userId: user.id,
        userName: user.fullname,
        userAvatar: user.photoURL,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0,
        isOnline: false,
      });
    }
    
    setShowUserModal(false);
  };

  // Send a message
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation || !currentUser) return;

    const messageData = {
      text: messageInput.trim(),
      time: new Date(),
      senderId: currentUser.id,
      read: false,
    };

    try {
      // Add message to subcollection
      const messagesRef = collection(db, 'conversations', activeConversation.id, 'messages');
      await addDoc(messagesRef, messageData);

      // Update conversation last message
      const conversationRef = doc(db, 'conversations', activeConversation.id);
      await updateDoc(conversationRef, {
        lastMessage: messageInput.trim(),
        lastMessageTime: new Date(),
        [`unreadCount.${activeConversation.userId}`]: activeConversation.unreadCount + 1,
      });

      setMessageInput('');
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Share music from message
  const shareMusic = (musicId: string, title: string, artist: string, artUrl?: string) => {
    // This would be used to send a music share message
    // You can implement a modal to select a song to share
    console.log('Share music:', musicId);
  };

  // Handle music share click
  const playSharedMusic = (musicId?: string) => {
    navigate('/play-music');
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery)
  );

  const filteredUsers = users.filter((user) =>
    user.fullname?.toLowerCase().includes(searchQuery) ||
    user.username?.toLowerCase().includes(searchQuery)
  );

  const handleNavigation = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/home-feed');
        break;
      case 'search':
        navigate('/discover');
        break;
      case 'add':
        navigate('/share-music');
        break;
      case 'messages':
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

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
          {activeConversation && (
            <div className="back-button" onClick={() => setActiveConversation(null)}>
              ←
            </div>
          )}
          <div className="header-title">
            {activeConversation ? activeConversation.userName : 'Messages'}
          </div>
        </div>
        <button className="new-message-button" onClick={fetchAvailableUsers}>
          ✏️
        </button>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {!activeConversation && (
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
                    className={`conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => setActiveConversation(conversation)}
                  >
                    <div className="avatar" style={{ 
                      background: conversation.userAvatar ? 'none' : 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                      backgroundImage: conversation.userAvatar ? `url(${conversation.userAvatar})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      {conversation.isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <span className="conversation-name">{conversation.userName}</span>
                        <span className="conversation-time">
                          {formatMessageTime(conversation.lastMessageTime)}
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
                  <div className="empty-subtext">
                    Click the ✏️ icon to start a new conversation
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeConversation && (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-avatar" style={{
                background: activeConversation.userAvatar ? `url(${activeConversation.userAvatar})` : 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}></div>
              <div className="chat-user-info">
                <div className="chat-user-name">{activeConversation.userName}</div>
                <div className="chat-user-status">
                  {activeConversation.isOnline ? 'Active now' : 'Offline'}
                </div>
              </div>
              <div className="chat-actions">
                <button className="chat-action-button" onClick={() => console.log('Audio call')}>
                  📞
                </button>
                <button className="chat-action-button" onClick={() => console.log('Video call')}>
                  📹
                </button>
                <button className="chat-action-button" onClick={() => console.log('Info')}>
                  ℹ️
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area" ref={messagesAreaRef}>
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <div className="empty-icon">💬</div>
                  <div className="empty-text">No messages yet</div>
                  <div className="empty-subtext">Send a message to start the conversation</div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`message ${message.sent ? 'sent' : 'received'}`}>
                    <div className="message-avatar"></div>
                    <div className="message-content">
                      <div className="message-bubble">
                        {message.isMusic ? (
                          <div className="music-share" onClick={() => playSharedMusic(message.musicId)}>
                            <div className="music-share-art">
                              {message.musicArtUrl ? (
                                <img src={message.musicArtUrl} alt={message.musicTitle} />
                              ) : (
                                <div>🎸</div>
                              )}
                            </div>
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
                      <div className="message-time">{formatMessageTime(message.time)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <div className="message-input-wrapper">
                <div className="input-actions">
                  <button className="input-action-button" onClick={() => shareMusic('', '', '')}>
                    🎵
                  </button>
                  <button className="input-action-button" onClick={() => console.log('Attach image')}>
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
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="close-modal" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="modal-search">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>
            <div className="users-list">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="user-item" onClick={() => startConversation(user)}>
                    <div className="user-avatar" style={{
                      background: user.photoURL ? `url(${user.photoURL})` : 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}></div>
                    <div className="user-info">
                      <div className="user-name">{user.fullname}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-text">No users found</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-container">
          <div className="nav-item" onClick={() => handleNavigation('home')}>
            <div className="nav-icon">🏠</div>
          </div>
          <div className="nav-item" onClick={() => handleNavigation('search')}>
            <div className="nav-icon">🔍</div>
          </div>
          <div className="nav-item" onClick={() => handleNavigation('add')}>
            <div className="nav-icon">➕</div>
          </div>
          <div className="nav-item active" onClick={() => handleNavigation('messages')}>
            <div className="nav-icon">💬</div>
          </div>
          <div className="nav-item" onClick={() => handleNavigation('profile')}>
            <div className="nav-icon">👤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
