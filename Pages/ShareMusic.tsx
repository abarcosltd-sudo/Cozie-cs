import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './sharemusic.css';

interface Song {
  id: number;
  title: string;
  artist: string;
  albumArt?: string;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
}

export default function ShareMusic() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>({
    id: 1,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    albumArt: '🎵'
  });
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['feed']));
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Mock song database
  const mockSongs: Song[] = [
    { id: 1, title: 'Blinding Lights', artist: 'The Weeknd' },
    { id: 2, title: 'As It Was', artist: 'Harry Styles' },
    { id: 3, title: 'Heat Waves', artist: 'Glass Animals' },
    { id: 4, title: 'Levitating', artist: 'Dua Lipa' },
    { id: 5, title: 'Shivers', artist: 'Ed Sheeran' },
    { id: 6, title: 'Good 4 U', artist: 'Olivia Rodrigo' },
    { id: 7, title: 'Stay', artist: 'The Kid LAROI' },
    { id: 8, title: 'Anti-Hero', artist: 'Taylor Swift' },
  ];

  const platforms: SharePlatform[] = [
    { id: 'feed', name: 'Feed', icon: '🏠' },
    { id: 'story', name: 'Story', icon: '📖' },
    { id: 'groups', name: 'Groups', icon: '👥' }
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(e.target.value.trim().length > 0);
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setSearchQuery('');
    setShowSearchResults(false);
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

    const postData = {
      song: selectedSong,
      caption: caption.trim(),
      platforms: Array.from(selectedPlatforms),
      timestamp: new Date().toISOString()
    };

    console.log('Posting music share:', postData);

    // Simulate API call
    setTimeout(() => {
      // Save to session storage for demo
      let sharedPosts = sessionStorage.getItem('sharedMusicPosts');
      const posts = sharedPosts ? JSON.parse(sharedPosts) : [];
      posts.push(postData);
      sessionStorage.setItem('sharedMusicPosts', JSON.stringify(posts));

      alert('✓ Music shared successfully!');
      setIsLoading(false);
      navigate('/home-feed');
    }, 1500);
  };

  const filteredSongs = mockSongs.filter(
    song =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          </div>

          {/* Search Results */}
          {showSearchResults && (
            <div className="search-results">
              {filteredSongs.map(song => (
                <div
                  key={song.id}
                  className="search-result-item"
                  onClick={() => handleSelectSong(song)}
                >
                  <div className="song-thumbnail">♪</div>
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
              <div className="album-placeholder">♪</div>
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
