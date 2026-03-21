import { useState, useEffect } from 'react';
import './HomeFeed.css';

interface MusicPost {
  id: string;
  userName: string;
  userAvatarUrl?: string; 
  postTime: string; 
  trackTitle: string;
  trackArtist: string;
  caption?: string;
  albumIcon?: string; 
  albumArtUrl?: string; 
  likes: number;
  comments: number;
  liked: boolean;
}

export default function HomeFeed() {
  const [posts, setPosts] = useState<MusicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null); // postId
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await fetch('https://cozie-kohl.vercel.app/api/posts/feed', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch feed');
        }

        const data = await res.json();
        console.log(data)

        // Transform backend data to match our interface
        const formattedPosts = data.posts.map((post: any) => ({
          id: post.id,
          userName: post.userName || 'Unknown User',
          userAvatarUrl: post.userAvatarUrl,
          postTime: formatTime(post.createdAt), // implement formatTime
          trackTitle: post.songSnapshot?.title || 'Untitled',
          trackArtist: post.songSnapshot?.artist || 'Unknown Artist',
          caption: post.caption || '', 
          albumIcon: '🎵', // fallback emoji
          albumArtUrl: post.songSnapshot?.albumArtUrl || null,
          likes: post.likes || 0,
          comments: post.comments || 0,
          liked: post.likedByUser || false,
        }));

        setPosts(formattedPosts);
      } catch (err: any) {
        console.error('Error loading feed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  // Helper to format timestamp (e.g., "2 hours ago")
  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const past = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(past.getTime())) return 'Just now';
    
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
  
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const toggleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );

    try {
      const token = localStorage.getItem('token');
      await fetch(`https://cozie-kohl.vercel.app/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Like failed, reverting...');
      // Revert on error
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? {
                ...post,
                liked: !post.liked,
                likes: post.liked ? post.likes + 1 : post.likes - 1,
              }
            : post
        )
      );
    }
  };

  const playMusic = (songId: string) => {
    console.log('Playing music from post:', songId);
    // could open player or navigate to song page
  };

  const addComment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://cozie-kohl.vercel.app/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: commentText })
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const data = await res.json();
      // Update comment count with server response
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: data.commentCount } : p));
      setCommentText('');
      setShowCommentInput(null);
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment');
    }
  };

  const navigate = (page: string) => {
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

  if (loading) {
    return (
      <div className="homefeed-page">
        <div className="feed-header">
          <div className="header-logo">COOZIE</div>
          <div className="notification-icon">🔔</div>
        </div>
        <div className="feed-content loading">Loading feed...</div>
        <BottomNav navigate={navigate} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="homefeed-page">
        <div className="feed-header">
          <div className="header-logo">COOZIE</div>
          <div className="notification-icon">🔔</div>
        </div>
        <div className="feed-content error">Error: {error}</div>
        <BottomNav navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="homefeed-page">
      <div className="homefeed-wrapper">
        {/* Top Header */}
        <div className="feed-header">
          <div className="header-logo">COOZIE</div>
          <div className="notification-icon">🔔</div>
        </div>

        
      {/* Bottom Navigation */}
      <BottomNav navigate={navigate} />
    </div>
  );
}

// BottomNav component extracted for reuse
function BottomNav({ navigate }: { navigate: (page: string) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-container">
        <div className="nav-item active" onClick={() => navigate('home')}>
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
        <div className="nav-item" onClick={() => navigate('profile')}>
          <div className="nav-icon">👤</div>
        </div>
      </div>
    </div>
  );
}
