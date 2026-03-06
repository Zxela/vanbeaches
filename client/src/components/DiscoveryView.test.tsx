/**
 * NOTE: This test file was for the original DiscoveryView.
 * Task 007 rewrote DiscoveryView with a tagline, list/map toggle, and removed vibe filters.
 * The authoritative tests are now at: src/components/__tests__/DiscoveryView.test.tsx
 *
 * This file is intentionally empty — previous tests covered behavior that was
 * intentionally removed (vibe filter chips, featured banner, compact map section).
 */

import { render, screen } from '@testing-library/react';
import type { Beach, BeachSummary } from '@van-beaches/shared';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock react-leaflet for map component
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div className="leaflet-container" data-testid="beach-map">{children}</div>,
  TileLayer: ({ url }: { url: string; attribution: string }) => (
    <div className="leaflet-tile-pane" data-url={url} />
  ),
  Marker: ({
    children,
    eventHandlers,
    'data-beach-id': beachId,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    'data-beach-id'?: string;
  }) => (
    // biome-ignore lint/a11y/useKeyWithClickEvents: test mock for Leaflet Marker component
    <div className="leaflet-marker" onClick={eventHandlers?.click} data-beach-id={beachId}>
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

vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts: {
      html: string;
      className: string;
      iconSize: number[];
      iconAnchor: number[];
    }) => ({ options: opts }),
  },
  divIcon: (opts: {
    html: string;
    className: string;
    iconSize: number[];
    iconAnchor: number[];
  }) => ({ options: opts }),
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
    },
  ],
}));

const mockBeaches: Beach[] = [
  {
    id: 'english-bay',
    name: 'English Bay',
    slug: 'english-bay',
    location: { latitude: 49.2863, longitude: -123.1452 },
    tideStationId: null,
    webcamUrl: null,
  },
  {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    slug: 'kitsilano-beach',
    location: { latitude: 49.2736, longitude: -123.1534 },
    tideStationId: null,
    webcamUrl: null,
  },
];

const mockBeachConditions: Record<string, BeachSummary> = {
  'english-bay': {
    id: 'english-bay',
    name: 'English Bay',
    currentWeather: { temperature: 22, condition: 'sunny', icon: 'sunny' },
    nextTide: null,
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
};

import { DiscoveryView } from './DiscoveryView';

function renderDiscoveryView(
  props: {
    beaches?: Beach[];
    beachConditions?: Record<string, BeachSummary>;
    loading?: boolean;
  } = {},
) {
  const { beaches = mockBeaches, beachConditions = mockBeachConditions, loading = false } = props;

  return render(
    <MemoryRouter>
      <DiscoveryView beaches={beaches} beachConditions={beachConditions} loading={loading} />
    </MemoryRouter>,
  );
}

describe('DiscoveryView', () => {
  // Smoke test - component renders
  it('renders without crashing', () => {
    renderDiscoveryView();
    expect(document.body).toBeInTheDocument();
  });

  // Loading state
  it('renders without crashing when loading is true', () => {
    renderDiscoveryView({ loading: true });
    expect(document.body).toBeInTheDocument();
  });

  // Beach list visible
  it('shows beach list by default', () => {
    renderDiscoveryView();
    expect(screen.getByTestId('discovery-beach-list')).toBeInTheDocument();
  });

  // Tagline visible
  it('renders tagline', () => {
    renderDiscoveryView();
    expect(
      screen.getByText("Live conditions for Vancouver's 9 best beaches"),
    ).toBeInTheDocument();
  });
});
