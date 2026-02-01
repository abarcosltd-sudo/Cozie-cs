import { useNavigate } from 'react-router-dom';
import './splash.css';

export default function Splash() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <div className="splash-page">
      <div className="bg-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>

      <div className="splash-container">
        <div className="logo-container">
          <div className="logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h1>COZIE</h1>
          <p className="tagline">Share your music vibe with friends</p>
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">🎵</div>
            <div className="feature-text">Discover and share music with your circle</div>
          </div>
          <div className="feature">
            <div className="feature-icon">💜</div>
            <div className="feature-text">Connect through the songs you love</div>
          </div>
          <div className="feature">
            <div className="feature-icon">🎧</div>
            <div className="feature-text">Build playlists together in real-time</div>
          </div>
        </div>

        <button className="cta-button" onClick={handleGetStarted}>
          Get Started
        </button>
      </div>
    </div>
  );
}
