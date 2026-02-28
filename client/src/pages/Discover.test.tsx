import { render, screen } from '@testing-library/react';
import type { BeachSummary } from '@van-beaches/shared';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useBeaches', () => ({
  useBeaches: vi.fn(),
}));

vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: vi.fn(() => ({
    isHidden: false,
    hide: vi.fn(),
    show: vi.fn(),
    toggle: vi.fn(),
  })),
}));

vi.mock('../components/BeachMap', () => ({
  BeachMap: () => (
    <div>
      <h3>Beach Map</h3>
    </div>
  ),
}));

// Mock DiscoveryView to easily detect when it renders
vi.mock('../components/DiscoveryView', () => ({
  DiscoveryView: ({ beaches }: { beaches: unknown[] }) => (
    <div data-testid="discovery-view">DiscoveryView ({beaches.length} beaches)</div>
  ),
}));

vi.mock('@van-beaches/shared', () => ({
  BEACHES: [
    {
      id: 'kitsilano',
      name: 'Kitsilano Beach',
      slug: 'kitsilano',
      location: { latitude: 49.274, longitude: -123.156 },
      tideStationId: 'abc',
      webcamUrl: null,
      showWebcam: false,
      description: '',
      amenities: {
        parking: 'free',
        restrooms: true,
        showers: true,
        lifeguard: 'seasonal',
        foodNearby: true,
        dogFriendly: true,
        wheelchairAccessible: true,
        volleyballCourts: 0,
        firepits: false,
      },
      activities: ['swimming'],
    },
    {
      id: 'english-bay',
      name: 'English Bay Beach',
      slug: 'english-bay',
      location: { latitude: 49.282, longitude: -123.141 },
      tideStationId: 'abc',
      webcamUrl: null,
      showWebcam: false,
      description: '',
      amenities: {
        parking: 'paid',
        restrooms: true,
        showers: false,
        lifeguard: 'none',
        foodNearby: true,
        dogFriendly: false,
        wheelchairAccessible: false,
        volleyballCourts: 0,
        firepits: false,
      },
      activities: ['walking'],
    },
  ],
}));

import { useBeaches } from '../hooks/useBeaches';
import { Discover } from './Discover';

const mockBeachSummaries: BeachSummary[] = [
  {
    id: 'kitsilano',
    name: 'Kitsilano Beach',
    currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
    nextTide: { type: 'high', time: '14:30', height: 4.2 },
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'english-bay',
    name: 'English Bay Beach',
    currentWeather: null,
    nextTide: null,
    waterQuality: 'unknown',
    lastUpdated: new Date().toISOString(),
  },
];

function renderDiscover() {
  return render(
    <MemoryRouter>
      <Discover />
    </MemoryRouter>,
  );
}

describe('Discover page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('always renders DiscoveryView with all beaches', () => {
    renderDiscover();

    expect(screen.getByTestId('discovery-view')).toBeInTheDocument();
    expect(screen.getByTestId('discovery-view')).toHaveTextContent('2 beaches');
  });

  it('does not render a HeroSection with full-bleed hero image', () => {
    const { container } = renderDiscover();

    const heroImages = container.querySelectorAll(
      'img[src*="unsplash.com/photo-1559128010-7c1ad6e1b6a5"]',
    );
    expect(heroImages.length).toBe(0);
  });

  it('does not render "Today\'s top picks" heading (old RecommendedSection)', () => {
    renderDiscover();
    expect(screen.queryByText("Today's top picks")).not.toBeInTheDocument();
  });

  it('does not render "All Beaches" heading (old AllBeachesSection)', () => {
    renderDiscover();
    expect(screen.queryByText('All Beaches')).not.toBeInTheDocument();
  });

  it('renders DiscoveryView in loading state', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    expect(screen.getByTestId('discovery-view')).toBeInTheDocument();
  });
});
