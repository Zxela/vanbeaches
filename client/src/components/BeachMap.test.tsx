import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock react-leaflet to work in jsdom environment
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    center,
    zoom,
    minZoom,
    maxZoom,
    maxBounds,
  }: {
    children: React.ReactNode;
    center: [number, number];
    zoom: number;
    minZoom: number;
    maxZoom: number;
    maxBounds: [[number, number], [number, number]];
  }) => (
    <div
      className="leaflet-container"
      data-center={JSON.stringify(center)}
      data-zoom={String(zoom)}
      data-min-zoom={String(minZoom)}
      data-max-zoom={String(maxZoom)}
      data-max-bounds={JSON.stringify(maxBounds)}
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
    <div
      className="leaflet-marker"
      onClick={eventHandlers?.click}
      data-beach-id={beachId}
    >
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
  useMap: vi.fn(),
}));

// Mock leaflet L.divIcon
vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts: { html: string; className: string; iconSize: number[]; iconAnchor: number[] }) => ({
      options: opts,
    }),
  },
  divIcon: (opts: { html: string; className: string; iconSize: number[]; iconAnchor: number[] }) => ({
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { useFavorites } from '../hooks/useFavorites';
import { BeachMap } from './BeachMap';

describe('BeachMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: [],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });
  });

  function renderBeachMap(
    props: { selectedBeachId?: string; onSelectBeach?: (id: string) => void } = {},
  ) {
    return render(
      <MemoryRouter>
        <BeachMap {...props} />
      </MemoryRouter>,
    );
  }

  // 002-AC1: MapContainer renders with leaflet-container class
  it('renders a Leaflet MapContainer', () => {
    const { container } = renderBeachMap();
    expect(container.querySelector('.leaflet-container')).toBeTruthy();
  });

  // 002-AC1: center and zoom
  it('centers at approximately [49.277, -123.155] with default zoom 12', () => {
    const { container } = renderBeachMap();
    const mapContainer = container.querySelector('.leaflet-container');
    const center = JSON.parse(mapContainer?.getAttribute('data-center') ?? '[]');
    expect(center[0]).toBeCloseTo(49.277, 1);
    expect(center[1]).toBeCloseTo(-123.155, 1);
    expect(mapContainer?.getAttribute('data-zoom')).toBe('12');
  });

  // 002-AC2: TileLayer with OpenStreetMap URL
  it('renders TileLayer with OpenStreetMap URL', () => {
    const { container } = renderBeachMap();
    const tilePain = container.querySelector('.leaflet-tile-pane');
    expect(tilePain).toBeTruthy();
    expect(tilePain?.getAttribute('data-url')).toContain('tile.openstreetmap.org');
  });

  // 002-AC3: 9 beach markers
  it('renders all 9 beaches as markers with beach-marker class', () => {
    const { container } = renderBeachMap();
    const markers = container.querySelectorAll('.beach-marker');
    expect(markers.length).toBe(9);
  });

  // 002-AC4: clicking marker calls onSelectBeach
  it('calls onSelectBeach with beach ID when marker clicked and callback provided', () => {
    const onSelectBeach = vi.fn();
    const { container } = renderBeachMap({ onSelectBeach });
    const firstMarker = container.querySelector('.leaflet-marker');
    if (firstMarker) {
      fireEvent.click(firstMarker);
    }
    expect(onSelectBeach).toHaveBeenCalledTimes(1);
    expect(typeof onSelectBeach.mock.calls[0][0]).toBe('string');
  });

  // 002-AC5: clicking without callback navigates
  it('navigates to /beach/{beachId} when no onSelectBeach provided', () => {
    const { container } = renderBeachMap();
    const firstMarker = container.querySelector('.leaflet-marker');
    if (firstMarker) {
      fireEvent.click(firstMarker);
    }
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.calls[0][0]).toMatch(/^\/beach\//);
  });

  // 002-AC6: zoom constraints
  it('constrains zoom to min 10, max 16, and sets maxBounds', () => {
    const { container } = renderBeachMap();
    const mapContainer = container.querySelector('.leaflet-container');
    expect(mapContainer?.getAttribute('data-min-zoom')).toBe('10');
    expect(mapContainer?.getAttribute('data-max-zoom')).toBe('16');
    const maxBounds = JSON.parse(mapContainer?.getAttribute('data-max-bounds') ?? 'null');
    expect(maxBounds).toBeTruthy();
    expect(Array.isArray(maxBounds)).toBe(true);
  });

  // 003-AC1: selected marker styling (ocean-600 = #00acc1, scale 1.3)
  it('applies selected styling (ocean-600 background, scale 1.3) for selectedBeachId', () => {
    const { container } = renderBeachMap({ selectedBeachId: 'english-bay' });
    const markers = container.querySelectorAll('.beach-marker');
    let foundSelected = false;
    for (const marker of markers) {
      const bgColor = (marker as HTMLElement).getAttribute('data-bg-color');
      const transform = (marker as HTMLElement).getAttribute('data-transform');
      if (bgColor === '#00acc1' && transform === 'scale(1.3)') {
        foundSelected = true;
        break;
      }
    }
    expect(foundSelected).toBe(true);
  });

  // 003-AC2: favorite marker with heart and shore-500 background
  it('renders heart and shore-500 background for favorite markers', () => {
    (useFavorites as ReturnType<typeof vi.fn>).mockReturnValue({
      favorites: ['english-bay'],
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn((id: string) => id === 'english-bay'),
    });
    const { container } = renderBeachMap();
    const markers = container.querySelectorAll('.beach-marker');
    let foundFavorite = false;
    for (const marker of markers) {
      const bgColor = (marker as HTMLElement).getAttribute('data-bg-color');
      const hasHeart = (marker as HTMLElement).getAttribute('data-has-heart');
      if (bgColor === '#009688' && hasHeart === 'true') {
        foundFavorite = true;
        break;
      }
    }
    expect(foundFavorite).toBe(true);
  });

  // 003-AC3: tooltips showing beach names
  it('renders Tooltip components with beach names', () => {
    renderBeachMap();
    // English Bay is one of the beaches; its name should appear in a tooltip
    expect(screen.getByText('English Bay')).toBeTruthy();
  });

  // 003-AC6: default markers use ocean-500 (#00bcd4)
  it('renders default markers with ocean-500 background color', () => {
    const { container } = renderBeachMap();
    const markers = container.querySelectorAll('.beach-marker');
    let foundDefault = false;
    for (const marker of markers) {
      const bgColor = (marker as HTMLElement).getAttribute('data-bg-color');
      if (bgColor === '#00bcd4') {
        foundDefault = true;
        break;
      }
    }
    expect(foundDefault).toBe(true);
  });
});
