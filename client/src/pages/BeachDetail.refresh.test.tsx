import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BeachDetail } from './BeachDetail';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'kitsilano' }),
}));

const mockRefetchWeather = vi.fn().mockResolvedValue(undefined);
const mockRefetchTides = vi.fn().mockResolvedValue(undefined);
const mockRefetchWaterQuality = vi.fn().mockResolvedValue(undefined);

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
      parking: 'free', restrooms: true, showers: true,
      lifeguard: 'seasonal', foodNearby: true, dogFriendly: false,
      wheelchairAccessible: true, volleyballCourts: 2, firepits: false,
    },
    activities: ['swimming'],
  }),
}));

vi.mock('../hooks/useTides', () => ({
  useTides: () => ({ tides: null, loading: false, error: null, refetch: mockRefetchTides }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({
    weather: {
      beachId: 'kitsilano',
      current: { temperature: 18, condition: 'sunny', humidity: 60, windSpeed: 10, windDirection: 'N', uvIndex: 3 },
      hourly: [], fetchedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    loading: false,
    error: null,
    refetch: mockRefetchWeather,
  }),
}));

vi.mock('../hooks/useWaterQuality', () => ({
  useWaterQuality: () => ({ waterQuality: null, loading: false, error: null, refetch: mockRefetchWaterQuality }),
}));

vi.mock('../hooks/useRecentBeaches', () => ({
  useRecentBeaches: () => ({ addRecent: vi.fn() }),
}));

vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: () => ({ isHidden: false, hide: vi.fn(), show: vi.fn(), toggle: vi.fn() }),
}));

vi.mock('../hooks/useSunTimes', () => ({
  useSunTimes: () => ({
    sunrise: new Date(), sunset: new Date(),
    goldenHourStart: new Date(), goldenHourEnd: new Date(),
  }),
  formatSunTime: () => '5:00 PM',
}));

describe('BeachDetail - refresh controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetchWeather.mockResolvedValue(undefined);
    mockRefetchTides.mockResolvedValue(undefined);
    mockRefetchWaterQuality.mockResolvedValue(undefined);
  });

  it('renders a Refresh button in the header', () => {
    render(<BeachDetail />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('calls refetch on all three hooks when refresh button is clicked', async () => {
    render(<BeachDetail />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockRefetchWeather).toHaveBeenCalledTimes(1);
      expect(mockRefetchTides).toHaveBeenCalledTimes(1);
      expect(mockRefetchWaterQuality).toHaveBeenCalledTimes(1);
    });
  });

  it('displays Last updated timestamp derived from weather.fetchedAt', () => {
    render(<BeachDetail />);
    expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    expect(screen.getByText(/min ago/i)).toBeInTheDocument();
  });
});
