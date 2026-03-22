import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './playmusic.css';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
  fileUrl?: string;
  duration?: number;
  genre?: string;
  releaseYear?: string;
  likeCount?: number;
  liked?: boolean;
}

export default function PlayMusic() {
  const navigate = useNavigate();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get song from navigation state or URL params
  const songFromState = location.state as MusicTrack;

  // Fetch queue and current track
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch trending songs for queue
        const res = await fetch('https://cozie-kohl.vercel.app/api/music/trending', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to fetch queue');

        const data = await res.json();
        const tracks: MusicTrack[] = data.trending || [];

        // Set queue
        setQueue(tracks);

        // Set current track (from navigation or first in queue)
        if (songFromState && songFromState.id) {
          setCurrentTrack(songFromState);
          setCurrentIndex(tracks.findIndex(t => t.id === songFromState.id));
        } else if (tracks.length > 0) {
          setCurrentTrack(tracks[0]);
          setCurrentIndex(0);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching queue:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchQueue();
  }, [songFromState]);

  // Check if current track is favorited
  useEffect(() => {
    const checkFavorite = async () => {
      if (!currentTrack) return;
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`https://cozie-kohl.vercel.app/api/users/favorites/${currentTrack.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(data.isFavorited);
        }
      } catch (err) {
        console.error('Error checking favorite:', err);
      }
    };
    
    checkFavorite();
  }, [currentTrack]);

  // Audio element setup
  useEffect(() => {
    if (!currentTrack?.fileUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = currentTrack.fileUrl;
      audioRef.current.load();
      
      if (isPlaying) {
        audioRef.current.play().catch(err => console.error('Playback failed:', err));
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentTrack]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      // Repeat current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      // Play next track
      playNext();
    }
  };

  // Playback controls
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    
    let newIndex;
    if (isShuffle) {
      newIndex = Math.floor(Math.random() * queue.length);
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    }
    
    setCurrentIndex(newIndex);
    setCurrentTrack(queue[newIndex]);
    setIsPlaying(true);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    let newIndex;
    if (repeatMode === 'all') {
      newIndex = (currentIndex + 1) % queue.length;
    } else if (isShuffle) {
      newIndex = Math.floor(Math.random() * queue.length);
    } else {
      newIndex = (currentIndex + 1) % queue.length;
    }
    
    setCurrentIndex(newIndex);
    setCurrentTrack(queue[newIndex]);
    setIsPlaying(true);
  };

  const rewind15 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15);
    }
  };

  const forward15 = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15);
    }
  };

  const seekTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percentage * duration;
    }
  };

  const adjustVolume = (event: React.MouseEvent<HTMLDivElement>) => {
    const volumeSlider = event.currentTarget;
    const rect = volumeSlider.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    setVolume(Math.floor(percentage));
    if (audioRef.current) {
      audioRef.current.volume = percentage / 100;
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleFavorite = async () => {
    if (!currentTrack) return;
    
    try {
      const token = localStorage.getItem('token');
      const method = isFavorited ? 'DELETE' : 'POST';
      
      const res = await fetch(`https://cozie-kohl.vercel.app/api/users/favorites/${currentTrack.id}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setIsFavorited(!isFavorited);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const toggleLike = async () => {
    if (!currentTrack) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://cozie-kohl.vercel.app/api/music/${currentTrack.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setCurrentTrack({ ...currentTrack, liked: data.liked, likeCount: data.likeCount });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const playQueueItem = (index: number) => {
    setCurrentIndex(index);
    setCurrentTrack(queue[index]);
    setIsPlaying(true);
  };

  const toggleLyrics = () => {
    setIsLyricsVisible(!isLyricsVisible);
  };

  const goBack = () => {
    navigate(-1);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">Loading...</div>
      </div>
    );
  }

  if (error || !currentTrack) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <p>Error: {error || 'No track available'}</p>
          <button onClick={goBack}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header Bar */}
      <div className="header-bar">
        <div className="back-button" onClick={goBack}>←</div>
        <div className="header-title">Now Playing</div>
        <div className="menu-button">⋯</div>
      </div>

      {/* Player Container */}
      <div className="player-container">
        {/* Album Art Section */}
        <div className="album-art-section">
          <div className="album-art-wrapper">
            <div className={`album-art ${isPlaying ? 'playing' : ''}`}>
              {currentTrack.albumArtUrl ? (
                <img src={currentTrack.albumArtUrl} alt={currentTrack.title} className="album-art-image" />
              ) : (
                <div className="album-placeholder">🎵</div>
              )}
            </div>
            <div className={`favorite-button ${isFavorited ? 'liked' : ''}`} onClick={toggleFavorite}>
              {isFavorited ? '♥' : '♡'}
            </div>
          </div>
        </div>

        {/* Track Info */}
        <div className="track-info">
          <h1 className="track-title">{currentTrack.title}</h1>
          <p className="track-artist">{currentTrack.artist}</p>
          <div className="track-metadata">
            <span className="metadata-item">{currentTrack.genre || 'Unknown'}</span>
            <span className="metadata-item">{currentTrack.releaseYear || 'N/A'}</span>
            <span className="metadata-item">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Like Button */}
        <div className="like-section">
          <button className={`like-button ${currentTrack.liked ? 'liked' : ''}`} onClick={toggleLike}>
            <span className="like-icon">❤️</span>
            <span className="like-count">{currentTrack.likeCount || 0}</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-bar" onClick={seekTo}>
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}>
              <div className="progress-handle"></div>
            </div>
          </div>
          <div className="time-labels">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="controls-section">
          <div className="main-controls">
            <button className="control-button" onClick={playPrevious}>⏮</button>
            <button className="control-button" onClick={rewind15}>⏪</button>
            <button className="control-button play-button" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="control-button" onClick={forward15}>⏩</button>
            <button className="control-button" onClick={playNext}>⏭</button>
          </div>

          <div className="secondary-controls">
            <button className={`secondary-button ${isShuffle ? 'active' : ''}`} onClick={toggleShuffle}>🔀</button>
            <button className={`secondary-button ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat}>
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>
            <button className="secondary-button">➕</button>
            <button className="secondary-button">📤</button>
          </div>
        </div>

        {/* Volume Control */}
        <div className="volume-section">
          <div className="volume-icon">🔊</div>
          <div className="volume-slider" onClick={adjustVolume}>
            <div className="volume-fill" style={{ width: `${volume}%` }}></div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="queue-section">
          <div className="queue-header">
            <div className="queue-title">Up Next</div>
            <div className="queue-count">{queue.length} songs</div>
          </div>
          <div className="queue-list">
            {queue.slice(currentIndex + 1, currentIndex + 11).map((track, idx) => (
              <div
                key={track.id}
                className="queue-item"
                onClick={() => playQueueItem(currentIndex + idx + 1)}
              >
                <div className="queue-number">{currentIndex + idx + 2}</div>
                <div className="queue-album-art">
                  {track.albumArtUrl ? (
                    <img src={track.albumArtUrl} alt={track.title} className="queue-album-image" />
                  ) : (
                    <div>🎵</div>
                  )}
                </div>
                <div className="queue-info">
                  <div className="queue-track-title">{track.title}</div>
                  <div className="queue-track-artist">{track.artist}</div>
                </div>
                <div className="queue-duration">{formatTime(track.duration || 0)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lyrics Section */}
        <div className="lyrics-section">
          <div className="lyrics-header">
            <div className="lyrics-title">Lyrics</div>
            <button className="lyrics-toggle" onClick={toggleLyrics}>
              {isLyricsVisible ? 'Hide' : 'Show'}
            </button>
          </div>
          {isLyricsVisible && (
            <div className="lyrics-content">
              <p className="lyrics-placeholder">Lyrics not available for this track</p>
            </div>
          )}
        </div>
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
          <div className="nav-item active">
            <div className="nav-icon">🎵</div>
          </div>
          <div className="nav-item" onClick={() => navigate('/messages')}>
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
