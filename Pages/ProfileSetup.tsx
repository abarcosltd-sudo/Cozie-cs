import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfileData {
  displayName: string;
  username: string;
  bio: string | null;
  photo: string | null;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorMessageRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null); // preview URL
  const [photoFile, setPhotoFile] = useState<File | null>(null);         // actual file to upload
  const [photoRemoved, setPhotoRemoved] = useState(false);               // user removed existing photo
  const [loading, setLoading] = useState(false);
  const [showRemoveBtn, setShowRemoveBtn] = useState(false);

  // Fetch existing user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const response = await fetch('https://cozie-kohl.vercel.app/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to load user data');
        const data = await response.json();
        const user = data.user;
        // Pre‑fill form with existing values
        if (user.displayName) setDisplayName(user.displayName);
        if (user.username) setUsername(user.username);
        if (user.bio) setBio(user.bio);
        if (user.photoURL) {
          setProfilePhoto(user.photoURL);
          setShowRemoveBtn(true);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Optionally show a toast
      }
    };
    fetchUserData();
  }, [navigate]);

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (value.startsWith('@')) value = value.substring(1);
    value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    setPhotoFile(file);
    setPhotoRemoved(false); // user is uploading a new photo, not removing

    // Generate preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePhoto(event.target?.result as string);
      setShowRemoveBtn(true);
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfilePhoto(null);
    setPhotoFile(null);
    setPhotoRemoved(true);
    setShowRemoveBtn(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const saveProfile = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('displayName', displayNameTrim);
      formData.append('username', usernameTrim);
      formData.append('bio', bioTrim || '');

      if (photoRemoved) {
        formData.append('removePhoto', 'true');
      } else if (photoFile) {
        formData.append('profilePhoto', photoFile);
      }

      // const response = await fetch('https://cozie-kohl.vercel.app/api/users/profile', {
      //   method: 'PUT',
      //   headers: { Authorization: `Bearer ${token}` },
      //   body: formData,
      // });

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.message || 'Failed to update profile');
      // }

      // Success – proceed to next onboarding step (Connect Streaming)
      navigate('/connectmusic');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const skipProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Skip profile setup? You can always complete it later in settings.')) {
      // Mark as skipped and go to next step
      navigate('/connectmusic');
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
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePhoto ? (
                <>
                  <img src={profilePhoto} alt="Profile" />
                  <div className="photo-overlay">
                    <span className="overlay-text">Change Photo</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-icon">📷</div>
                  <span className="upload-text">Add Photo</span>
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
              placeholder="Enter your display name"
              required
              maxLength={50}
              value={displayName}
              onChange={handleDisplayNameChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="username"
              required
              minLength={3}
              maxLength={20}
              value={username}
              onChange={handleUsernameChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Bio <span className="optional-tag">Optional</span>
            </label>
            <textarea
              className="form-input bio-input"
              placeholder="Tell us a bit about yourself and your music taste..."
              maxLength={150}
              value={bio}
              onChange={handleBioChange}
            ></textarea>

            <div className="quick-bios">
              <div className="bio-suggestion" onClick={() => useBioSuggestion('🎵 Music is life')}>🎵 Music is life</div>
              <div className="bio-suggestion" onClick={() => useBioSuggestion('🎧 Always vibing')}>🎧 Always vibing</div>
              <div className="bio-suggestion" onClick={() => useBioSuggestion('🎸 Rock enthusiast')}>🎸 Rock enthusiast</div>
              <div className="bio-suggestion" onClick={() => useBioSuggestion('✨ Living for the beat')}>✨ Living for the beat</div>
            </div>
          </div>

          <div className="action-buttons">
            <button type="button" className="skip-button" onClick={skipProfile}>
              Skip for now
            </button>
            <button type="submit" className="continue-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Saving...
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
