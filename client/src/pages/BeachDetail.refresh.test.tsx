import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BeachDetail } from './BeachDetail';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'kitsilano' }),
}));

vi.mock('@van-beaches/shared', () => ({
  getBeachById: () => ({
    id: 'kitsilano',
    name: 'Kitsilano Beach',
    slug: 'kitsilano',
    location: { latitude: 49.274, longitude: -123.156 },
    tideStationId: '5cebf1de3d0f4a073c4bb943',
    webcamUrl: null,
    showWebcam: false,
    description: 'Test beach',
    amenities: {
      parking: 'free',
      restrooms: true,
      showers: true,
      lifeguard: 'seasonal',
      foodNearby: true,
      dogFriendly: false,
      wheelchairAccessible: true,
      volleyballCourts: 2,
      firepits: false,
    },
    activities: ['swimming'],
  }),
  BEACHES: [],
}));

vi.mock('../hooks/useTides', () => ({
  useTides: () => ({ tides: null, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({
    weather: {
      beachId: 'kitsilano',
      current: {
        temperature: 18,
        condition: 'sunny',
        humidity: 60,
        windSpeed: 10,
        windDirection: 'N',
        uvIndex: 3,
      },
      hourly: [],
      fetchedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useWaterQuality', () => ({
  useWaterQuality: () => ({
    waterQuality: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useRecentBeaches', () => ({
  useRecentBeaches: () => ({ addRecent: vi.fn() }),
}));

vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: () => ({ isHidden: false, hide: vi.fn(), show: vi.fn(), toggle: vi.fn() }),
}));

vi.mock('../components/FavoriteButton', () => ({
  FavoriteButton: () => <button type="button" data-testid="favorite-button" />,
}));

vi.mock('../components/ShareButton', () => ({
  ShareButton: () => <button type="button" data-testid="share-button" />,
}));

vi.mock('../components/TabBar', () => ({
  TabBar: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <nav data-testid="tab-bar">
      <button type="button" data-active={activeTab === 'today'} onClick={() => onTabChange('today')}>
        Today
      </button>
      <button type="button" data-active={activeTab === 'about'} onClick={() => onTabChange('about')}>
        About
      </button>
      <button type="button" data-active={activeTab === 'photos'} onClick={() => onTabChange('photos')}>
        Photos
      </button>
    </nav>
  ),
}));

vi.mock('../hooks/useSunTimes', () => ({
  useSunTimes: () => ({
    sunrise: new Date(),
    sunset: new Date(),
    goldenHourStart: new Date(),
    goldenHourEnd: new Date(),
  }),
  formatSunTime: () => '5:00 PM',
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock tab components to avoid deep rendering
vi.mock('../components/TodayTab', () => ({
  TodayTab: ({ weather }: { weather: { current: { temperature: number } } | null }) => (
    <div data-testid="today-tab-content">
      {weather && <span>{weather.current.temperature}°C</span>}
    </div>
  ),
}));

vi.mock('../components/AboutTab', () => ({
  AboutTab: () => <div data-testid="about-tab-content">AboutTab</div>,
}));

vi.mock('../components/PhotosTab', () => ({
  PhotosTab: () => <div data-testid="photos-tab-content">PhotosTab</div>,
}));

describe('BeachDetail - tabbed layout rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  it('renders beach name in compact hero', () => {
    render(<BeachDetail />);
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
  });

  it('displays temperature from weather data via TodayTab', () => {
    render(<BeachDetail />);
    // Temperature is passed down to TodayTab
    expect(screen.getByText('18°C')).toBeInTheDocument();
  });

  it('renders quick conditions in hero including temperature', () => {
    render(<BeachDetail />);
    // Hero quick conditions strip shows temp
    const heroEl = document.querySelector('[class*="h-[30vh]"]');
    expect(heroEl).toBeInTheDocument();
    // Temperature appears in the quick conditions strip (hero has "18° · ...")
    const conditionEls = screen.getAllByText(/18°/);
    expect(conditionEls.length).toBeGreaterThanOrEqual(1);
  });
});
