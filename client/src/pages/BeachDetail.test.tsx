import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BeachDetail } from './BeachDetail';

// Mock react-router-dom
const mockUseParams = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
}));

// Mock getBeachById from shared package
const mockGetBeachById = vi.fn();
vi.mock('@van-beaches/shared', () => ({
  getBeachById: (slug: string) => mockGetBeachById(slug),
  BEACHES: [],
}));

// Mock all hooks
vi.mock('../hooks/useTides', () => ({
  useTides: () => ({ tides: null, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({ weather: null, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('../hooks/useWaterQuality', () => ({
  useWaterQuality: () => ({ waterQuality: null, loading: false, error: null, refetch: vi.fn() }),
}));

vi.mock('../hooks/useRecentBeaches', () => ({
  useRecentBeaches: () => ({ addRecent: vi.fn() }),
}));

vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: () => ({
    isHidden: false,
    hide: vi.fn(),
    show: vi.fn(),
    toggle: vi.fn(),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock tab components
vi.mock('../components/TodayTab', () => ({
  TodayTab: () => <div data-testid="today-tab-content">TodayTab Content</div>,
}));

vi.mock('../components/AboutTab', () => ({
  AboutTab: () => <div data-testid="about-tab-content">AboutTab Content</div>,
}));

vi.mock('../components/PhotosTab', () => ({
  PhotosTab: () => <div data-testid="photos-tab-content">PhotosTab Content</div>,
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
      <button
        type="button"
        data-testid="tab-today"
        data-active={activeTab === 'today'}
        onClick={() => onTabChange('today')}
      >
        Today
      </button>
      <button
        type="button"
        data-testid="tab-about"
        data-active={activeTab === 'about'}
        onClick={() => onTabChange('about')}
      >
        About
      </button>
      <button
        type="button"
        data-testid="tab-photos"
        data-active={activeTab === 'photos'}
        onClick={() => onTabChange('photos')}
      >
        Photos
      </button>
    </nav>
  ),
}));

vi.mock('../components/FavoriteButton', () => ({
  FavoriteButton: () => <button type="button" data-testid="favorite-button" />,
}));

vi.mock('../components/ShareButton', () => ({
  ShareButton: () => <button type="button" data-testid="share-button" />,
}));

describe('BeachDetail', () => {
  const baseBeach = {
    id: 'test-beach',
    name: 'Test Beach',
    slug: 'test-beach',
    location: { latitude: 49.27, longitude: -123.15 },
    tideStationId: 'station-123',
    tagline: 'The Sporty Heart',
    webcamUrl: null,
    showWebcam: undefined,
    description: 'A beautiful test beach',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ slug: 'test-beach' });
    // Reset hash to empty
    window.location.hash = '';
  });

  describe('beach not found', () => {
    it('renders not found message when beach does not exist', () => {
      mockGetBeachById.mockReturnValue(undefined);

      render(<BeachDetail />);

      expect(screen.getByText('Beach not found')).toBeInTheDocument();
    });
  });

  // AC-001: Compact hero with beach name, personality tagline, quick conditions strip
  describe('AC-001: compact hero', () => {
    it('renders beach name in hero', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByText(baseBeach.name)).toBeInTheDocument();
    });

    it('hero has compact (~30vh) height class', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      // Hero should have h-[30vh] class (compact, not 40vh)
      const heroEl = container.querySelector('[class*="h-[30vh]"]');
      expect(heroEl).toBeInTheDocument();
    });

    it('renders personality tagline in hero', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByText('The Sporty Heart')).toBeInTheDocument();
    });

    it('renders FavoriteButton and ShareButton in hero area', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('favorite-button')).toBeInTheDocument();
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });

    // AC-005: Hero overlay uses from-black/40 (lighter than current from-black/70)
    it('hero gradient overlay uses from-black/40 (lighter overlay)', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      // The gradient overlay div should use from-black/40, not from-black/70
      const overlayEl = container.querySelector('[class*="from-black/40"]');
      expect(overlayEl).toBeInTheDocument();
    });
  });

  // AC-002: TabBar with Today/About/Photos; Today is default active
  describe('AC-002: TabBar with Today default active', () => {
    it('renders TabBar with Today, About, Photos tabs', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
    });

    it('Today tab is active by default', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      const todayTab = screen.getByTestId('tab-today');
      expect(todayTab).toHaveAttribute('data-active', 'true');
    });

    it('renders TodayTab content by default', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('today-tab-content')).toBeInTheDocument();
    });
  });

  // AC-003: Clicking About tab renders AboutTab and updates URL hash to #about
  describe('AC-003: clicking About tab switches to AboutTab and updates hash', () => {
    it('clicking About tab renders AboutTab content', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      fireEvent.click(screen.getByTestId('tab-about'));

      expect(screen.getByTestId('about-tab-content')).toBeInTheDocument();
    });

    it('clicking About tab updates URL hash to #about', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      fireEvent.click(screen.getByTestId('tab-about'));

      expect(window.location.hash).toBe('#about');
    });

    it('clicking Today tab updates URL hash to #today', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      // First go to about
      fireEvent.click(screen.getByTestId('tab-about'));
      // Then back to today
      fireEvent.click(screen.getByTestId('tab-today'));

      expect(window.location.hash).toBe('#today');
    });
  });

  // AC-004: When URL has #photos hash on load, Photos tab is initially active
  describe('AC-004: URL hash determines initial active tab', () => {
    it('When URL has #photos hash on load, Photos tab is initially active', () => {
      window.location.hash = '#photos';
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      const photosTab = screen.getByTestId('tab-photos');
      expect(photosTab).toHaveAttribute('data-active', 'true');
    });

    it('When URL has #about hash on load, About tab is initially active', () => {
      window.location.hash = '#about';
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      const aboutTab = screen.getByTestId('tab-about');
      expect(aboutTab).toHaveAttribute('data-active', 'true');
    });

    it('When URL has #photos hash on load, PhotosTab content is visible', () => {
      window.location.hash = '#photos';
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('photos-tab-content')).toBeInTheDocument();
    });
  });
});
