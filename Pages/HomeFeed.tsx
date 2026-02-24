import { useState } from 'react';
import './HomeFeed.css';

interface MusicPost {
  id: number;
  userName: string;
  postTime: string;
  trackTitle: string;
  trackArtist: string;
  albumIcon: string;
  likes: number;
  comments: number;
  liked: boolean;
}

export default function HomeFeed() {
  const [posts, setPosts] = useState<MusicPost[]>([
    {
      id: 1,
      userName: 'Sarah Johnson',
      postTime: '2 hours ago',
      trackTitle: 'Bohemian Rhapsody',
      trackArtist: 'Queen',
      albumIcon: '🎸',
      likes: 234,
      comments: 12,
      liked: false,
    },
    {
      id: 2,
      userName: 'Mike Chen',
      postTime: '5 hours ago',
      trackTitle: 'Blinding Lights',
      trackArtist: 'The Weeknd',
      albumIcon: '🎹',
      likes: 412,
      comments: 28,
      liked: true,
    },
    {
      id: 3,
      userName: 'Emma Davis',
      postTime: '8 hours ago',
      trackTitle: 'Levitating',
      trackArtist: 'Dua Lipa',
      albumIcon: '🎤',
      likes: 156,
      comments: 8,
      liked: false,
    },
  ]);

  const toggleLike = (postId: number) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          };
        }
        return post;
      })
    );
  };

  const playMusic = () => {
    console.log('Playing music...');
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
        window.location.href = '/profile';
        break;
    }
  };

  return (
    <div className="homefeed-page">
      <div className="homefeed-wrapper">
        {/* Top Header */}
        <div className="feed-header">
          <div className="header-logo">COZIE</div>
          <div className="notification-icon">🔔</div>
        </div>

        {/* Posts Container */}
        <div className="feed-content">
          {posts.map((post) => (
            <div key={post.id} className="music-post">
              <div className="post-header">
                <div className="user-info">
                  <div className="user-avatar">
                    <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', width: '100%', height: '100%', borderRadius: '50%' }}></div>
                  </div>
                  <div className="user-details">
                    <div className="user-name">{post.userName}</div>
                    <div className="post-time">{post.postTime}</div>
                  </div>
                </div>
                <div className="post-menu">⋯</div>
              </div>

              <div className="album-art" onClick={playMusic}>
                <div className="album-icon">{post.albumIcon}</div>
              </div>

              <div className="track-info">
                <div className="track-title">{post.trackTitle}</div>
                <div className="track-artist">{post.trackArtist}</div>
              </div>

              <div className="action-bar">
                <button
                  className={`action-button ${post.liked ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                >
                  <span className="action-icon">💜</span>
                  <span>{post.likes}</span>
                </button>
                <button className="action-button">
                  <span className="action-icon">💬</span>
                  <span>{post.comments}</span>
                </button>
                <button className="action-button">
                  <span className="action-icon">📤</span>
                  <span>Share</span>
                </button>
                <button className="action-button">
                  <span className="action-icon">➕</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-container">
          <div
            className={`nav-item active`}
            onClick={() => navigate('home')}
          >
            <div className="nav-icon">🏠</div>
          </div>
          <div
            className={`nav-item`}
            onClick={() => navigate('search')}
          >
            <div className="nav-icon">🔍</div>
          </div>
          <div
            className={`nav-item`}
            onClick={() => navigate('add')}
          >
            <div className="nav-icon">➕</div>
          </div>
          <div
            className={`nav-item`}
            onClick={() => navigate('messages')}
          >
            <div className="nav-icon">💬</div>
          </div>
          <div
            className={`nav-item`}
            onClick={() => navigate('profile')}
          >
            <div className="nav-icon">👤</div>
          </div>
        </div>
      </div>
    </div>
  );
}
