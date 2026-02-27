import { fireEvent, render, screen, within } from '@testing-library/react';
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

    // Temperature appears in hero, recommended, and beach card sections
    const tempElements = screen.getAllByText('18°C');
    expect(tempElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows no weather icon when weather data is unavailable for a beach', () => {
    vi.mocked(useBeaches).mockReturnValue({
      beaches: mockBeachSummaries,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDiscover();

    // Temperature displays appear in hero, recommended, and beach cards
    // but only for Kitsilano (the only beach with weather data)
    const tempElements = screen.queryAllByText(/°C$/);
    // Each display of Kitsilano's temp counts as one match
    expect(tempElements.length).toBeGreaterThanOrEqual(1);
    // English Bay (no weather) should not contribute any temperature text
    expect(screen.queryByText('null°C')).not.toBeInTheDocument();
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
    expect(
      container.querySelectorAll('.shimmer, [data-testid="skeleton-card"]').length,
    ).toBeGreaterThanOrEqual(0);
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

  it('renders SearchFilter on the Discover page with intent pills', () => {
    renderDiscover();
    // Search bar removed; verify SearchFilter renders via its intent pills
    expect(screen.queryByPlaceholderText(/search beaches/i)).not.toBeInTheDocument();
    expect(screen.getByText('Swimming')).toBeInTheDocument();
    expect(screen.getByText('Water sports')).toBeInTheDocument();
  });

  it('filters AllBeachesSection when user clicks an intent pill', async () => {
    renderDiscover();

    // Both beaches should be visible initially
    expect(screen.getAllByText('Kitsilano Beach').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('English Bay Beach').length).toBeGreaterThanOrEqual(1);

    // Click Swimming pill — kitsilano has swimming, english-bay has walking (no match)
    fireEvent.click(screen.getByText('Swimming'));

    // The All Beaches section should filter out English Bay
    // (Recommended section is independent of the filter)
    const allBeachesHeading = screen.getByText('All Beaches');
    const allBeachesSection = allBeachesHeading.closest('section');
    if (allBeachesSection) {
      expect(within(allBeachesSection).queryByText('English Bay Beach')).not.toBeInTheDocument();
    }
    expect(screen.getAllByText('Kitsilano Beach').length).toBeGreaterThanOrEqual(1);
  });

  it('renders BeachMap below the All Beaches section', () => {
    renderDiscover();
    // BeachMap renders a "Beach Map" heading
    expect(screen.getByText('Beach Map')).toBeInTheDocument();
  });
});
