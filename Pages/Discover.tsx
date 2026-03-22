import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Discover.css';

interface TrendingCard {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
}

interface ChartItem {
  id: string;
  number: number;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
}

export default function Discover() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [trending, setTrending] = useState<TrendingCard[]>([]);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trendingContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token'); // optional
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const [trendingRes, chartsRes] = await Promise.all([
          fetch('https://cozie-kohl.vercel.app/api/music/trending', { headers }),
          fetch('https://cozie-kohl.vercel.app/api/music/charts', { headers }),
        ]);

        if (!trendingRes.ok || !chartsRes.ok) throw new Error('Failed to fetch');

        const trendingData = await trendingRes.json();
        const chartsData = await chartsRes.json();

        setTrending(trendingData.trending || []);
        setCharts(chartsData.charts || []);
      } catch (err: any) {
        console.error('Error loading discover data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Search submitted:', searchQuery);
      // You can navigate to search results page or filter here
    }
  };

  const scrollTrending = (direction: 'left' | 'right') => {
    if (trendingContainerRef.current) {
      const scrollAmount = 180;
      trendingContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleTrendingScroll = () => {
    if (trendingContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = trendingContainerRef.current;
      const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      setScrollProgress(scrollPercentage);
    }
  };

  // Updated: Navigate to play-music page with song data
  const playTrending = (song: TrendingCard) => {
    navigate('/play-music', {
      state: {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        albumArtUrl: song.albumArtUrl,
        fileUrl: song.fileUrl
      }
    });
  };

  // Updated: Navigate to play-music page with song data
  const playChart = (song: ChartItem) => {
    navigate('/play-music', {
      state: {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        albumArtUrl: song.albumArtUrl,
        fileUrl: song.fileUrl
      }
    });
  };

  const navigate = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/home-feed');
        break;
      case 'search':
        break;
      case 'add':
        navigate('/share-music');
        break;
      case 'messages':
        navigate('/messages');
        break;
      case 'profile':
        navigate('/profile');
        break;
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="discover-container">
          <div className="feed-header">
            <div className="header-logo">COZIE</div>
          </div>
          <div className="loading">Loading discover...</div>
        </div>
        <BottomNav navigate={navigate} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="discover-container">
          <div className="feed-header">
            <div className="header-logo">COZIE</div>
          </div>
          <div className="error">Error: {error}</div>
        </div>
        <BottomNav navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Discover Container */}
      <div className="discover-container">
        {/* Header */}
        <div className="discover-header">
          <h1 className="discover-title">Discover</h1>

          {/* Search Bar */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search songs, artists, users..."
              value={searchQuery}
              onChange={handleSearch}
              onKeyPress={handleSearchSubmit}
            />
          </div>
        </div>

        {/* Trending Section */}
        <h2 className="section-header">TRENDING NOW</h2>

        <div className="trending-scroll-wrapper">
          <div
            className="trending-container"
            ref={trendingContainerRef}
            onScroll={handleTrendingScroll}
          >
            {trending.map((card) => (
              <div
                key={card.id}
                className="trending-card"
                style={{ background: card.albumArtUrl ? 'none' : 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)' }}
                onClick={() => playTrending(card.id)}
              >
                {card.albumArtUrl ? (
                  <img src={card.albumArtUrl} alt={card.title} className="trending-image" />
                ) : (
                  <div className="trending-info">
                    <div className="trending-title">{card.title}</div>
                    <div className="trending-artist">{card.artist}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Scroll Navigation */}
          <div className="scroll-nav">
            <button className="scroll-button" onClick={() => scrollTrending('left')}>◀</button>
            <div className="scroll-bar">
              <div className="scroll-progress" style={{ width: `${scrollProgress}%` }}></div>
            </div>
            <button className="scroll-button" onClick={() => scrollTrending('right')}>▶</button>
          </div>
        </div>

        {/* Top Charts */}
        <h2 className="section-header">TOP CHARTS</h2>

        <div className="chart-list">
          {charts.map((item) => (
            <div
              key={item.id}
              className="chart-item"
              onClick={() => playChart(item.id)}
            >
              <div className="chart-number">{item.number}</div>
              <div
                className="chart-album-art"
                style={{ background: item.albumArtUrl ? `url(${item.albumArtUrl})` : 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)', backgroundSize: 'cover' }}
              ></div>
              <div className="chart-info">
                <div className="chart-title">{item.title}</div>
                <div className="chart-artist">{item.artist}</div>
              </div>
              <div className="play-button">▶</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav navigate={navigate} />
    </div>
  );
}

function BottomNav({ navigate }: { navigate: (page: string) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-container">
        <div className="nav-item" onClick={() => navigate('home')}>
          <div className="nav-icon">🏠</div>
        </div>
        <div className="nav-item active" onClick={() => navigate('search')}>
          <div className="nav-icon">🔍</div>
        </div>
        <div className="nav-item" onClick={() => navigate('add')}>
          <div className="nav-icon">➕</div>
        </div>
        <div className="nav-item" onClick={() => navigate('messages')}>
          <div className="nav-icon">💬</div>
        </div>
        <div className="nav-item" onClick={() => navigate('profile')}>
          <div className="nav-icon">👤</div>
        </div>
      </div>
    </div>
  );
}
