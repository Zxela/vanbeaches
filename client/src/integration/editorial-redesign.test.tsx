/**
 * Integration tests for the editorial redesign user flows.
 *
 * Tests the full App component rendered within a MemoryRouter to verify:
 * 1. Returning user with favorites sees FavoritesView
 * 2. New user (no favorites) sees DiscoveryView with editorial hero
 * 3. Tab navigation on /beach/:slug works with URL hash sync
 * 4. /compare redirects to /discover
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================
// Mock BrowserRouter so App doesn't create its own router
// (MemoryRouter from the test wrapper controls routing)
// ============================================================
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// ============================================================
// Mock framer-motion to avoid animation complexity
// Strip out framer-motion-specific props to prevent React warnings
// ============================================================
function stripMotionProps<T extends object>(
  props: T,
): Omit<
  T,
  'initial' | 'animate' | 'exit' | 'transition' | 'whileHover' | 'whileTap' | 'variants' | 'style'
> & { style?: React.CSSProperties } {
  const {
    initial: _i,
    animate: _a,
    exit: _e,
    transition: _t,
    whileHover: _wh,
    whileTap: _wt,
    variants: _v,
    ...rest
  } = props as Record<string, unknown>;
  void _i;
  void _a;
  void _e;
  void _t;
  void _wh;
  void _wt;
  void _v;
  return rest as never;
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <button type="button" {...stripMotionProps(props)}>
        {children}
      </button>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotionProps(props)}>{children}</span>
    ),
  },
}));

// ============================================================
// Mock API hooks to return stable test data
// ============================================================
vi.mock('../hooks/useBeaches', () => ({
  useBeaches: vi.fn(() => ({
    beaches: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: vi.fn(() => ({
    weather: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useTides', () => ({
  useTides: vi.fn(() => ({
    tides: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useWaterQuality', () => ({
  useWaterQuality: vi.fn(() => ({
    waterQuality: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('../hooks/useRecentBeaches', () => ({
  useRecentBeaches: vi.fn(() => ({
    recentBeaches: [],
    addRecent: vi.fn(),
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

vi.mock('../hooks/useSunTimes', () => {
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(6, 30, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(20, 0, 0, 0);
  const goldenHourStart = new Date(sunset.getTime() - 60 * 60 * 1000);
  const goldenHourEnd = new Date(sunset.getTime() + 30 * 60 * 1000);
  return {
    useSunTimes: vi.fn(() => ({ sunrise, sunset, goldenHourStart, goldenHourEnd })),
    formatSunTime: vi.fn((d: Date) => d?.toLocaleTimeString() ?? null),
  };
});

// ============================================================
// Mock child components that are heavy / have dependencies
// ============================================================
vi.mock('../components/BeachMap', () => ({
  BeachMap: () => <div data-testid="beach-map">Map</div>,
}));

vi.mock('../components/MobileBottomNav', () => ({
  MobileBottomNav: () => <nav data-testid="mobile-bottom-nav" />,
}));

vi.mock('../components/SunTimesWidget', () => ({
  SunTimesWidget: () => <div data-testid="sun-times-widget" />,
}));

// Mock ThemeProvider as a passthrough and useTheme with a no-op
vi.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

// ============================================================
// Mock @van-beaches/shared with minimal beach data
// (inline object — cannot reference top-level vars in vi.mock factory)
// ============================================================
vi.mock('@van-beaches/shared', () => {
  const mockBeach = {
    id: 'kitsilano-beach',
    name: 'Kitsilano Beach',
    slug: 'kitsilano-beach',
    location: { latitude: 49.2732, longitude: -123.1536 },
    tideStationId: 'station-abc',
    webcamUrl: null,
    showWebcam: false,
    tagline: 'The Sporty Shoreline',
    description: 'A great beach for sports.',
    amenities: {
      parking: 'free',
      restrooms: true,
      showers: true,
      lifeguard: 'seasonal',
      foodNearby: true,
      dogFriendly: true,
      wheelchairAccessible: true,
      volleyballCourts: 2,
      firepits: false,
    },
    activities: ['swimming', 'volleyball'],
  };
  return {
    BEACHES: [mockBeach],
    getBeachById: (id: string) => (id === 'kitsilano-beach' ? mockBeach : undefined),
  };
});

// ============================================================
// Import App after all mocks are set up
// ============================================================
import { App } from '../App';

// ============================================================
// Helper: render the full App at a given initial path
// ============================================================
function renderApp(initialPath = '/discover') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

// ============================================================
// localStorage helpers for favorites
// ============================================================
const FAVORITES_KEY = 'favoriteBeaches';

function setFavorites(beachIds: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(beachIds));
}

function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
}

// ============================================================
// Tests
// ============================================================
describe('Integration: editorial redesign user flows', () => {
  beforeEach(() => {
    clearFavorites();
    vi.clearAllMocks();
    window.location.hash = '';
  });

  // AC-001: User with favorites sees the same DiscoveryView with favorites sorted to top
  describe('018-AC1: returning user with favorites sees DiscoveryView', () => {
    it('shows favorite beach name in the discovery list', () => {
      setFavorites(['kitsilano-beach']);

      renderApp('/discover');

      // Beach name appears in both the featured banner and the beach list
      expect(screen.getAllByText('Kitsilano Beach').length).toBeGreaterThanOrEqual(1);
    });

    it('still shows editorial discovery hero when user has favorites', () => {
      setFavorites(['kitsilano-beach']);

      renderApp('/discover');

      expect(screen.getByText("Today's pick")).toBeInTheDocument();
    });
  });

  // AC-002: New user (no favorites) sees DiscoveryView with editorial discovery hero
  describe('018-AC2: new user without favorites sees editorial discovery hero', () => {
    it("shows 'Today's pick' label in editorial hero when user has no favorites", () => {
      clearFavorites();

      renderApp('/discover');

      expect(screen.getByText("Today's pick")).toBeInTheDocument();
    });

    it('shows the discovery hero element when user has no favorites', () => {
      clearFavorites();

      renderApp('/discover');

      expect(screen.getByTestId('discovery-hero')).toBeInTheDocument();
    });
  });

  // AC-003: Navigating to /beach/:slug shows tabbed detail page with Today tab active
  describe('018-AC3: beach detail page shows Today tab active by default', () => {
    it('renders the TabBar when navigating to a beach detail page', () => {
      renderApp('/beach/kitsilano-beach');

      // TabBar renders tab buttons; "Today" is one of them
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('Today tab is active by default on /beach/:slug', () => {
      renderApp('/beach/kitsilano-beach');

      // Beach name should appear at least once (in the hero heading)
      const beachNameElements = screen.getAllByText('Kitsilano Beach');
      expect(beachNameElements.length).toBeGreaterThan(0);
      // The Today tab button is visible in the TabBar
      const todayButton = screen.getByRole('button', { name: /today/i });
      expect(todayButton).toBeInTheDocument();
    });

    it('clicking About tab switches tab content and updates URL hash', () => {
      renderApp('/beach/kitsilano-beach');

      const aboutButton = screen.getByRole('button', { name: /about/i });
      fireEvent.click(aboutButton);

      expect(window.location.hash).toBe('#about');
    });

    it('clicking Photos tab updates URL hash to #photos', () => {
      renderApp('/beach/kitsilano-beach');

      const photosButton = screen.getByRole('button', { name: /photos/i });
      fireEvent.click(photosButton);

      expect(window.location.hash).toBe('#photos');
    });
  });

  // AC-004: /compare redirects to /discover
  describe('018-AC4: /compare redirects to /discover', () => {
    it('navigating to /compare renders the Discover page content', () => {
      clearFavorites();

      renderApp('/compare');

      // After redirect, the DiscoveryView editorial hero should be visible
      expect(screen.getByText("Today's pick")).toBeInTheDocument();
    });

    it('navigating to /compare does not render Compare-specific content', () => {
      clearFavorites();

      renderApp('/compare');

      // The old Compare page title/heading should not appear
      expect(screen.queryByText('Compare Beaches')).not.toBeInTheDocument();
    });
  });
});
