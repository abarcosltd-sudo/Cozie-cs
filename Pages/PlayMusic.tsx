import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './playmusic.css';

interface QueueItem {
  id: number;
  title: string;
  artist: string;
  duration: string;
  gradient: string;
}

export default function PlayMusic() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [currentTime, setCurrentTime] = useState(125); // 2:05 in seconds
  const [totalTime] = useState(355); // 5:55 in seconds
  const [volume, setVolume] = useState(70);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queueItems: QueueItem[] = [
    {
      id: 1,
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      duration: '5:55',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    },
    {
      id: 2,
      title: "Don't Stop Me Now",
      artist: 'Queen',
      duration: '3:29',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
    {
      id: 3,
      title: 'We Will Rock You',
      artist: 'Queen',
      duration: '2:02',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    },
    {
      id: 4,
      title: 'Somebody to Love',
      artist: 'Queen',
      duration: '4:56',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
    {
      id: 5,
      title: 'Under Pressure',
      artist: 'Queen & David Bowie',
      duration: '4:08',
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    },
  ];

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Handle play/pause and progress update
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev < totalTime) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1000);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, totalTime]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const previousTrack = () => {
    console.log('Previous track');
  };

  const nextTrack = () => {
    console.log('Next track');
  };

  const rewind15 = () => {
    setCurrentTime(Math.max(0, currentTime - 15));
  };

  const forward15 = () => {
    setCurrentTime(Math.min(totalTime, currentTime + 15));
  };

  const seekTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    setCurrentTime(Math.floor(totalTime * percentage));
  };

  const adjustVolume = (event: React.MouseEvent<HTMLDivElement>) => {
    const volumeSlider = event.currentTarget;
    const rect = volumeSlider.getBoundingClientRect();
    const percentage = Math.max(
      0,
      Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
    );
    setVolume(Math.floor(percentage));
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = () => {
    const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const toggleLyrics = () => {
    setIsLyricsVisible(!isLyricsVisible);
  };

  const playQueueItem = (index: number) => {
    console.log('Playing queue item:', index);
  };

  const addToPlaylist = () => {
    console.log('Add to playlist');
  };

  const shareTrack = () => {
    console.log('Share track');
  };

  const goBack = () => {
    navigate(-1);
  };

  const openMenu = () => {
    console.log('Opening menu...');
  };

  const handleNavigation = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/home-feed');
        break;
      case 'search':
        navigate('/discover');
        break;
      case 'playing':
        break;
      case 'messages':
        navigate('/messages');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / totalTime) * 100;

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <div className="header-bar">
        <div className="back-button" onClick={goBack}>
          ←
        </div>
        <div className="header-title">Now Playing</div>
        <div className="menu-button" onClick={openMenu}>
          ⋯
        </div>
      </div>

      {/* Player Container */}
      <div className="player-container">
        {/* Album Art Section */}
        <div className="album-art-section">
          <div className="album-art-wrapper">
            <div
              className={`album-art ${isPlaying ? 'playing' : ''}`}
              id="albumArt"
            >
              🎸
            </div>
            <div
              className={`favorite-button ${isFavorited ? 'liked' : ''}`}
              onClick={toggleFavorite}
            >
              {isFavorited ? '♥' : '♡'}
            </div>
          </div>
        </div>

        {/* Track Info */}
        <div className="track-info">
          <h1 className="track-title">Bohemian Rhapsody</h1>
          <p className="track-artist">Queen</p>
          <div className="track-metadata">
            <span className="metadata-item">Rock</span>
            <span className="metadata-item">1975</span>
            <span className="metadata-item">5:55</span>
          </div>
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
            <span>{formatTime(totalTime)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="controls-section">
          <div className="main-controls">
            <button className="control-button" onClick={previousTrack}>
              ⏮
            </button>
            <button className="control-button" onClick={rewind15}>
              ⏪
            </button>
            <button
              className="control-button play-button"
              onClick={togglePlay}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="control-button" onClick={forward15}>
              ⏩
            </button>
            <button className="control-button" onClick={nextTrack}>
              ⏭
            </button>
          </div>

          <div className="secondary-controls">
            <button
              className={`secondary-button ${isShuffle ? 'active' : ''}`}
              onClick={toggleShuffle}
            >
              🔀
            </button>
            <button
              className={`secondary-button ${repeatMode !== 'off' ? 'active' : ''}`}
              onClick={toggleRepeat}
            >
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>
            <button className="secondary-button" onClick={addToPlaylist}>
              ➕
            </button>
            <button className="secondary-button" onClick={shareTrack}>
              📤
            </button>
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
            <div className="queue-count">{queueItems.length} songs</div>
          </div>
          <div className="queue-list">
            {queueItems.map((item, index) => (
              <div
                key={item.id}
                className={`queue-item ${index === 0 ? 'playing' : ''}`}
                onClick={() => playQueueItem(index + 1)}
              >
                <div className="queue-number">{index + 1}</div>
                <div
                  className="queue-album-art"
                  style={{ background: item.gradient }}
                ></div>
                <div className="queue-info">
                  <div className="queue-track-title">{item.title}</div>
                  <div className="queue-track-artist">{item.artist}</div>
                </div>
                <div className="queue-duration">{item.duration}</div>
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
              <div className="lyrics-line">Is this the real life?</div>
              <div className="lyrics-line">Is this just fantasy?</div>
              <div className="lyrics-line active">Caught in a landside</div>
              <div className="lyrics-line">No escape from reality</div>
              <div className="lyrics-line">Open your eyes</div>
              <div className="lyrics-line">Look up to the skies and see</div>
              <div className="lyrics-line">
                I'm just a poor boy, I need no sympathy
              </div>
              <div className="lyrics-line">
                Because I'm easy come, easy go
              </div>
              <div className="lyrics-line">Little high, little low</div>
              <div className="lyrics-line">
                Any way the wind blows doesn't really matter to me
              </div>
              <div className="lyrics-line">To me...</div>
            </div>
          )}
        </div>
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
            className="nav-item active"
            onClick={() => handleNavigation('playing')}
            title="Now Playing"
          >
            <div className="nav-icon">🎵</div>
          </div>
          <div
            className="nav-item"
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
