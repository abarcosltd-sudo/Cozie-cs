import { useState, useEffect, useRef } from 'react';
import './ComingSoon.css';

const ComingSoon = () => {
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const musicNotesRef = useRef<HTMLDivElement>(null);

  // Handle email submission
  const handleSubmitEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (email) {
      console.log('Submitting email:', email);
      setShowSuccess(true);
      setEmail('');

      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    }
  };

  // Handle social media links
  const handleOpenSocial = (platform: string) => {
    console.log('Opening:', platform);
    alert(`${platform.charAt(0).toUpperCase() + platform.slice(1)} coming soon!`);
  };

  // Add floating animation to music notes
  useEffect(() => {
    if (musicNotesRef.current) {
      let rotation = 0;
      const interval = setInterval(() => {
        rotation += 5;
        if (musicNotesRef.current) {
          musicNotesRef.current.style.transform = `rotate(${
            Math.sin((rotation * Math.PI) / 180) * 10
          }deg)`;
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, []);

  // Animate feature items on load
  useEffect(() => {
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
      (item as HTMLElement).style.opacity = '0';
      (item as HTMLElement).style.transform = 'translateY(20px)';
      setTimeout(() => {
        (item as HTMLElement).style.transition = 'all 0.5s ease';
        (item as HTMLElement).style.opacity = '1';
        (item as HTMLElement).style.transform = 'translateY(0)';
      }, index * 100 + 1000);
    });
  }, []);

  return (
    <div className="coming-soon-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="bg-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>

      <div className="coming-soon-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="app-name">COZIE</h1>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="music-notes" ref={musicNotesRef}>
            🎵
          </div>
          <h2 className="coming-soon-title">Coming Soon</h2>
          <p className="coming-soon-subtitle">
            We're working hard to bring you something amazing.
            <br />
            This feature will be available very soon!
          </p>
          <p className="feature-text">Get ready to experience music sharing like never before</p>
        </div>

        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-label">Development Progress</div>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <div className="progress-percentage">75% Complete</div>
        </div>

        {/* Features Preview */}
        <div className="features-list">
          <div className="feature-item">
            <div className="feature-icon">🎧</div>
            <div className="feature-name">Music Discovery</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">👥</div>
            <div className="feature-name">Social Sharing</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎵</div>
            <div className="feature-name">Playlists</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💬</div>
            <div className="feature-name">Live Chat</div>
          </div>
        </div>

        {/* Notify Section */}
        <div className="notify-section">
          <h3 className="notify-title">Get Notified</h3>
          <p className="notify-description">Be the first to know when this feature launches!</p>
          <form className="notify-form" onSubmit={handleSubmitEmail}>
            <input
              type="email"
              className="email-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="notify-button">
              Notify Me
            </button>
          </form>
          {showSuccess && (
            <div className={`success-message ${showSuccess ? 'show' : ''}`}>
              ✓ Thank you! We'll notify you when it's ready.
            </div>
          )}
        </div>

        {/* Social Links */}
        <div className="social-links">
          <button
            className="social-button"
            onClick={() => handleOpenSocial('twitter')}
            style={{ background: 'inherit', border: 'inherit', cursor: 'pointer' }}
          >
            𝕏
          </button>
          <button
            className="social-button"
            onClick={() => handleOpenSocial('instagram')}
            style={{ background: 'inherit', border: 'inherit', cursor: 'pointer' }}
          >
            📷
          </button>
          <button
            className="social-button"
            onClick={() => handleOpenSocial('facebook')}
            style={{ background: 'inherit', border: 'inherit', cursor: 'pointer' }}
          >
            f
          </button>
          <button
            className="social-button"
            onClick={() => handleOpenSocial('youtube')}
            style={{ background: 'inherit', border: 'inherit', cursor: 'pointer' }}
          >
            ▶️
          </button>
        </div>

        {/* Back Button */}
        <a href="/home-feed" className="back-button">
          ← Back to Home
        </a>
      </div>
    </div>
  );
};

export default ComingSoon;
