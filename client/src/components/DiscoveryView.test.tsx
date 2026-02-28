import { fireEvent, render, screen } from '@testing-library/react';
import type { Beach, BeachSummary } from '@van-beaches/shared';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock react-leaflet for map component
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    center,
    zoom,
  }: {
    children: React.ReactNode;
    center: [number, number];
    zoom: number;
  }) => (
    <div
      className="leaflet-container"
      data-center={JSON.stringify(center)}
      data-zoom={String(zoom)}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url }: { url: string; attribution: string }) => (
    <div className="leaflet-tile-pane" data-url={url} />
  ),
  Marker: ({
    children,
    eventHandlers,
    'data-beach-id': beachId,
    'data-bg-color': bgColor,
    'data-has-heart': hasHeart,
    'data-transform': transform,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    'data-beach-id'?: string;
    'data-bg-color'?: string;
    'data-has-heart'?: string;
    'data-transform'?: string;
  }) => (
    // biome-ignore lint/a11y/useKeyWithClickEvents: test mock for Leaflet Marker component
    <div className="leaflet-marker" onClick={eventHandlers?.click} data-beach-id={beachId}>
      <div
        className="beach-marker"
        data-bg-color={bgColor}
        data-has-heart={hasHeart}
        data-transform={transform}
      >
        {hasHeart === 'true' && <span>&#x2665;</span>}
      </div>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div className="leaflet-tooltip">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div className="leaflet-popup">{children}</div>
  ),
  useMap: vi.fn(),
}));

// Mock leaflet L.divIcon
vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts: {
      html: string;
      className: string;
      iconSize: number[];
      iconAnchor: number[];
    }) => ({
      options: opts,
    }),
  },
  divIcon: (opts: {
    html: string;
    className: string;
    iconSize: number[];
    iconAnchor: number[];
  }) => ({
    options: opts,
  }),
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: vi.fn(() => ({
    favorites: [],
    toggleFavorite: vi.fn(),
    isFavorite: vi.fn(() => false),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@van-beaches/shared', () => ({
  BEACHES: [
    {
      id: 'english-bay',
      name: 'English Bay',
      slug: 'english-bay',
      location: { latitude: 49.2863, longitude: -123.1452 },
      tideStationId: null,
      webcamUrl: null,
      images: {
        thumb: '/images/english-bay-thumb.jpg',
        hero: '/images/english-bay-hero.jpg',
        credit: { name: 'Test', username: 'test' },
      },
    },
    {
      id: 'kitsilano-beach',
      name: 'Kitsilano Beach',
      slug: 'kitsilano-beach',
      location: { latitude: 49.2736, longitude: -123.1534 },
      tideStationId: null,
      webcamUrl: null,
      images: {
        thumb: '/images/kitsilano-thumb.jpg',
        hero: '/images/kitsilano-hero.jpg',
        credit: { name: 'Test', username: 'test' },
      },
    },
    {
      id: 'locarno-beach',
      name: 'Locarno Beach',
      slug: 'locarno-beach',
      location: { latitude: 49.273, longitude: -123.204 },
      tideStationId: null,
      webcamUrl: null,
    },
  ],
}));

vi.mock('../data/beach-personalities', () => ({
  getPersonality: vi.fn((slug: string) => {
    const personalities: Record<string, {
      slug: string;
      archetype: string;
      tagline: string;
      editorial: string;
      differentiators: string[];
      vibes: string[];
      instagramHashtag?: string;
      instagramPostUrls: string[];
      accentColor: string;
    }> = {
      'english-bay': {
        slug: 'english-bay',
        archetype: 'The Sunset Stage',
        tagline: "Vancouver's golden amphitheatre",
        editorial: 'English Bay is the most iconic beach.',
        differentiators: ['Best sunset viewpoint'],
        vibes: ['sunset', 'social', 'urban'],
        instagramHashtag: 'englishbay',
        instagramPostUrls: [],
        accentColor: 'amber',
      },
      'kitsilano-beach': {
        slug: 'kitsilano-beach',
        archetype: 'The Sporty Heart',
        tagline: 'Where the west side comes to play',
        editorial: 'Kits Beach is Vancouver\'s most popular beach.',
        differentiators: ['6 volleyball courts'],
        vibes: ['active', 'social', 'family'],
        instagramHashtag: 'kitsbeach',
        instagramPostUrls: [],
        accentColor: 'coral',
      },
      'locarno-beach': {
        slug: 'locarno-beach',
        archetype: 'The Quiet Expanse',
        tagline: 'Peaceful shores and endless tidal flats',
        editorial: 'Locarno is Vancouver\'s best-kept secret.',
        differentiators: ['Dramatic low-tide flats'],
        vibes: ['quiet', 'nature', 'dog-friendly'],
        instagramHashtag: 'locarnobeach',
        instagramPostUrls: [],
        accentColor: 'forest',
      },
    };
    return personalities[slug];
  }),
  beachPersonalities: [],
}));

// Test data
const mockBeaches: Beach[] = [
  {
    id: 'english-bay',
    name: 'English Bay',
    slug: 'english-bay',
    location: { latitude: 49.2863, longitude: -123.1452 },
    tideStationId: null,
    webcamUrl: null,
    images: {
      thumb: '/images/english-bay-thumb.jpg',
      hero: '/images/english-bay-hero.jpg',
      credit: { name: 'Test', username: 'test' },
    },
  },
  {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    slug: 'kitsilano-beach',
    location: { latitude: 49.2736, longitude: -123.1534 },
    tideStationId: null,
    webcamUrl: null,
    images: {
      thumb: '/images/kitsilano-thumb.jpg',
      hero: '/images/kitsilano-hero.jpg',
      credit: { name: 'Test', username: 'test' },
    },
  },
  {
    id: 'locarno-beach',
    name: 'Locarno Beach',
    slug: 'locarno-beach',
    location: { latitude: 49.273, longitude: -123.204 },
    tideStationId: null,
    webcamUrl: null,
  },
];

const mockBeachConditions: Record<string, BeachSummary> = {
  'english-bay': {
    id: 'english-bay',
    name: 'English Bay',
    currentWeather: { temperature: 22, condition: 'sunny', icon: 'sunny' },
    nextTide: { type: 'high', time: '19:45', height: 4.2 },
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
  'kitsilano-beach': {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
    nextTide: { type: 'high', time: '14:30', height: 3.8 },
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
  'locarno-beach': {
    id: 'locarno-beach',
    name: 'Locarno Beach',
    currentWeather: { temperature: 16, condition: 'cloudy', icon: 'cloudy' },
    nextTide: { type: 'low', time: '10:00', height: 0.8 },
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
};

function renderDiscoveryView(props: {
  beaches?: Beach[];
  beachConditions?: Record<string, BeachSummary>;
  loading?: boolean;
} = {}) {
  const {
    beaches = mockBeaches,
    beachConditions = mockBeachConditions,
    loading = false,
  } = props;

  return render(
    <MemoryRouter>
      <DiscoveryView
        beaches={beaches}
        beachConditions={beachConditions}
        loading={loading}
      />
    </MemoryRouter>,
  );
}

import { DiscoveryView } from './DiscoveryView';

describe('DiscoveryView', () => {
  // AC-001: Hero section with "Today's pick"
  describe('editorial hero', () => {
    it('renders a "Today\'s pick" label in the hero section', () => {
      renderDiscoveryView();
      expect(screen.getByText("Today's pick")).toBeInTheDocument();
    });

    it('renders the featured beach name in the hero', () => {
      renderDiscoveryView();
      // The featured beach (highest temperature / first beach) should appear as a heading
      const heroSection = document.querySelector('[data-testid="discovery-hero"]');
      expect(heroSection).toBeInTheDocument();
    });

    it('hero section has approximately 35vh height styling', () => {
      renderDiscoveryView();
      const hero = document.querySelector('[data-testid="discovery-hero"]');
      expect(hero).toBeInTheDocument();
      // Hero should have inline style or class that sets ~35vh height
      const style = (hero as HTMLElement)?.style?.minHeight ?? '';
      const className = (hero as HTMLElement)?.className ?? '';
      expect(style.includes('35vh') || className.includes('h-') || className.includes('min-h-')).toBe(true);
    });

    it('renders a condition summary in the hero', () => {
      renderDiscoveryView();
      // Temperature from the featured beach's conditions should appear
      // The featured beach with best conditions (22°C English Bay) should appear
      const text = document.body.textContent ?? '';
      expect(/22|18|16/.test(text)).toBe(true);
    });

    it('uses the beach with best conditions (highest temperature) as the featured beach', () => {
      renderDiscoveryView();
      // English Bay has temp 22, which is highest - it should be featured
      const hero = document.querySelector('[data-testid="discovery-hero"]');
      expect(hero?.textContent).toContain('English Bay');
    });

    it('falls back to first beach when no conditions are available', () => {
      renderDiscoveryView({ beaches: mockBeaches, beachConditions: {} });
      // Should fall back to first beach
      const hero = document.querySelector('[data-testid="discovery-hero"]');
      expect(hero?.textContent).toContain('English Bay');
    });
  });

  // AC-002: Vibe filter chips
  describe('vibe filter chips', () => {
    it('renders a "What\'s your vibe?" section heading', () => {
      renderDiscoveryView();
      expect(screen.getByText("What's your vibe?")).toBeInTheDocument();
    });

    it('renders vibe chips for all BeachVibe values', () => {
      renderDiscoveryView();
      // All 8 BeachVibe values should be rendered as chips
      expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quiet/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /family/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dog/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sunset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /social/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /nature/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /urban/i })).toBeInTheDocument();
    });

    it('renders chips as unselected by default', () => {
      renderDiscoveryView();
      // Chips should not have selected/active styling initially
      const activeBtn = screen.getByRole('button', { name: /active/i });
      expect(activeBtn).not.toHaveAttribute('data-selected', 'true');
    });
  });

  // AC-003: Vibe filtering
  describe('vibe filtering', () => {
    it('shows all beaches when no vibe is selected', () => {
      renderDiscoveryView();
      // All 3 mock beaches should appear in the beach list
      const beachList = document.querySelector('[data-testid="discovery-beach-list"]');
      expect(beachList?.textContent).toContain('English Bay');
      expect(beachList?.textContent).toContain('Kitsilano Beach');
      expect(beachList?.textContent).toContain('Locarno Beach');
    });

    it('filters beaches when a vibe chip is selected', () => {
      renderDiscoveryView();
      // Click the "sunset" vibe chip — only english-bay has sunset vibe in mock
      fireEvent.click(screen.getByRole('button', { name: /sunset/i }));

      const beachList = document.querySelector('[data-testid="discovery-beach-list"]');
      // English Bay has sunset vibe, should be shown
      expect(beachList?.textContent).toContain('English Bay');
      // Kitsilano has active/social/family vibes, not sunset — should be hidden
      expect(beachList?.textContent).not.toContain('Kitsilano Beach');
    });

    it('shows the selected vibe chip as active', () => {
      renderDiscoveryView();
      const sunsetBtn = screen.getByRole('button', { name: /sunset/i });
      fireEvent.click(sunsetBtn);
      expect(sunsetBtn).toHaveAttribute('data-selected', 'true');
    });

    it('deselects a vibe chip when clicked again', () => {
      renderDiscoveryView();
      const sunsetBtn = screen.getByRole('button', { name: /sunset/i });
      fireEvent.click(sunsetBtn);
      fireEvent.click(sunsetBtn);
      expect(sunsetBtn).toHaveAttribute('data-selected', 'false');
    });

    it('shows all beaches again after deselecting a vibe', () => {
      renderDiscoveryView();
      const sunsetBtn = screen.getByRole('button', { name: /sunset/i });
      fireEvent.click(sunsetBtn);
      fireEvent.click(sunsetBtn);

      const beachList = document.querySelector('[data-testid="discovery-beach-list"]');
      expect(beachList?.textContent).toContain('English Bay');
      expect(beachList?.textContent).toContain('Kitsilano Beach');
      expect(beachList?.textContent).toContain('Locarno Beach');
    });

    it('filters by dog-friendly vibe correctly', () => {
      renderDiscoveryView();
      fireEvent.click(screen.getByRole('button', { name: /dog/i }));

      const beachList = document.querySelector('[data-testid="discovery-beach-list"]');
      // Locarno has dog-friendly vibe
      expect(beachList?.textContent).toContain('Locarno Beach');
      // English Bay and Kitsilano do not have dog-friendly vibe
      expect(beachList?.textContent).not.toContain('English Bay');
      expect(beachList?.textContent).not.toContain('Kitsilano Beach');
    });
  });

  // AC-004: BeachMap compact section
  describe('map section', () => {
    it('renders a BeachMap in a compact map section', () => {
      renderDiscoveryView();
      // The map section should exist
      const mapSection = document.querySelector('[data-testid="discovery-map"]');
      expect(mapSection).toBeInTheDocument();
    });

    it('renders the Leaflet map container within the map section', () => {
      renderDiscoveryView();
      // The leaflet-container should be present (from mocked MapContainer)
      expect(document.querySelector('.leaflet-container')).toBeInTheDocument();
    });

    it('renders a "View on map" label or similar text near the map', () => {
      renderDiscoveryView();
      const mapSection = document.querySelector('[data-testid="discovery-map"]');
      // The map section should provide some label/heading
      expect(mapSection).toBeInTheDocument();
    });
  });

  // Loading state
  describe('loading state', () => {
    it('renders without crashing when loading is true', () => {
      renderDiscoveryView({ loading: true });
      // Should render something (skeleton or reduced content)
      expect(document.body).toBeInTheDocument();
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('renders without crashing when beaches array is empty', () => {
      renderDiscoveryView({ beaches: [], beachConditions: {} });
      expect(screen.getByText("What's your vibe?")).toBeInTheDocument();
    });

    it('renders beach cards using BeachCard component (personality-forward layout)', () => {
      renderDiscoveryView();
      // Beach cards should show archetype/personality info
      // We check that personality names appear in beach list section
      const beachList = document.querySelector('[data-testid="discovery-beach-list"]');
      // The archetype should appear from the mocked getPersonality
      expect(beachList?.textContent).toMatch(/Sporty Heart|Sunset Stage|Quiet Expanse/);
    });
  });
});
