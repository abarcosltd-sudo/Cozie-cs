import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './addmusic.css';

interface MusicData {
  file: File | null;
  albumArt: File | null;
  title: string;
  artist: string;
  featuredArtists: string;
  album: string;
  genre: string | null;
  subgenre: string;
  mood: string;
  producer: string;
  songwriter: string;
  composer: string;
  recordLabel: string;
  releaseDate: string;
  releaseYear: string;
  country: string;
  language: string;
  duration: string;
  bpm: string;
  musicalKey: string;
  isrc: string;
  explicit: string;
  copyright: string;
  publishingRights: string;
  originalWork: boolean;
  description: string;
  lyrics: string;
  tags: string;
}

export default function AddMusic() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const albumArtInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);      // actual music file
  const [albumArtFile, setAlbumArtFile] = useState<File | null>(null);      // actual album art file
  const [albumArtPreview, setAlbumArtPreview] = useState<string>('');       // preview URL (string)
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<MusicData>({
    file: null,
    albumArt: null,
    title: '',
    artist: '',
    featuredArtists: '',
    album: '',
    genre: null,
    subgenre: '',
    mood: '',
    producer: '',
    songwriter: '',
    composer: '',
    recordLabel: '',
    releaseDate: '',
    releaseYear: new Date().getFullYear().toString(),
    country: '',
    language: '',
    duration: '',
    bpm: '',
    musicalKey: '',
    isrc: '',
    explicit: 'no',
    copyright: '',
    publishingRights: '',
    originalWork: false,
    description: '',
    lyrics: '',
    tags: '',
  });

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);

  // Drag and drop handlers
  useEffect(() => {
    const uploadArea = uploadAreaRef.current;
    if (!uploadArea) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    };

    const handleDragLeave = () => {
      uploadArea.classList.remove('dragover');
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer?.files) {
        handleFile(e.dataTransfer.files[0]);
      }
    };

    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    return () => {
      uploadArea.removeEventListener('dragover', handleDragOver);
      uploadArea.removeEventListener('dragleave', handleDragLeave);
      uploadArea.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFile = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|flac)$/i)) {
      alert('Please upload a valid audio file (MP3, WAV, or FLAC)');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setFormData(prev => ({ ...prev, file }));
    validateForm({ ...formData, file });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleAlbumArtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    if (file.size > 5 * 1024 * 1024) {
      alert('Album art must be less than 5MB');
      return;
    }
  
    // Store the file object for upload
    setAlbumArtFile(file);
  
    // Generate preview as a data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setAlbumArtPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    validateForm({ ...formData, [id]: value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, description: value }));
    setDescriptionCharCount(value.length);
    validateForm({ ...formData, description: value });
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, explicit: e.target.value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, originalWork: e.target.checked }));
    validateForm({ ...formData, originalWork: e.target.checked });
  };

  const selectGenre = (genre: string) => {
    setSelectedGenre(genre);
    setFormData(prev => ({ ...prev, genre }));
    validateForm({ ...formData, genre });
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, file: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateForm = (data: Partial<MusicData> = formData): boolean => {
    const checkData = { ...formData, ...data };
    return !!(
      selectedFile &&
      checkData.title &&
      checkData.artist &&
      selectedGenre &&
      checkData.producer &&
      checkData.releaseDate &&
      checkData.releaseYear &&
      checkData.language &&
      checkData.originalWork
    );
  };

  const handleGoBack = () => {
    if (selectedFile && !window.confirm('Discard your upload?')) {
      return;
    }
    navigate(-1);
  };

  const handleUploadMusic = async () => {
    // --- Validation ---
    if (!selectedFile) {
      alert('Please select a music file');
      return;
    }
  
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }
  
    if (!formData.originalWork) {
      alert('Please confirm that you have the rights to upload this music');
      return;
    }
  
    setIsLoading(true);
    setUploadProgress(0);
  
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not authenticated. Please log in again.');
      setIsLoading(false);
      return;
    }
  
    try {
      // --- 1. Upload audio file using signed URL ---
      // Request signed URL for the audio file
      const audioRes = await fetch('https://cozie-kohl.vercel.app/api/music/generate-upload-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          filePurpose: 'audio', // optional: differentiate from album art
        }),
      });
  
      if (!audioRes.ok) {
        const error = await audioRes.json();
        throw new Error(error.message || 'Failed to get upload URL for audio');
      }
  
      const { signedUrl: audioSignedUrl, publicUrl: audioPublicUrl } = await audioRes.json();
  
      // Upload audio file directly to the signed URL
      const audioUploadRes = await fetch(audioSignedUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: { 'Content-Type': selectedFile.type },
      });
  
      if (!audioUploadRes.ok) {
        throw new Error('Audio file upload failed');
      }
  
      setUploadProgress(50); // update progress (rough estimate)
  
      // --- 2. Upload album art if provided ---
      let albumArtPublicUrl = null;
      if (albumArtFile) {
        const artRes = await fetch('https://cozie-kohl.vercel.app/api/music/generate-album-art-url', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: albumArtFile.name,
            fileType: albumArtFile.type,
          }),
        });
  
        if (!artRes.ok) {
          const error = await artRes.json();
          throw new Error(error.message || 'Failed to get upload URL for album art');
        }
  
        const { signedUrl: artSignedUrl, publicUrl: artPublicUrl } = await artRes.json();
  
        const artUploadRes = await fetch(artSignedUrl, {
          method: 'PUT',
          body: albumArtPreview,
          headers: { 'Content-Type': albumArtPreview.type },
        });
  
        if (!artUploadRes.ok) {
          throw new Error('Album art upload failed');
        }
  
        albumArtPublicUrl = artPublicUrl;
      }
  
      setUploadProgress(80);
  
      // --- 3. Save metadata to backend Firestore ---
      const metadataPayload = {
        fileUrl: audioPublicUrl,
        albumArtUrl: albumArtPublicUrl,
        title: formData.title,
        artist: formData.artist,
        featuredArtists: formData.featuredArtists,
        album: formData.album,
        genre: formData.genre,
        subgenre: formData.subgenre,
        mood: formData.mood,
        producer: formData.producer,
        songwriter: formData.songwriter,
        composer: formData.composer,
        recordLabel: formData.recordLabel,
        releaseDate: formData.releaseDate,
        releaseYear: formData.releaseYear,
        country: formData.country,
        language: formData.language,
        duration: formData.duration,
        bpm: formData.bpm,
        musicalKey: formData.musicalKey,
        isrc: formData.isrc,
        explicit: formData.explicit,
        copyright: formData.copyright,
        publishingRights: formData.publishingRights,
        originalWork: formData.originalWork,
        description: formData.description,
        lyrics: formData.lyrics,
        tags: formData.tags,
      };
  
      const metadataRes = await fetch('https://cozie-kohl.vercel.app/api/music/add-music', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadataPayload),
      });
  
      if (!metadataRes.ok) {
        const error = await metadataRes.json();
        throw new Error(error.message || 'Failed to save music metadata');
      }
  
      setUploadProgress(100);
  
      // --- 4. Success and navigation ---
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/home-feed');
      }, 2000);
  
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="page-wrapper">
      {/* Header Banner */}
      <div className="header-banner">
        <button className="back-button" onClick={handleGoBack} aria-label="Go back">
          ←
        </button>
        <h1 className="header-title">Add Music</h1>
        <button
          className="save-button"
          onClick={handleUploadMusic}
          disabled={!validateForm() || isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {/* Add Music Container */}
      <div className="add-music-container">
        {/* Success Message */}
        {showSuccess && (
          <div className="success-message show">
            <div className="success-icon">✓</div>
            <div className="success-text">Music uploaded successfully!</div>
            <div className="success-subtext">Your track is now live on COZIE</div>
          </div>
        )}

        {/* Upload Section */}
        {!selectedFile && (
          <div className="upload-section">
            <div
              className="upload-area"
              ref={uploadAreaRef}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">🎵</div>
              <div className="upload-title">Upload Your Music</div>
              <div className="upload-subtitle">Drag and drop or click to browse</div>
              <button className="upload-button" type="button">
                Choose File
              </button>
              <div className="supported-formats">
                Supports: MP3, WAV, FLAC (Max 50MB)
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".mp3,.wav,.flac,audio/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="file-preview show">
            <div className="file-icon">🎵</div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-size">{formatFileSize(selectedFile.size)}</div>
            </div>
            <button
              className="remove-file"
              onClick={removeFile}
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Section */}
        {selectedFile && (
          <div className="form-section show">
            {/* Basic Information */}
            <div className="section-title">Basic Information</div>

            <div className="form-group">
              <label className="form-label">
                Song Title <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="title"
                placeholder="Enter song title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Artist Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="artist"
                placeholder="Enter artist name"
                value={formData.artist}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Featured Artists</label>
              <input
                type="text"
                className="form-input"
                id="featuredArtists"
                placeholder="e.g., Artist 1, Artist 2 (comma separated)"
                value={formData.featuredArtists}
                onChange={handleInputChange}
              />
              <div className="field-hint">Add any featured or collaborating artists</div>
            </div>

            <div className="form-group">
              <label className="form-label">Album Name</label>
              <input
                type="text"
                className="form-input"
                id="album"
                placeholder="Enter album name"
                value={formData.album}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Album Art</label>
              <div className="album-art-upload">
                <div
                  className="album-art-preview"
                  onClick={() => albumArtInputRef.current?.click()}
                >
                  {albumArtPreview ? (
                    <img src={albumArtPreview} alt="Album art" />
                  ) : (
                    <div className="album-art-placeholder">
                      <div className="album-art-icon">🖼️</div>
                      <div className="album-art-text">Add Cover</div>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
                    Upload a square image (1:1 ratio)<br />
                    Recommended: 3000x3000px<br />
                    Max size: 5MB
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={albumArtInputRef}
                accept="image/*"
                onChange={handleAlbumArtSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Genre & Category */}
            <div className="section-title">Genre & Category</div>

            <div className="form-group">
              <label className="form-label">
                Primary Genre <span className="required">*</span>
              </label>
              <div className="genre-grid">
                {['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B/Soul', 'Country', 'Indie', 'Reggae', 'Latin', 'Afrobeats'].map(
                  (genre) => (
                    <div
                      key={genre}
                      className={`genre-option ${selectedGenre === genre.toLowerCase().replace(/[&/]/g, '') ? 'selected' : ''}`}
                      onClick={() => selectGenre(genre.toLowerCase().replace(/[&/]/g, ''))}
                    >
                      {genre}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subgenre / Style</label>
              <input
                type="text"
                className="form-input"
                id="subgenre"
                placeholder="e.g., Trap, Alternative Rock, Deep House"
                value={formData.subgenre}
                onChange={handleInputChange}
              />
              <div className="field-hint">Specify the specific style or subgenre</div>
            </div>

            <div className="form-group">
              <label className="form-label">Mood / Vibe</label>
              <input
                type="text"
                className="form-input"
                id="mood"
                placeholder="e.g., Energetic, Chill, Romantic, Sad"
                value={formData.mood}
                onChange={handleInputChange}
              />
              <div className="field-hint">Describe the overall feeling of the song</div>
            </div>

            {/* Production & Credits */}
            <div className="section-title">Production & Credits</div>

            <div className="form-group">
              <label className="form-label">
                Producer(s) <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                id="producer"
                placeholder="Enter producer name(s)"
                value={formData.producer}
                onChange={handleInputChange}
              />
              <div className="field-hint">Add all producers (comma separated if multiple)</div>
            </div>

            <div className="form-group">
              <label className="form-label">Songwriter(s)</label>
              <input
                type="text"
                className="form-input"
                id="songwriter"
                placeholder="Enter songwriter name(s)"
                value={formData.songwriter}
                onChange={handleInputChange}
              />
              <div className="field-hint">Comma separated if multiple</div>
            </div>

            <div className="form-group">
              <label className="form-label">Composer(s)</label>
              <input
                type="text"
                className="form-input"
                id="composer"
                placeholder="Enter composer name(s)"
                value={formData.composer}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Record Label</label>
              <input
                type="text"
                className="form-input"
                id="recordLabel"
                placeholder="Enter record label name"
                value={formData.recordLabel}
                onChange={handleInputChange}
              />
            </div>

            {/* Release Information */}
            <div className="section-title">Release Information</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Release Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  id="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Release Year <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  id="releaseYear"
                  placeholder="2024"
                  min="1900"
                  max="2100"
                  value={formData.releaseYear}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Country of Origin</label>
              <select
                className="form-input"
                id="country"
                value={formData.country}
                onChange={handleInputChange}
              >
                <option value="">Select country</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="CA">Canada</option>
                <option value="NG">Nigeria</option>
                <option value="ZA">South Africa</option>
                <option value="GH">Ghana</option>
                <option value="KE">Kenya</option>
                <option value="JM">Jamaica</option>
                <option value="BR">Brazil</option>
                <option value="MX">Mexico</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="JP">Japan</option>
                <option value="KR">South Korea</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Language <span className="required">*</span>
              </label>
              <select
                className="form-input"
                id="language"
                value={formData.language}
                onChange={handleInputChange}
              >
                <option value="">Select language</option>
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="portuguese">Portuguese</option>
                <option value="yoruba">Yoruba</option>
                <option value="igbo">Igbo</option>
                <option value="hausa">Hausa</option>
                <option value="swahili">Swahili</option>
                <option value="pidgin">Pidgin</option>
                <option value="korean">Korean</option>
                <option value="japanese">Japanese</option>
                <option value="mandarin">Mandarin</option>
                <option value="hindi">Hindi</option>
                <option value="arabic">Arabic</option>
                <option value="instrumental">Instrumental</option>
                <option value="multilingual">Multilingual</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Technical Information */}
            <div className="section-title">Technical Information</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-input"
                  id="duration"
                  placeholder="3:45"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                  value={formData.duration}
                  onChange={handleInputChange}
                />
                <div className="field-hint">Format: MM:SS</div>
              </div>

              <div className="form-group">
                <label className="form-label">BPM (Tempo)</label>
                <input
                  type="number"
                  className="form-input"
                  id="bpm"
                  placeholder="120"
                  min="40"
                  max="200"
                  value={formData.bpm}
                  onChange={handleInputChange}
                />
                <div className="field-hint">Beats per minute</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Key / Scale</label>
              <select
                className="form-input"
                id="musicalKey"
                value={formData.musicalKey}
                onChange={handleInputChange}
              >
                <option value="">Select key</option>
                <option value="C">C Major</option>
                <option value="Cm">C Minor</option>
                <option value="C#">C# Major</option>
                <option value="C#m">C# Minor</option>
                <option value="D">D Major</option>
                <option value="Dm">D Minor</option>
                <option value="D#">D# Major</option>
                <option value="D#m">D# Minor</option>
                <option value="E">E Major</option>
                <option value="Em">E Minor</option>
                <option value="F">F Major</option>
                <option value="Fm">F Minor</option>
                <option value="F#">F# Major</option>
                <option value="F#m">F# Minor</option>
                <option value="G">G Major</option>
                <option value="Gm">G Minor</option>
                <option value="G#">G# Major</option>
                <option value="G#m">G# Minor</option>
                <option value="A">A Major</option>
                <option value="Am">A Minor</option>
                <option value="A#">A# Major</option>
                <option value="A#m">A# Minor</option>
                <option value="B">B Major</option>
                <option value="Bm">B Minor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ISRC Code</label>
              <input
                type="text"
                className="form-input"
                id="isrc"
                placeholder="US-XXX-YY-NNNNN"
                pattern="[A-Z]{2}-[A-Z0-9]{3}-[0-9]{2}-[0-9]{5}"
                value={formData.isrc}
                onChange={handleInputChange}
              />
              <div className="field-hint">
                International Standard Recording Code (if available)
              </div>
            </div>

            {/* Content & Rights */}
            <div className="section-title">Content & Rights</div>

            <div className="form-group">
              <label className="form-label">Explicit Content</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="explicit"
                    value="yes"
                    checked={formData.explicit === 'yes'}
                    onChange={handleRadioChange}
                  />
                  <span>Yes - Contains explicit lyrics</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="explicit"
                    value="no"
                    checked={formData.explicit === 'no'}
                    onChange={handleRadioChange}
                  />
                  <span>No - Clean version</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="explicit"
                    value="edited"
                    checked={formData.explicit === 'edited'}
                    onChange={handleRadioChange}
                  />
                  <span>Edited - Censored version</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Copyright / ℗ Line</label>
              <input
                type="text"
                className="form-input"
                id="copyright"
                placeholder="℗ 2024 Artist Name. All rights reserved."
                value={formData.copyright}
                onChange={handleInputChange}
              />
              <div className="field-hint">Copyright notice for sound recording</div>
            </div>

            <div className="form-group">
              <label className="form-label">Publishing Rights / © Line</label>
              <input
                type="text"
                className="form-input"
                id="publishingRights"
                placeholder="© 2024 Publisher Name"
                value={formData.publishingRights}
                onChange={handleInputChange}
              />
              <div className="field-hint">Copyright for composition/lyrics</div>
            </div>

            <div className="form-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  id="originalWork"
                  checked={formData.originalWork}
                  onChange={handleCheckboxChange}
                />
                <label htmlFor="originalWork">
                  I confirm this is original work or I have proper rights
                </label>
              </label>
            </div>

            {/* Additional Information */}
            <div className="section-title">Additional Information</div>

            <div className="form-group">
              <label className="form-label">Description / Bio</label>
              <textarea
                className="form-input"
                id="description"
                placeholder="Tell us about this song, the inspiration behind it, or any interesting story..."
                maxLength={500}
                value={formData.description}
                onChange={handleDescriptionChange}
              />
              <div className="char-count">{descriptionCharCount} / 500</div>
            </div>

            <div className="form-group">
              <label className="form-label">Lyrics</label>
              <textarea
                className="form-input lyrics-input"
                id="lyrics"
                placeholder="Paste song lyrics here (optional)..."
                value={formData.lyrics}
                onChange={handleInputChange}
              />
              <div className="field-hint">Add full lyrics for better discoverability</div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags / Keywords</label>
              <input
                type="text"
                className="form-input"
                id="tags"
                placeholder="e.g., summer, party, love, motivation"
                value={formData.tags}
                onChange={handleInputChange}
              />
              <div className="field-hint">Add relevant tags for better search (comma separated)</div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isLoading && (
          <div className="upload-progress show">
            <div className="progress-header">
              <div className="progress-label">Uploading...</div>
              <div className="progress-percentage">{uploadProgress}%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}
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
          <div className="nav-item active" onClick={() => navigate('/add-music')}>
            <div className="nav-icon">➕</div>
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
