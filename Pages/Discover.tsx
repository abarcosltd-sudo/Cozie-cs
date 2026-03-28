import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Discover.css';

interface TrendingCard {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
  fileUrl?: string;  // Add this
  duration?: number; // Optional
  genre?: string;    // Optional
  releaseYear?: string; // Optional
}

interface ChartItem {
  id: string;
  number: number;
  title: string;
  artist: string;
  albumArtUrl?: string | null;
  fileUrl?: string;  // Add this
  duration?: number; // Optional
  genre?: string;    // Optional
  releaseYear?: string; // Optional
}

export default function Discover() {
  const navigate = useNavigate(); // Renamed from navigate to navigateTo to avoid conflict
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
        const token = localStorage.getItem('token');
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
      // Navigate to search results page
      navigate(`/search-results?q=${encodeURIComponent(searchQuery)}`);
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

  const handlePlayTrending = (song: TrendingCard) => {
  // Pass the selected song as the current track
    navigate('/play-music', {
      state: {
        currentSong: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          albumArtUrl: song.albumArtUrl,
          fileUrl: song.fileUrl,
          duration: song.duration,
          genre: song.genre,
          releaseYear: song.releaseYear
        },
        queue: trending, // Pass the entire trending list as queue
        startFromSongId: song.id // Tell player which song to start from
      }
    });
  };

  const handlePlayChart = (song: ChartItem) => {
    // Pass the selected song as the current track
    navigate('/play-music', {
      state: {
        currentSong: {
          id: song.id,
          title: song.title,
          artist: song.artist,
          albumArtUrl: song.albumArtUrl,
          fileUrl: song.fileUrl,
          duration: song.duration,
          genre: song.genre,
          releaseYear: song.releaseYear
        },
        queue: charts, // Pass the entire charts list as queue
        startFromSongId: song.id // Tell player which song to start from
      }
    });
  };
  const navigateToPage = (page: string) => {
    switch (page) {
      case 'home':
        navigate('/home-feed');
        break;
      case 'search':
        // Already on discover
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
            <div className="header-logo">COOZIE</div>
          </div>
          <div className="loading">Loading discover...</div>
        </div>
        <BottomNav navigateToPage={navigateToPage} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="discover-container">
          <div className="feed-header">
            <div className="header-logo">COOZIE</div>
          </div>
          <div className="error">Error: {error}</div>
        </div>
        <BottomNav navigateToPage={navigateToPage} />
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
                onClick={() => handlePlayTrending(card)}
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
              onClick={() => handlePlayChart(item)}
            >
              <div className="chart-number">{item.number}</div>
              <div
                className="chart-album-art"
                style={{ background: item.albumArtUrl ? `url(${item.albumArtUrl})` : 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)', backgroundSize: 'cover', backgroundPosition: 'center' }}
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
      <BottomNav navigateToPage={navigateToPage} />
    </div>
  );
}

function BottomNav({ navigateToPage }: { navigateToPage: (page: string) => void }) {
  return (
    <div className="bottom-nav">
      <div className="nav-container">
        <div className="nav-item" onClick={() => navigateToPage('home')}>
          <div className="nav-icon">🏠</div>
        </div>
        <div className="nav-item active" onClick={() => navigateToPage('search')}>
          <div className="nav-icon">🔍</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('add')}>
          <div className="nav-icon">➕</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('messages')}>
          <div className="nav-icon">💬</div>
        </div>
        <div className="nav-item" onClick={() => navigateToPage('profile')}>
          <div className="nav-icon">👤</div>
        </div>
      </div>
    </div>
  );
}
