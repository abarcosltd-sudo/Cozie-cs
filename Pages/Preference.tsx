import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './preference.css';

const GENRES = [
  { id: 'rock', name: 'Rock', emoji: '🎸' },
  { id: 'pop', name: 'Pop', emoji: '🎤' },
  { id: 'hip-hop', name: 'Hip Hop', emoji: '🎧' },
  { id: 'electronic', name: 'Electronic', emoji: '🎹' },
  { id: 'jazz', name: 'Jazz', emoji: '🎺' },
  { id: 'classical', name: 'Classical', emoji: '🎻' },
  { id: 'country', name: 'Country', emoji: '🪕' },
  { id: 'rnb', name: 'R&B/Soul', emoji: '🥁' },
  { id: 'reggae', name: 'Reggae', emoji: '🎶' },
  { id: 'latin', name: 'Latin', emoji: '💃' },
  { id: 'indie', name: 'Indie', emoji: '🎙️' },
  { id: 'metal', name: 'Metal', emoji: '🤘' },
  { id: 'blues', name: 'Blues', emoji: '🎸' },
  { id: 'folk', name: 'Folk', emoji: '🪈' },
  { id: 'kpop', name: 'K-Pop', emoji: '🎤' },
  { id: 'afrobeats', name: 'Afrobeats', emoji: '🪘' }
];

const MIN_SELECTIONS = 3;

export default function Preference() {
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  const toggleGenre = (genreId: string) => {
    const newSelected = new Set(selectedGenres);
    if (newSelected.has(genreId)) {
      newSelected.delete(genreId);
    } else {
      newSelected.add(genreId);
    }
    setSelectedGenres(newSelected);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedGenres.size >= MIN_SELECTIONS) {
      savePreferences();
    }
  };

  const savePreferences = async () => {
    if (selectedGenres.size < MIN_SELECTIONS) {
      return;
    }

    setIsLoading(true);

    const preferences = {
      genres: Array.from(selectedGenres),
      timestamp: new Date().toISOString()
    };

    console.log('Saving preferences:', preferences);

    // Simulate API call
    setTimeout(() => {
      sessionStorage.setItem('musicPreferences', JSON.stringify(preferences));
      navigate('/profilesetup');
    }, 1500);
  };

  const skipPreferences = () => {
    if (confirm('Are you sure you want to skip? We can personalize your experience better with your preferences.')) {
      sessionStorage.setItem('musicPreferences', JSON.stringify({ genres: [], skipped: true }));
      navigate('/profile-setup');
    }
  };

  const getSelectionText = () => {
    const count = selectedGenres.size;
    if (count === 0) {
      return '0 of 3+ selected';
    } else if (count < MIN_SELECTIONS) {
      return `${count} of 3+ selected`;
    } else {
      return `${count} selected ✓`;
    }
  };

  const getSelectionCountClass = () => {
    const count = selectedGenres.size;
    if (count === 0) {
      return 'selection-count';
    } else if (count < MIN_SELECTIONS) {
      return 'selection-count warning';
    } else {
      return 'selection-count success';
    }
  };

  return (
    <div className="preference-page" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="preferences-container">
        <div className="header-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          {/* <div className="music-emoji">🎵</div> */}
          <h1 className="page-title">What music do you vibe with?</h1>
          <p className="page-subtitle">
            Select your favorite genres to personalize your feed
          </p>
          <div className={getSelectionCountClass()}>
            {getSelectionText()}
          </div>
        </div>

        <div className="info-banner">
          <div className="info-icon">💡</div>
          <div className="info-text">
            Choose at least 3 genres to help us recommend music and connect you with friends who share your taste!
          </div>
        </div>

        <div className="genres-grid">
          {GENRES.map((genre) => (
            <div
              key={genre.id}
              className={`genre-card ${selectedGenres.has(genre.id) ? 'selected' : ''}`}
              onClick={() => toggleGenre(genre.id)}
            >
              <div className="checkmark"></div>
              <span className="genre-emoji">{genre.emoji}</span>
              <div className="genre-name">{genre.name}</div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button className="skip-button" onClick={skipPreferences}>
            Skip for now
          </button>
          <button
            ref={continueButtonRef}
            className="continue-button"
            onClick={savePreferences}
            disabled={selectedGenres.size < MIN_SELECTIONS || isLoading}
          >
            <span className="button-content">
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </span>
          </button>
        </div>

        <div className="progress-indicator">
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot"></div>
        </div>
      </div>
    </div>
  );
}
