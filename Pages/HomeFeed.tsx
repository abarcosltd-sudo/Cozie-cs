import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  fileUrl?: string | null;
  likes: number;
  comments: number;
  liked: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  text: string;
  timestamp: string;
  createdAt: Date;
}

export default function HomeFeed() {
  const [posts, setPosts] = useState<MusicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  // Comments state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchFeed = async () => {
      try {
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

        const formattedPosts = data.posts.map((post: any) => ({
          id: post.id,
          userName: post.userName || 'Unknown User',
          userAvatarUrl: post.userAvatarUrl || null,
          postTime: formatTime(post.createdAt),
          trackTitle: post.songSnapshot?.title || 'Untitled',
          trackArtist: post.songSnapshot?.artist || 'Unknown Artist',
          caption: post.caption || '', 
          albumIcon: '🎵',
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

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const past = new Date(timestamp);
    
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

  const formatCommentTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  // Fetch comments for a post
  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`https://cozie-kohl.vercel.app/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch comments');
      }
      
      const data = await res.json();
      // Sort comments by newest first
      const sortedComments = (data.comments || []).sort((a: Comment, b: Comment) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setComments(sortedComments);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add a new comment
  const addComment = async () => {
    if (!commentText.trim() || !selectedPostId || submittingComment) return;
    
    setSubmittingComment(true);
    const newCommentText = commentText.trim();
    
    // Optimistic update - add comment locally first
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      userId: 'current-user',
      userName: 'You',
      userAvatarUrl: null,
      text: newCommentText,
      timestamp: 'Just now',
      createdAt: new Date(),
    };
    setComments(prev => [optimisticComment, ...prev]);
    setCommentText('');
    
    // Also update the comment count on the post optimistically
    setPosts(prev => prev.map(post => 
      post.id === selectedPostId 
        ? { ...post, comments: post.comments + 1 }
        : post
    ));
    
    try {
      const res = await fetch(`https://cozie-kohl.vercel.app/api/posts/${selectedPostId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newCommentText }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }
      
      const data = await res.json();
      
      // Replace optimistic comment with real one
      setComments(prev => prev.map(comment => 
        comment.id === optimisticComment.id 
          ? { ...data.comment, id: data.commentId, timestamp: 'Just now' }
          : comment
      ));
      
      // Scroll to top of comments
      setTimeout(() => {
        if (commentsEndRef.current) {
          commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } catch (err) {
      console.error('Error adding comment:', err);
      // Revert optimistic update
      setComments(prev => prev.filter(comment => comment.id !== optimisticComment.id));
      setPosts(prev => prev.map(post => 
        post.id === selectedPostId 
          ? { ...post, comments: post.comments - 1 }
          : post
      ));
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const openComments = (postId: string) => {
    setSelectedPostId(postId);
    setShowCommentsModal(true);
    fetchComments(postId);
  };

  const closeComments = () => {
    setShowCommentsModal(false);
    setSelectedPostId(null);
    setComments([]);
    setCommentText('');
  };

  const toggleLike = async (postId: string) => {
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
      await fetch(`https://cozie-kohl.vercel.app/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Like failed, reverting...');
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

  const playMusic = async (songId: string) => {
    console.log('Playing music from post:', songId);
    
    try {
      // Fetch song details from the API
      const token = localStorage.getItem('token');
      const res = await fetch(`https://cozie-kohl.vercel.app/api/music/${songId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const songData = await res.json();
        
        navigate('/play-music', {
          state: {
            currentSong: {
              id: songId,
              title: songData.title,
              artist: songData.artist,
              albumArtUrl: songData.albumArtUrl,
              fileUrl: songData.fileUrl,
              duration: songData.duration,
              genre: songData.genre,
              releaseYear: songData.releaseYear,
            }
          }
        });
      } else {
        // Fallback: use data from the post if available
        const post = posts.find(p => p.id === songId);
        navigate('/play-music', {
          state: {
            currentSong: {
              id: songId,
              title: post?.trackTitle || 'Unknown Title',
              artist: post?.trackArtist || 'Unknown Artist',
              albumArtUrl: post?.albumArtUrl || null,
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching song:', error);
      // Fallback navigation with available data
      const post = posts.find(p => p.id === songId);
      navigate('/play-music', {
        state: {
          currentSong: {
            id: songId,
            title: post?.trackTitle || 'Unknown Title',
            artist: post?.trackArtist || 'Unknown Artist',
            albumArtUrl: post?.albumArtUrl || null,
          }
        }
      });
    }
  };
  
  const navigateToPage = (page: string) => {
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
        navigate('/messages');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addComment();
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

        {/* Posts Container */}
        <div className="feed-content">
          {posts.length === 0 ? (
            <div className="no-posts">No posts yet – share some music!</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="music-post">
                <div className="post-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {post.userAvatarUrl ? (
                        <img src={post.userAvatarUrl} alt={post.userName} className="avatar-image" />
                      ) : (
                        <div className="avatar-placeholder" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}></div>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{post.userName}</div>
                      <div className="post-time">{post.postTime}</div>
                    </div>
                  </div>
                  <div className="post-menu">⋯</div>
                </div>

                <div className="album-art" onClick={() => playMusic(post.id)}>
                  {post.albumArtUrl ? (
                    <img src={post.albumArtUrl} alt={post.trackTitle} className="album-image" />
                  ) : (
                    <div className="album-icon">{post.albumIcon}</div>
                  )}
                </div>

                <div className="track-info">
                  <div className="track-title">{post.trackTitle}</div>
                  <div className="track-artist">{post.trackArtist}</div>
                </div>

                {post.caption && (
                  <div className="post-caption">{post.caption}</div>
                )}

                <div className="action-bar">
                  <button
                    className={`action-button ${post.liked ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    <span className="action-icon">💜</span>
                    <span>{post.likes}</span>
                  </button>
                  <button 
                    className="action-button"
                    onClick={() => openComments(post.id)}
                  >
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
            ))
          )}
        </div>
      </div>

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="comments-modal-overlay" onClick={closeComments}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comments-modal-header">
              <h3>Comments</h3>
              <button className="close-modal-btn" onClick={closeComments}>✕</button>
            </div>
            
            <div className="comments-list">
              {loadingComments ? (
                <div className="comments-loading">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="no-comments">No comments yet. Be the first to comment!</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.userAvatarUrl ? (
                        <img src={comment.userAvatarUrl} alt={comment.userName || 'User'} />
                      ) : (
                        <div className="comment-avatar-placeholder" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}>
                          {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    <div className="comment-content">
                      <div className="comment-header">
                        <span className="comment-user">{comment.userName}</span>
                        <span className="comment-time">{formatCommentTime(comment.createdAt)}</span>
                      </div>
                      <div className="comment-text">{comment.text}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
            
            <div className="comment-input-container">
              <textarea
                className="comment-textarea"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={3}
              />
              <button 
                className="comment-submit-btn"
                onClick={addComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav navigate={navigate} />
    </div>
  );
}

function BottomNav({ navigateToPage }: { navigateToPage: (page: string) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-container">
        <div className="nav-item active" onClick={() => navigateToPage('home')}>
          <div className="nav-icon">🏠</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('search')}>
          <div className="nav-icon">🔍</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('add')}>
          <div className="nav-icon">➕</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('messages')}>
          <div className="nav-icon">💬</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('profile')}>
          <div className="nav-icon">👤</div>
        </div>
      </div>
    </div>
  );
}
