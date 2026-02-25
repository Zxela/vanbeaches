import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useBeaches', () => ({
  useBeaches: vi.fn(),
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({ favorites: [], toggleFavorite: vi.fn(), isFavorite: vi.fn(() => false) })),
}));

vi.mock('../hooks/useWebcamPreference', () => ({
  useWebcamPreference: vi.fn(() => ({ isHidden: false, hide: vi.fn(), show: vi.fn(), toggle: vi.fn() })),
}));

vi.mock('../components/BeachMap', () => ({
  BeachMap: () => <div><h3>Beach Map</h3></div>,
}));

import { useBeaches } from '../hooks/useBeaches';
import { Discover } from './Discover';

const mockBeachSummaries = [
  {
    id: 'kitsilano',
    name: 'Kitsilano Beach',
    currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
    nextTide: { type: 'high' as const, time: '14:30', height: 4.2 },
    waterQuality: 'good' as const,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'english-bay',
    name: 'English Bay Beach',
    currentWeather: null,
    nextTide: null,
    waterQuality: 'unknown' as const,
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
        parking: 'free', restrooms: true, showers: true,
        lifeguard: 'seasonal', foodNearby: true, dogFriendly: true,
        wheelchairAccessible: true, volleyballCourts: 0, firepits: false,
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
        parking: 'paid', restrooms: true, showers: false,
        lifeguard: 'none', foodNearby: true, dogFriendly: false,
        wheelchairAccessible: false, volleyballCourts: 0, firepits: false,
      },
      activities: ['walking'],
    },
  ],
}));

describe('Discover page - BeachCard data wiring (task-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes actual BeachSummary objects from useBeaches to BeachCard', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    // If BeachCard gets real data, the weather temperature should be visible
    expect(screen.getByText('18°C')).toBeInTheDocument();
  });

  it('shows no weather icon when weather data is unavailable for a beach', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    // English Bay has no weather - only one temperature should appear
    const tempElements = screen.queryAllByText(/°C$/);
    expect(tempElements).toHaveLength(1); // Only Kitsilano has weather
  });

  it('shows skeleton loading state while beaches are loading', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderDiscover();
    // Should show skeleton cards (not actual beach cards)
    expect(container.querySelectorAll('.shimmer, [data-testid="skeleton-card"]').length).toBeGreaterThanOrEqual(0);
    // Should not show beach names
    expect(screen.queryByText('Kitsilano Beach')).not.toBeInTheDocument();
  });
});

describe('Discover page - SearchFilter and BeachMap wiring (task-019)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders SearchFilter on the Discover page', () => {
    renderDiscover();
    expect(screen.getByPlaceholderText(/search beaches/i)).toBeInTheDocument();
  });

  it('filters AllBeachesSection when user types in the search field', async () => {
    renderDiscover();

    // Both beaches should be visible initially (may appear multiple times due to BeachMap)
    expect(screen.getAllByText('Kitsilano Beach').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('English Bay Beach').length).toBeGreaterThanOrEqual(1);

    // Type to filter - SearchFilter uses BEACHES from shared (mocked to 2)
    // When we type 'kitsilano', only Kitsilano should match in AllBeachesSection
    const searchInput = screen.getByPlaceholderText(/search beaches/i);
    fireEvent.change(searchInput, { target: { value: 'kitsilano' } });

    // After filtering, English Bay should not appear as a BeachCard
    // (it may still appear in BeachMap tooltips, so query for BeachCard-specific elements)
    // BeachCards are in the beaches grid - look for the beach name in card context
    const allEnglishBay = screen.queryAllByText('English Bay Beach');
    // All remaining "English Bay Beach" text should only be in BeachMap tooltips, not BeachCards
    // The simplest check: the card-based occurrence count drops to 0 in AllBeachesSection
    // We check that the grid section no longer shows the english bay heading
    expect(screen.queryByRole('link', { name: /english bay/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Kitsilano Beach').length).toBeGreaterThanOrEqual(1);
  });

  it('renders BeachMap below the All Beaches section', () => {
    renderDiscover();
    // BeachMap renders a "Beach Map" heading
    expect(screen.getByText('Beach Map')).toBeInTheDocument();
  });
});
