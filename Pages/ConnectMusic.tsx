import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './connectmusic.css';

export default function ConnectMusic() {
  const navigate = useNavigate();
  const successMessageRef = useRef<HTMLDivElement>(null);
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if already connected
  useEffect(() => {
    const musicService = sessionStorage.getItem('musicService');
    if (musicService) {
      try {
        const service = JSON.parse(musicService);
        if (service.connected) {
          setSuccessMessage(`✓ Already connected to ${getServiceDisplayName(service.service)}`);
          setShowSuccess(true);
        }
      } catch (e) {
        console.error('Error loading music service:', e);
      }
    }
  }, []);

  const getServiceDisplayName = (service: string): string => {
    const names: { [key: string]: string } = {
      'spotify': 'Spotify',
      'apple': 'Apple Music',
      'soundcloud': 'SoundCloud'
    };
    return names[service] || service;
  };

  const connectService = (serviceName: string) => {
    setConnectingService(serviceName);

    // Simulate OAuth connection
    setTimeout(() => {
      const connectionData = {
        service: serviceName,
        connected: true,
        timestamp: new Date().toISOString()
      };

      sessionStorage.setItem('musicService', JSON.stringify(connectionData));

      const message = `✓ Successfully connected to ${getServiceDisplayName(serviceName)}! Redirecting...`;
      setSuccessMessage(message);
      setShowSuccess(true);

      // Redirect to next step after delay
      setTimeout(() => {
        navigate('/preference');
      }, 2000);

      console.log(`Connected to ${serviceName}...`);
    }, 1500);
  };

  const skipConnection = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (confirm('Skip music service connection? You can connect later in settings to share what you\'re listening to.')) {
      sessionStorage.setItem('musicService', JSON.stringify({
        connected: false,
        skipped: true
      }));
      navigate('/preference');
    }
  };

  return (
    <div className="connectmusic-page">
      <div className="connectmusic-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <h1 className="app-name">COOZIE</h1>
          <p className="app-tagline">Share your music vibe with friends</p>
        </div>

        {/* Connect Header */}
        <div className="connectmusic-header">
          <h2 className="connectmusic-title">Connect your music</h2>
          <p className="connectmusic-subtitle">
            Link your streaming service to share<br />what you're listening to
          </p>
        </div>

        {/* Music Icon */}
        <div className="music-icon">
          <div className="music-icon-svg">
            <div className="music-note">🎵</div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className={`success-message ${showSuccess ? 'show' : ''}`} ref={successMessageRef}>
            {successMessage}
          </div>
        )}

        {/* Service Buttons */}
        <div className="service-buttons">
          <button
            className={`service-button spotify-button ${connectingService === 'spotify' ? 'connecting' : ''}`}
            onClick={() => connectService('spotify')}
            disabled={connectingService !== null}
          >
            <span>
              {connectingService === 'spotify' ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect Spotify'
              )}
            </span>
          </button>

          <button
            className={`service-button apple-button ${connectingService === 'apple' ? 'connecting' : ''}`}
            onClick={() => connectService('apple')}
            disabled={connectingService !== null}
          >
            <span>
              {connectingService === 'apple' ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect Apple Music'
              )}
            </span>
          </button>

          <button
            className={`service-button soundcloud-button ${connectingService === 'soundcloud' ? 'connecting' : ''}`}
            onClick={() => connectService('soundcloud')}
            disabled={connectingService !== null}
          >
            <span>
              {connectingService === 'soundcloud' ? (
                <>
                  <span className="spinner"></span>
                  Connecting...
                </>
              ) : (
                'Connect SoundCloud'
              )}
            </span>
          </button>
        </div>

        {/* Skip Link */}
        <div className="skip-link">
          <a href="#" onClick={skipConnection}>
            Skip for now
          </a>
        </div>

        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
          <div className="progress-dot active"></div>
        </div>
      </div>
    </div>
  );
}
