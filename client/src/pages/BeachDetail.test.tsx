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
}));

// Mock all hooks
vi.mock('../hooks/useTides', () => ({
  useTides: () => ({ tides: null, loading: false, error: null }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({ weather: null, loading: false, error: null }),
}));

vi.mock('../hooks/useWaterQuality', () => ({
  useWaterQuality: () => ({ waterQuality: null, loading: false, error: null }),
}));

vi.mock('../hooks/useRecentBeaches', () => ({
  useRecentBeaches: () => ({ addRecent: vi.fn() }),
}));

// Mock useWebcamPreference with controllable state
const mockHide = vi.fn();
const mockShow = vi.fn();
let mockIsHidden = false;
vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: () => ({
    isHidden: mockIsHidden,
    hide: mockHide,
    show: mockShow,
    toggle: vi.fn(),
  }),
}));

// Mock components to simplify testing
vi.mock('../components/WebcamEmbed', () => ({
  WebcamEmbed: ({
    url,
    beachName,
    onHide,
  }: { url: string; beachName: string; onHide: () => void }) => (
    <div data-testid="webcam-embed" data-url={url} data-beach-name={beachName}>
      WebcamEmbed
      <button type="button" onClick={onHide} data-testid="webcam-hide-button">
        Hide
      </button>
    </div>
  ),
}));

vi.mock('../components/WebcamPlaceholder', () => ({
  WebcamPlaceholder: ({ onShow }: { onShow: () => void }) => (
    <button type="button" data-testid="webcam-placeholder" onClick={onShow}>
      Show webcam
    </button>
  ),
}));

vi.mock('../components/FullscreenWebcam', () => ({
  FullscreenWebcam: ({ url, beachName }: { url: string; beachName: string }) => (
    <div data-testid="fullscreen-webcam" data-url={url} data-beach-name={beachName}>
      FullscreenWebcam
    </div>
  ),
}));

// Mock other components that aren't relevant for webcam tests
vi.mock('../components/ActivityRecommendations', () => ({
  ActivityRecommendations: () => <div data-testid="activity-recommendations" />,
}));

vi.mock('../components/BeachAmenities', () => ({
  BeachAmenities: () => <div data-testid="beach-amenities" />,
}));

vi.mock('../components/BestTimeToVisit', () => ({
  BestTimeToVisit: () => <div data-testid="best-time-to-visit" />,
}));

vi.mock('../components/FavoriteButton', () => ({
  FavoriteButton: () => <button type="button" data-testid="favorite-button" />,
}));

vi.mock('../components/ShareButton', () => ({
  ShareButton: () => <button type="button" data-testid="share-button" />,
}));

vi.mock('../components/SunTimesWidget', () => ({
  SunTimesWidget: () => <div data-testid="sun-times-widget" />,
}));

vi.mock('../components/TideCanvas', () => ({
  TideCanvas: () => <div data-testid="tide-canvas" />,
}));

vi.mock('../components/TideForecast', () => ({
  TideForecast: () => <div data-testid="tide-forecast" />,
}));

vi.mock('../components/WaterQuality', () => ({
  WaterQuality: () => <div data-testid="water-quality" />,
}));

vi.mock('../components/WeatherForecast', () => ({
  WeatherForecast: () => <div data-testid="weather-forecast" />,
}));

vi.mock('../components/WeatherWidget', () => ({
  WeatherWidget: () => <div data-testid="weather-widget" />,
}));

describe('BeachDetail', () => {
  const baseBeach = {
    id: 'test-beach',
    name: 'Test Beach',
    slug: 'test-beach',
    location: { latitude: 49.27, longitude: -123.15 },
    tideStationId: 'station-123',
    webcamUrl: null,
    showWebcam: undefined,
    description: 'A beautiful test beach',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHidden = false;
    mockUseParams.mockReturnValue({ slug: 'test-beach' });
  });

  describe('webcam visibility logic', () => {
    it('renders nothing when beach has no webcamUrl', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: null,
        showWebcam: undefined,
      });

      render(<BeachDetail />);

      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webcam-placeholder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fullscreen-webcam')).not.toBeInTheDocument();
    });

    it('renders nothing when beach has showWebcam: false', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: false,
      });

      render(<BeachDetail />);

      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webcam-placeholder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fullscreen-webcam')).not.toBeInTheDocument();
    });

    it('renders nothing when beach has showWebcam: undefined', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: undefined,
      });

      render(<BeachDetail />);

      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webcam-placeholder')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fullscreen-webcam')).not.toBeInTheDocument();
    });

    it('renders WebcamEmbed when webcam available and user has not hidden', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: true,
      });
      mockIsHidden = false;

      render(<BeachDetail />);

      expect(screen.getByTestId('webcam-embed')).toBeInTheDocument();
      expect(screen.getByTestId('webcam-embed')).toHaveAttribute(
        'data-url',
        'https://example.com/webcam.jpg',
      );
      expect(screen.getByTestId('fullscreen-webcam')).toBeInTheDocument();
      expect(screen.queryByTestId('webcam-placeholder')).not.toBeInTheDocument();
    });

    it('renders WebcamPlaceholder when user has hidden webcams', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: true,
      });
      mockIsHidden = true;

      render(<BeachDetail />);

      expect(screen.getByTestId('webcam-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fullscreen-webcam')).not.toBeInTheDocument();
    });

    it('FullscreenWebcam only renders alongside WebcamEmbed', () => {
      // When webcam embed is shown
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: true,
      });
      mockIsHidden = false;

      const { rerender } = render(<BeachDetail />);

      expect(screen.getByTestId('webcam-embed')).toBeInTheDocument();
      expect(screen.getByTestId('fullscreen-webcam')).toBeInTheDocument();

      // When placeholder is shown (user hidden)
      mockIsHidden = true;
      rerender(<BeachDetail />);

      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fullscreen-webcam')).not.toBeInTheDocument();
      expect(screen.getByTestId('webcam-placeholder')).toBeInTheDocument();
    });
  });

  describe('hide/show callbacks', () => {
    it('passes hide callback to WebcamEmbed', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: true,
      });
      mockIsHidden = false;

      render(<BeachDetail />);

      const hideButton = screen.getByTestId('webcam-hide-button');
      fireEvent.click(hideButton);

      expect(mockHide).toHaveBeenCalledTimes(1);
    });

    it('passes show callback to WebcamPlaceholder', () => {
      mockGetBeachById.mockReturnValue({
        ...baseBeach,
        webcamUrl: 'https://example.com/webcam.jpg',
        showWebcam: true,
      });
      mockIsHidden = true;

      render(<BeachDetail />);

      const placeholder = screen.getByTestId('webcam-placeholder');
      fireEvent.click(placeholder);

      expect(mockShow).toHaveBeenCalledTimes(1);
    });
  });

  describe('beach not found', () => {
    it('renders not found message when beach does not exist', () => {
      mockGetBeachById.mockReturnValue(undefined);

      render(<BeachDetail />);

      expect(screen.getByText('Beach not found')).toBeInTheDocument();
      expect(screen.queryByTestId('webcam-embed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webcam-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('beach details rendering', () => {
    it('renders beach name and description', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByText('Test Beach')).toBeInTheDocument();
      expect(screen.getByText('A beautiful test beach')).toBeInTheDocument();
    });

    it('renders all expected widgets', () => {
      mockGetBeachById.mockReturnValue(baseBeach);

      render(<BeachDetail />);

      expect(screen.getByTestId('weather-widget')).toBeInTheDocument();
      expect(screen.getByTestId('tide-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('tide-forecast')).toBeInTheDocument();
      expect(screen.getByTestId('water-quality')).toBeInTheDocument();
      expect(screen.getByTestId('beach-amenities')).toBeInTheDocument();
      expect(screen.getByTestId('favorite-button')).toBeInTheDocument();
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });
  });
});
