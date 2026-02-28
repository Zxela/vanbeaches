import { render, screen } from '@testing-library/react';
import type { BeachSummary } from '@van-beaches/shared';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useBeaches', () => ({
  useBeaches: vi.fn(),
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn(() => false),
  })),
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

// Mock FavoritesView to easily detect when it renders
vi.mock('../components/FavoritesView', () => ({
  FavoritesView: ({ favorites }: { favorites: unknown[] }) => (
    <div data-testid="favorites-view">
      FavoritesView ({favorites.length} favorites)
    </div>
  ),
}));

// Mock DiscoveryView to easily detect when it renders
vi.mock('../components/DiscoveryView', () => ({
  DiscoveryView: ({ beaches }: { beaches: unknown[] }) => (
    <div data-testid="discovery-view">
      DiscoveryView ({beaches.length} beaches)
    </div>
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
import { useFavorites } from '../hooks/useFavorites';
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

describe('Discover page - smart landing pattern (task-014)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  // AC-001: When user has favorites in localStorage, Discover renders FavoritesView
  it('renders FavoritesView when user has favorites', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: ['kitsilano'],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => true),
    });

    renderDiscover();

    expect(screen.getByTestId('favorites-view')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-view')).not.toBeInTheDocument();
  });

  it('passes favorited Beach objects (not just IDs) to FavoritesView', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: ['kitsilano'],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => true),
    });

    renderDiscover();

    // The mock FavoritesView displays the count — 1 favorite
    expect(screen.getByTestId('favorites-view')).toHaveTextContent('1 favorites');
  });

  // AC-002: When user has no favorites, Discover renders DiscoveryView
  it('renders DiscoveryView when user has no favorites', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    renderDiscover();

    expect(screen.getByTestId('discovery-view')).toBeInTheDocument();
    expect(screen.queryByTestId('favorites-view')).not.toBeInTheDocument();
  });

  it('passes all Beach objects to DiscoveryView', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    renderDiscover();

    // The mock DiscoveryView displays the count — BEACHES has 2 items
    expect(screen.getByTestId('discovery-view')).toHaveTextContent('2 beaches');
  });

  // AC-003: Old HeroSection, RecommendedSection, AllBeachesSection removed
  it('does not render a HeroSection with full-bleed hero image', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    const { container } = renderDiscover();

    // The old HeroSection used a specific hero image URL
    const heroImages = container.querySelectorAll(
      'img[src*="unsplash.com/photo-1559128010-7c1ad6e1b6a5"]',
    );
    expect(heroImages.length).toBe(0);
  });

  it('does not render "Today\'s top picks" heading (old RecommendedSection)', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    renderDiscover();

    expect(screen.queryByText("Today's top picks")).not.toBeInTheDocument();
  });

  it('does not render "All Beaches" heading (old AllBeachesSection)', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    renderDiscover();

    expect(screen.queryByText('All Beaches')).not.toBeInTheDocument();
  });

  // AC-004: SearchFilter preserved within DiscoveryView (not at Discover page level)
  // SearchFilter is now inside DiscoveryView — the Discover page itself should not
  // directly render SearchFilter (it's the DiscoveryView's responsibility)
  it('does not render SearchFilter directly at the Discover page level', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });

    renderDiscover();

    // With DiscoveryView mocked, SearchFilter should NOT appear because
    // Discover.tsx itself does not render SearchFilter directly
    expect(screen.queryByText('Swimming')).not.toBeInTheDocument();
    expect(screen.queryByText('Water sports')).not.toBeInTheDocument();
  });

  // Loading state: passes loading to the appropriate view
  it('renders DiscoveryView in loading state when no favorites and beaches are loading', () => {
    vi.mocked(useFavorites).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });
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
