import { useState, useRef, useEffect } from 'react';
import './UserProfile.css';

interface GridPost {
  id: number;
  gradient: string;
}

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('posts');
  const [displayName, setDisplayName] = useState('Alex Thompson');
  const [username, setUsername] = useState('@alexthompson');
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [emptyStateMessage, setEmptyStateMessage] = useState('No content yet');
  const [emptyStateSubtext, setEmptyStateSubtext] = useState('Start sharing your music!');

  const gridPosts: GridPost[] = [
    { id: 1, gradient: 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)' },
    { id: 2, gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
    { id: 3, gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
    { id: 4, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' },
    { id: 5, gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
    { id: 6, gradient: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)' },
    { id: 7, gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' },
    { id: 8, gradient: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)' },
    { id: 9, gradient: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' },
  ];

  useEffect(() => {
    // Try to load saved profile data
    const savedProfile = sessionStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        if (profile.displayName) setDisplayName(profile.displayName);
        if (profile.username) setUsername('@' + profile.username);
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
  }, []);

  const handleSwitchTab = (tabName: string) => {
    setActiveTab(tabName);

    if (tabName === 'posts') {
      setShowEmptyState(false);
    } else if (tabName === 'playlists') {
      setShowEmptyState(true);
      setEmptyStateMessage('No playlists yet');
      setEmptyStateSubtext('Create your first playlist!');
    } else if (tabName === 'liked') {
      setShowEmptyState(false);
    }
  };

  const handleEditProfile = () => {
    console.log('Opening edit profile...');
    window.location.href = '/edit-profile';
  };

  const handleChangeProfilePhoto = () => {
    console.log('Changing profile photo...');
  };

  const handleShowFollowers = () => {
    console.log('Showing followers...');
    window.location.href = '/followers';
  };

  const handleShowFollowing = () => {
    console.log('Showing following...');
    window.location.href = '/following';
  };

  const handleOpenSettings = () => {
    console.log('Opening settings...');
    window.location.href = '/settings';
  };

  const handleOpenPost = (postId: number) => {
    console.log('Opening post:', postId);
  };

  const navigate = (page: string) => {
    console.log('Navigating to:', page);
    switch (page) {
      case 'home':
        window.location.href = '/home-feed';
        break;
      case 'search':
        window.location.href = '/discover';
        break;
      case 'add':
        window.location.href = '/share-music';
        break;
      case 'messages':
        window.location.href = '/messages';
        break;
      case 'profile':
        // Already on profile
        break;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Profile Container */}
      <div className="profile-container">
        {/* Settings Button */}
        <div className="settings-button" onClick={handleOpenSettings}>
          ⚙️
        </div>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar" onClick={handleChangeProfilePhoto}></div>
          <h1 className="profile-name">{displayName}</h1>
          <p className="profile-username">{username}</p>

          {/* Stats Section */}
          <div className="stats-section">
            <div className="stat-item" onClick={handleShowFollowers}>
              <div className="stat-number">1,234</div>
              <div className="stat-label">Followers</div>
            </div>
            <div className="stat-item" onClick={handleShowFollowing}>
              <div className="stat-number">567</div>
              <div className="stat-label">Following</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">89</div>
              <div className="stat-label">Posts</div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button className="edit-profile-button" onClick={handleEditProfile}>
            Edit Profile
          </button>
        </div>

        {/* Tabs Section */}
        <div className="tabs-section">
          <div
            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('posts')}
          >
            Posts
          </div>
          <div
            className={`tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('playlists')}
          >
            Playlists
          </div>
          <div
            className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => handleSwitchTab('liked')}
          >
            Liked
          </div>
        </div>

        {/* Content Grid */}
        {!showEmptyState && (
          <div className="content-grid">
            {gridPosts.map((post) => (
              <div
                key={post.id}
                className="grid-item"
                style={{ background: post.gradient }}
                onClick={() => handleOpenPost(post.id)}
              ></div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {showEmptyState && (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <div className="empty-text">{emptyStateMessage}</div>
            <div className="empty-subtext">{emptyStateSubtext}</div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-container">
          <div className="nav-item" onClick={() => navigate('home')}>
            <div className="nav-icon">🏠</div>
          </div>
          <div className="nav-item" onClick={() => navigate('search')}>
            <div className="nav-icon">🔍</div>
          </div>
          <div className="nav-item" onClick={() => navigate('add')}>
            <div className="nav-icon">➕</div>
          </div>
          <div className="nav-item" onClick={() => navigate('messages')}>
            <div className="nav-icon">💬</div>
          </div>
          <div className="nav-item active" onClick={() => navigate('profile')}>
            <div className="nav-icon">👤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
