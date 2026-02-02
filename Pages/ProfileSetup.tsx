import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './profilesetup.css';

interface ProfileData {
  displayName: string;
  username: string;
  bio: string | null;
  photo: string | null;
  timestamp: string;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCircleRef = useRef<HTMLDivElement>(null);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);

  // Load saved profile data on mount
  useEffect(() => {
    const savedProfile = sessionStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        if (profile.displayName) setDisplayName(profile.displayName);
        if (profile.username) setUsername(profile.username);
        if (profile.bio) setBio(profile.bio);
        if (profile.photo) {
          setProfilePhoto(profile.photo);
          setShowRemoveBtn(true);
        }
      } catch (e) {
        console.error('Error loading saved profile:', e);
      }
    }
  }, []);

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Remove @ if user types it
    if (value.startsWith('@')) {
      value = value.substring(1);
    }

    // Convert to lowercase and filter invalid characters
    value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setProfilePhoto(result);
      setShowRemoveBtn(true);

      if (photoCircleRef.current) {
        photoCircleRef.current.innerHTML = `
          <img src="${result}" alt="Profile photo">
          <div class="photo-overlay">
            <span class="overlay-text">Change Photo</span>
          </div>
        `;
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfilePhoto(null);
    setShowRemoveBtn(false);

    if (photoCircleRef.current) {
      photoCircleRef.current.innerHTML = `
        <span class="upload-text">+ Add Photo</span>
        <div class="photo-overlay">
          <span class="overlay-text">Change Photo</span>
        </div>
      `;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const useBioSuggestion = (suggestion: string) => {
    setBio(suggestion);
  };

  const showError = (message: string) => {
    if (errorMessageRef.current) {
      errorMessageRef.current.textContent = message;
      errorMessageRef.current.classList.add('show');
      errorMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const displayNameTrim = displayName.trim();
    const usernameTrim = username.trim();
    const bioTrim = bio.trim();

    // Clear previous errors
    if (errorMessageRef.current) {
      errorMessageRef.current.classList.remove('show');
    }

    // Validation
    if (displayNameTrim.length < 2) {
      showError('Display name must be at least 2 characters long');
      return;
    }

    if (usernameTrim.length < 3) {
      showError('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(usernameTrim)) {
      showError('Username can only contain lowercase letters, numbers, and underscores');
      return;
    }

    // Prepare profile data
    const profileData: ProfileData = {
      displayName: displayNameTrim,
      username: usernameTrim,
      bio: bioTrim || null,
      photo: profilePhoto,
      timestamp: new Date().toISOString(),
    };

    console.log('Saving profile:', profileData);

    // Show loading state
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      sessionStorage.setItem('userProfile', JSON.stringify(profileData));
      navigate('/preference');
    }, 1500);
  };

  const skipProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Skip profile setup? You can always complete it later in settings.')) {
      sessionStorage.setItem('userProfile', JSON.stringify({ skipped: true }));
      navigate('/preference');
    }
  };

  return (
    <div className="profilesetup-page">
      <div className="profilesetup-container">
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          {/* <h1 className="app-name">COOZIE</h1>
          <p className="app-tagline">Share your music vibe with friends</p> */}
        </div>

        <div className="profilesetup-header">
          <h2 className="profilesetup-title">Set up your profile</h2>
          <p className="profilesetup-subtitle">Help friends recognize you and express yourself</p>
        </div>

        <div className="error-message" ref={errorMessageRef}></div>

        {/* Photo Upload Section */}
        <div className="photo-upload-section">
          <div className="photo-upload-wrapper">
            <div
              className="profile-photo-circle"
              ref={photoCircleRef}
              onClick={() => fileInputRef.current?.click()}
            >
              {!profilePhoto && (
                <>
                  <div className="upload-icon">📷</div>
                  <span className="upload-text">Add Photo</span>
                  <div className="photo-overlay">
                    <span className="overlay-text">Change Photo</span>
                  </div>
                </>
              )}
              {profilePhoto && (
                <>
                  <img src={profilePhoto} alt="Profile photo" />
                  <div className="photo-overlay">
                    <span className="overlay-text">Change Photo</span>
                  </div>
                </>
              )}
            </div>
            {showRemoveBtn && (
              <div className="remove-photo show" onClick={removeProfilePhoto}></div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            id="photoInput"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
          <p className="photo-hint">Recommended: Square image, at least 400x400px</p>
        </div>

        {/* Profile Form */}
        <form className="profilesetup-form" onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              id="displayName"
              placeholder="Enter your display name"
              required
              maxLength={50}
              autoComplete="name"
              value={displayName}
              onChange={handleDisplayNameChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              id="username"
              placeholder="username"
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              value={username}
              onChange={handleUsernameChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Bio
              <span className="optional-tag">Optional</span>
            </label>
            <textarea
              className="form-input bio-input"
              id="bio"
              placeholder="Tell us a bit about yourself and your music taste..."
              maxLength={150}
              value={bio}
              onChange={handleBioChange}
            ></textarea>

            <div className="quick-bios">
              <div className="bio-suggestion" onClick={() => useBioSuggestion('🎵 Music is life')}>
                🎵 Music is life
              </div>
              <div className="bio-suggestion" onClick={() => useBioSuggestion('🎧 Always vibing')}>
                🎧 Always vibing
              </div>
              <div
                className="bio-suggestion"
                onClick={() => useBioSuggestion('🎸 Rock enthusiast')}
              >
                🎸 Rock enthusiast
              </div>
              <div
                className="bio-suggestion"
                onClick={() => useBioSuggestion('✨ Living for the beat')}
              >
                ✨ Living for the beat
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button type="button" className="skip-button" onClick={skipProfile}>
              Skip for now
            </button>
            <button type="submit" className="continue-button" id="continueButton" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
        </div>
      </div>
    </div>
  );
}
