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
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock page sections
vi.mock('../components/TodayTab', () => ({
  TodayTab: () => <div data-testid="today-tab-content">TodayTab Content</div>,
}));

vi.mock('../components/AboutTab', () => ({
  AboutTab: () => <div data-testid="about-tab-content">AboutTab Content</div>,
}));

vi.mock('../components/PhotosTab', () => ({
  PhotosTab: () => <div data-testid="photos-tab-content">PhotosTab Content</div>,
}));

vi.mock('../components/FavoriteButton', () => ({
  FavoriteButton: () => <button type="button" data-testid="favorite-button" />,
}));

vi.mock('../components/ShareButton', () => ({
  ShareButton: () => <button type="button" data-testid="share-button" />,
}));

vi.mock('../components/BeachNavigation', () => ({
  BeachNavigation: ({ currentBeachId }: { currentBeachId: string }) => (
    <nav data-testid="beach-navigation">
      <a href={`/beach/prev-${currentBeachId}`} data-testid="beach-nav-prev">
        Prev Beach
      </a>
      <a href={`/beach/next-${currentBeachId}`} data-testid="beach-nav-next">
        Next Beach
      </a>
    </nav>
  ),
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

    it('hero provides an immersive mobile viewport', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      const heroEl = container.querySelector('[class*="min-h-[31rem]"]');
      expect(heroEl).toBeInTheDocument();
    });

    it('hero grows on larger viewports', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      const heroEl = container.querySelector('[class*="sm:min-h-[34rem]"]');
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

    it('hero uses a subtle atmospheric overlay', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      const overlayEl = container.querySelector('[class*="from-black/10"]');
      expect(overlayEl).toBeInTheDocument();
    });
  });

  describe('continuous forecast experience', () => {
    it('provides accessible links to each page section', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      const sectionNav = screen.getByRole('navigation', { name: 'Beach page sections' });
      expect(sectionNav).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /forecast/i })).toHaveAttribute('href', '#today');
      expect(screen.getByRole('link', { name: /beach guide/i })).toHaveAttribute('href', '#about');
      expect(screen.getByRole('link', { name: /community/i })).toHaveAttribute('href', '#photos');
    });

    it('keeps forecast and beach guide content in the continuous document', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      expect(screen.getByTestId('today-tab-content')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Plan your visit' })).toBeInTheDocument();
      expect(screen.getByTestId('about-tab-content')).toBeInTheDocument();

      const forecast = container.querySelector('#today');
      const guide = container.querySelector('#about');
      expect(forecast).toBeInTheDocument();
      expect(guide).toBeInTheDocument();
      if (!forecast || !guide) throw new Error('Expected continuous page sections');
      expect(
        forecast.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('keeps community photos secondary in a collapsed disclosure', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      const { container } = render(<BeachDetail />);

      const disclosure = container.querySelector('details#photos');
      expect(disclosure).toBeInTheDocument();
      expect(disclosure).not.toHaveAttribute('open');
      expect(screen.getByText('Photos and local posts')).toBeInTheDocument();
      expect(screen.getByTestId('photos-tab-content')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Photos and local posts'));
      expect(disclosure).toHaveAttribute('open');
    });
  });

  // AC-008-int: BeachNavigation component is rendered on the beach detail page
  describe('AC-008-int: BeachNavigation integration', () => {
    it('renders beach-nav-prev link', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('beach-nav-prev')).toBeInTheDocument();
    });

    it('renders beach-nav-next link', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('beach-nav-next')).toBeInTheDocument();
    });
  });
});
