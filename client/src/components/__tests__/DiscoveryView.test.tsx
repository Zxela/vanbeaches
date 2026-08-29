import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    center: [number, number];
    zoom: number;
  }) => (
    <div className="leaflet-container" data-testid="beach-map">
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

vi.mock('../../hooks/useFavorites', () => ({
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
    {
      id: 'kitsilano-beach',
      name: 'Kitsilano Beach',
      slug: 'kitsilano-beach',
      location: { latitude: 49.2736, longitude: -123.1534 },
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
  'kitsilano-beach': {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    currentWeather: { temperature: 18, condition: 'sunny', icon: 'sunny' },
    nextTide: null,
    waterQuality: 'good',
    lastUpdated: new Date().toISOString(),
  },
};

import { useFavorites } from '../../hooks/useFavorites';
import { DiscoveryView } from '../DiscoveryView';

function renderDiscoveryView(
  props: {
    beaches?: Beach[];
    beachConditions?: Record<string, BeachSummary>;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
  } = {},
) {
  const {
    beaches = mockBeaches,
    beachConditions = mockBeachConditions,
    loading = false,
    error,
    onRetry,
  } = props;

  return render(
    <MemoryRouter>
      <DiscoveryView
        beaches={beaches}
        beachConditions={beachConditions}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    </MemoryRouter>,
  );
}

describe('DiscoveryView (task 007)', () => {
  // AC-001: Tagline header
  it('renders tagline "Live conditions for Vancouver\'s 9 best beaches" as first visible content', () => {
    renderDiscoveryView();
    expect(screen.getByText("Live conditions for Vancouver's 9 best beaches")).toBeVisible();
  });

  // AC-018: No vibe filters
  it('does not render "What\'s your vibe?" heading', () => {
    renderDiscoveryView();
    expect(screen.queryByText("What's your vibe?")).not.toBeInTheDocument();
  });

  // AC-004: List/Map toggle - Map view
  it('replaces beach list with map when user taps "Map" toggle', async () => {
    renderDiscoveryView();
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(screen.getByTestId('beach-map')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-beach-list')).not.toBeInTheDocument();
  });

  it('"Map" button appears active when map view is selected', async () => {
    renderDiscoveryView();
    const mapButton = screen.getByRole('button', { name: 'Map' });
    await userEvent.click(mapButton);
    // After clicking, the Map button should indicate active state
    expect(mapButton).toHaveAttribute('aria-pressed', 'true');
  });

  // AC-005: List/Map toggle - back to List view
  it('replaces map with beach list when user taps "List" while in map view', async () => {
    renderDiscoveryView();
    await userEvent.click(screen.getByRole('button', { name: 'Map' }));
    await userEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByTestId('discovery-beach-list')).toBeInTheDocument();
  });

  // Default state: List view
  it('shows beach list by default (List view is default)', () => {
    renderDiscoveryView();
    expect(screen.getByTestId('discovery-beach-list')).toBeInTheDocument();
    expect(screen.queryByTestId('beach-map')).not.toBeInTheDocument();
  });

  it('shows all beaches in the list', () => {
    renderDiscoveryView();
    const list = screen.getByTestId('discovery-beach-list');
    expect(list).toHaveTextContent('English Bay');
    expect(list).toHaveTextContent('Kitsilano Beach');
  });

  it('filters beaches by name and can clear the search', async () => {
    renderDiscoveryView();
    const search = screen.getByRole('searchbox', { name: 'Search beaches' });

    await userEvent.type(search, 'Kits');
    expect(screen.queryByText('English Bay')).not.toBeInTheDocument();
    expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('English Bay')).toBeInTheDocument();
  });

  it('shows a helpful empty state when search has no matches', async () => {
    renderDiscoveryView();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search beaches' }), 'Jericho');
    expect(screen.getByText('No beaches found')).toBeInTheDocument();
  });

  it('sorts favorites before other beaches', () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: ['kitsilano-beach'],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn((id: string) => id === 'kitsilano-beach'),
    });
    renderDiscoveryView();
    const cards = screen.getAllByRole('link');
    expect(cards[0]).toHaveTextContent('Kitsilano Beach');
    expect(screen.getByLabelText('Favorite')).toBeInTheDocument();
  });

  // AC-019: Error state
  it('shows "Couldn\'t load beaches" error card when error prop is provided', async () => {
    renderDiscoveryView({ error: 'Failed to fetch', onRetry: vi.fn() });
    expect(await screen.findByText("Couldn't load beaches")).toBeInTheDocument();
  });

  it('shows "Try again" button in error state', () => {
    const onRetry = vi.fn();
    renderDiscoveryView({ error: 'Failed to fetch', onRetry });
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when "Try again" is clicked', async () => {
    const onRetry = vi.fn();
    renderDiscoveryView({ error: 'Failed to fetch', onRetry });
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
