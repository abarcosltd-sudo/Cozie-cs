import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './sharemusic.css';

interface Song {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string; // URL to album art image
}

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
}

export default function ShareMusic() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['feed']));
  const [isLoading, setIsLoading] = useState(false);

  const platforms: SharePlatform[] = [
    { id: 'feed', name: 'Feed', icon: '🏠' },
    { id: 'story', name: 'Story', icon: '📖' },
    { id: 'groups', name: 'Groups', icon: '👥' }
  ];

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(
        `https://cozie-kohl.vercel.app/api/music/search?q=${encodeURIComponent(query)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.songs || []);
    } catch (error) {
      console.error('Search error:', error);
      // Optionally show error to user
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
  };

  const togglePlatform = (platformId: string) => {
    const newSelected = new Set(selectedPlatforms);
    if (newSelected.has(platformId)) {
      newSelected.delete(platformId);
    } else {
      newSelected.add(platformId);
    }
    setSelectedPlatforms(newSelected);
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handlePost = async () => {
    if (!selectedSong) {
      alert('Please select a song');
      return;
    }

    if (selectedPlatforms.size === 0) {
      alert('Please select at least one platform to share to');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('https://cozie-kohl.vercel.app/api/posts/share-music', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: selectedSong.id,
          caption: caption.trim(),
          platforms: Array.from(selectedPlatforms),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to share music');
      }

      // Success – navigate to feed
      navigate('/homefeed');
    } catch (error: any) {
      alert(`Error sharing music: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if we should show search results
  const showSearchResults = searchQuery.trim().length > 0 && !selectedSong;

  return (
    <div className="sharemusic-overlay">
      <div className="sharemusic-modal">
        {/* Header */}
        <div className="sharemusic-header">
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
          <h2 className="sharemusic-title">Share Music</h2>
          <button
            className="post-button"
            onClick={handlePost}
            disabled={isLoading || !selectedSong || selectedPlatforms.size === 0}
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Search Song */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search for a song..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="song-search-input"
            />
            {isSearching && <span className="search-spinner">⏳</span>}
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="search-results">
              {searchResults.length === 0 && !isSearching && (
                <div className="no-results">No songs found</div>
              )}
              {searchResults.map(song => (
                <div
                  key={song.id}
                  className="search-result-item"
                  onClick={() => handleSelectSong(song)}
                >
                  <div className="song-thumbnail">
                    {song.albumArtUrl ? (
                      <img src={song.albumArtUrl} alt={song.title} className="thumbnail-image" />
                    ) : (
                      <span>♪</span>
                    )}
                  </div>
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Song Card */}
        {selectedSong && !showSearchResults && (
          <div className="selected-song-card">
            <div className="song-album-art">
              {selectedSong.albumArtUrl ? (
                <img src={selectedSong.albumArtUrl} alt={selectedSong.title} className="album-image" />
              ) : (
                <div className="album-placeholder">♪</div>
              )}
            </div>
            <div className="song-details">
              <div className="selected-song-title">{selectedSong.title}</div>
              <div className="selected-song-artist">{selectedSong.artist}</div>
            </div>
          </div>
        )}

        {/* Caption Input */}
        <textarea
          placeholder="Add a caption... (Optional)"
          value={caption}
          onChange={handleCaptionChange}
          className="caption-input"
          maxLength={300}
        />

        {/* Share To Section */}
        <div className="share-to-section">
          <label className="share-to-label">SHARE TO</label>
          <div className="platform-buttons">
            {platforms.map(platform => (
              <button
                key={platform.id}
                className={`platform-button ${selectedPlatforms.has(platform.id) ? 'active' : ''}`}
                onClick={() => togglePlatform(platform.id)}
              >
                <div className="platform-icon">{platform.icon}</div>
                <div className="platform-name">{platform.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
