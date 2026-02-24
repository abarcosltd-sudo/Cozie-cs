import { useState, useRef, useEffect } from 'react';
import './Discover.css';

interface TrendingCard {
  id: number;
  title: string;
  artist: string;
  gradient: string;
}

interface ChartItem {
  id: number;
  number: number;
  title: string;
  artist: string;
  gradient: string;
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const trendingContainerRef = useRef<HTMLDivElement>(null);

  const trendingCards: TrendingCard[] = [
    {
      id: 1,
      title: 'As It Was',
      artist: 'Harry Styles',
      gradient: 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)',
    },
    {
      id: 2,
      title: 'Heat Waves',
      artist: 'Glass Animals',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
    {
      id: 3,
      title: 'Shivers',
      artist: 'Ed Sheeran',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    },
    {
      id: 4,
      title: 'Good 4 U',
      artist: 'Olivia Rodrigo',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
    {
      id: 5,
      title: 'Stay',
      artist: 'The Kid LAROI',
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    },
  ];

  const chartItems: ChartItem[] = [
    {
      id: 1,
      number: 1,
      title: 'Anti-Hero',
      artist: 'Taylor Swift',
      gradient: 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)',
    },
    {
      id: 2,
      number: 2,
      title: 'Flowers',
      artist: 'Miley Cyrus',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    },
    {
      id: 3,
      number: 3,
      title: 'Calm Down',
      artist: 'Rema & Selena Gomez',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    },
    {
      id: 4,
      number: 4,
      title: 'Kill Bill',
      artist: 'SZA',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    },
    {
      id: 5,
      number: 5,
      title: "Creepin'",
      artist: 'Metro Boomin, The Weeknd',
      gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    console.log('Searching for:', e.target.value.toLowerCase());
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Search submitted:', searchQuery);
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

  const playTrending = (index: number) => {
    console.log('Playing trending song:', index);
  };

  const playChart = (index: number) => {
    console.log('Playing chart song:', index);
  };

  const navigate = (page: string) => {
    console.log('Navigating to:', page);
    switch (page) {
      case 'home':
        window.location.href = '/home-feed';
        break;
      case 'search':
        // Already on discover
        break;
      case 'add':
        window.location.href = '/share-music';
        break;
      case 'messages':
        window.location.href = '/messages';
        break;
      case 'profile':
        window.location.href = '/profile';
        break;
    }
  };

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
            {trendingCards.map((card) => (
              <div
                key={card.id}
                className="trending-card"
                style={{ background: card.gradient }}
                onClick={() => playTrending(card.id)}
              >
                <div className="trending-info">
                  <div className="trending-title">{card.title}</div>
                  <div className="trending-artist">{card.artist}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Navigation */}
          <div className="scroll-nav">
            <button
              className="scroll-button"
              onClick={() => scrollTrending('left')}
            >
              ◀
            </button>
            <div className="scroll-bar">
              <div
                className="scroll-progress"
                style={{ width: `${scrollProgress}%` }}
              ></div>
            </div>
            <button
              className="scroll-button"
              onClick={() => scrollTrending('right')}
            >
              ▶
            </button>
          </div>
        </div>

        {/* Top Charts */}
        <h2 className="section-header">TOP CHARTS</h2>

        <div className="chart-list">
          {chartItems.map((item) => (
            <div
              key={item.id}
              className="chart-item"
              onClick={() => playChart(item.id)}
            >
              <div className="chart-number">{item.number}</div>
              <div
                className="chart-album-art"
                style={{ background: item.gradient }}
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
    </div>
  );
}
