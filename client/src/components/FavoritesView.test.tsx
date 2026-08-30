import { render, screen } from '@testing-library/react';
import type { Beach, TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FavoritesView } from './FavoritesView';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
    section: ({ children, className, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <section className={className} {...rest}>
        {children}
      </section>
    ),
  },
}));

vi.mock('../data/beach-personalities', () => ({
  getPersonality: vi.fn((slug: string) => {
    if (slug === 'kitsilano-beach') {
      return {
        slug: 'kitsilano-beach',
        archetype: 'The Sporty Heart',
        tagline: 'Where the west side comes to play',
        editorial: 'Kits Beach is the most popular beach.',
        differentiators: ['6 volleyball courts', 'Olympic Pool'],
        vibes: ['active', 'social', 'family'],
        instagramHashtag: 'kitsbeach',
        instagramPostUrls: [],
        accentColor: 'coral',
      };
    }
    if (slug === 'locarno-beach') {
      return {
        slug: 'locarno-beach',
        archetype: "The Sailor's Retreat",
        tagline: 'Calm and unhurried',
        editorial: 'Locarno is peaceful.',
        differentiators: ['Quiet atmosphere'],
        vibes: ['quiet', 'nature'],
        instagramPostUrls: [],
        accentColor: 'sky',
      };
    }
    return undefined;
  }),
}));

vi.mock('../utils/verdict', () => ({
  computeVerdict: vi.fn(() => ({
    recommendation: 'good',
    summary: 'Good beach day today.',
    bestTimeWindow: 'This afternoon',
    reasons: ['Sunny skies', 'Calm winds'],
    suggestion: 'Head down this afternoon.',
  })),
}));

// Mock BEACHES data
vi.mock('@van-beaches/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@van-beaches/shared')>();
  return {
    ...actual,
    BEACHES: [
      {
        id: 'kitsilano-beach',
        name: 'Kitsilano Beach',
        slug: 'kitsilano-beach',
        location: { latitude: 49.274, longitude: -123.158 },
        tideStationId: '7735',
        webcamUrl: null,
        images: {
          thumb: '/images/kits-thumb.jpg',
          hero: '/images/kits-hero.jpg',
          credit: { name: 'Test', username: 'test' },
        },
      },
      {
        id: 'locarno-beach',
        name: 'Locarno Beach',
        slug: 'locarno-beach',
        location: { latitude: 49.275, longitude: -123.199 },
        tideStationId: null,
        webcamUrl: null,
      },
    ],
  };
});

// Sample beach data
const kitsBeach: Beach = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  slug: 'kitsilano-beach',
  location: { latitude: 49.274, longitude: -123.158 },
  tideStationId: '7735',
  webcamUrl: null,
};

const locarnoBeach: Beach = {
  id: 'locarno-beach',
  name: 'Locarno Beach',
  slug: 'locarno-beach',
  location: { latitude: 49.275, longitude: -123.199 },
  tideStationId: null,
  webcamUrl: null,
};

const kitsWeather: WeatherForecast = {
  beachId: 'kitsilano-beach',
  current: {
    temperature: 22,
    condition: 'sunny',
    humidity: 55,
    windSpeed: 10,
    windDirection: 'W',
    uvIndex: 5,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

const locarnoWeather: WeatherForecast = {
  beachId: 'locarno-beach',
  current: {
    temperature: 18,
    condition: 'partly-cloudy',
    humidity: 60,
    windSpeed: 8,
    windDirection: 'NW',
    uvIndex: 3,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

const kitsTides: TideData = {
  beachId: 'kitsilano-beach',
  stationId: '7735',
  stationName: 'Point Atkinson',
  predictions: [
    { time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), height: 4.2, type: 'high' },
  ],
  fetchedAt: new Date().toISOString(),
};

const kitsWaterQuality: WaterQualityStatus = {
  beachId: 'kitsilano-beach',
  level: 'good',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: new Date().toISOString(),
  fetchedAt: new Date().toISOString(),
};

type BeachConditions = {
  weather: WeatherForecast | null;
  tides: TideData | null;
  waterQuality: WaterQualityStatus | null;
  sunsetTime: string | null;
};

const beachData: Record<string, BeachConditions> = {
  'kitsilano-beach': {
    weather: kitsWeather,
    tides: kitsTides,
    waterQuality: kitsWaterQuality,
    sunsetTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  },
  'locarno-beach': {
    weather: locarnoWeather,
    tides: null,
    waterQuality: null,
    sunsetTime: null,
  },
};

function renderFavorites(
  favorites: Beach[] = [kitsBeach],
  data: Record<string, BeachConditions> = beachData,
  loading = false,
) {
  return render(
    <MemoryRouter>
      <FavoritesView favorites={favorites} beachData={data} loading={loading} />
    </MemoryRouter>,
  );
}

describe('FavoritesView', () => {
  // AC1: Time-of-day greeting
  describe('AC-011-1: time-of-day greeting', () => {
    it('renders a greeting heading', () => {
      renderFavorites();
      expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
    });

    it('uses "Good morning" before noon', () => {
      // Mock Date to return 9am
      const mockDate = new Date('2026-02-27T09:00:00');
      vi.setSystemTime(mockDate);
      renderFavorites();
      expect(screen.getByText(/Good morning/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('uses "Good afternoon" between 12 and 17', () => {
      const mockDate = new Date('2026-02-27T14:00:00');
      vi.setSystemTime(mockDate);
      renderFavorites();
      expect(screen.getByText(/Good afternoon/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('uses "Good evening" after 17', () => {
      const mockDate = new Date('2026-02-27T19:00:00');
      vi.setSystemTime(mockDate);
      renderFavorites();
      expect(screen.getByText(/Good evening/i)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('applies the shared display typography to the greeting', () => {
      renderFavorites();
      const greeting = screen.getByText(/Good (morning|afternoon|evening)/i);
      expect(greeting.className).toMatch(/font-display/);
    });
  });

  // AC2: Primary favorite as full-width card with conditions and verdict
  describe('AC-011-2: primary favorite beach card', () => {
    it('renders the primary favorite beach name', () => {
      renderFavorites();
      expect(screen.getByText('Kitsilano Beach')).toBeInTheDocument();
    });

    it('renders the primary beach temperature', () => {
      renderFavorites();
      expect(screen.getByText(/22/)).toBeInTheDocument();
    });

    it('renders the verdict summary for the primary beach', () => {
      renderFavorites();
      expect(screen.getByText('Good beach day today.')).toBeInTheDocument();
    });

    it('renders a link to the primary beach detail page', () => {
      renderFavorites();
      const links = screen.getAllByRole('link');
      const beachLink = links.find((l) => l.getAttribute('href') === '/beach/kitsilano-beach');
      expect(beachLink).toBeDefined();
    });
  });

  // AC3: Other favorites as compact 2-column cards
  describe('AC-011-3: other favorites compact cards', () => {
    it('renders secondary favorite beach names', () => {
      renderFavorites([kitsBeach, locarnoBeach]);
      expect(screen.getByText('Locarno Beach')).toBeInTheDocument();
    });

    it('renders compact cards in a 2-column grid', () => {
      const { container } = renderFavorites([kitsBeach, locarnoBeach]);
      // The secondary cards should be in a 2-column grid container
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('does not render secondary grid when there is only one favorite', () => {
      const { container } = renderFavorites([kitsBeach]);
      const grid = container.querySelector('.grid-cols-2');
      expect(grid).not.toBeInTheDocument();
    });

    it('renders secondary beach temperature', () => {
      renderFavorites([kitsBeach, locarnoBeach]);
      expect(screen.getByText(/18/)).toBeInTheDocument();
    });

    it('renders a link to each secondary beach', () => {
      renderFavorites([kitsBeach, locarnoBeach]);
      const links = screen.getAllByRole('link');
      const locarnoLink = links.find((l) => l.getAttribute('href') === '/beach/locarno-beach');
      expect(locarnoLink).toBeDefined();
    });
  });

  // AC4: Skeleton loading state
  describe('AC-011-4: skeleton loading state', () => {
    it('renders skeleton when loading is true', () => {
      const { container } = renderFavorites([kitsBeach], beachData, true);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('does not render beach names when loading', () => {
      renderFavorites([kitsBeach], beachData, true);
      expect(screen.queryByText('Kitsilano Beach')).not.toBeInTheDocument();
    });

    it('does not render skeleton when loading is false', () => {
      const { container } = renderFavorites([kitsBeach], beachData, false);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).not.toBeInTheDocument();
    });
  });

  // AC5: Explore all beaches link
  describe('AC-011-5: Explore all beaches link', () => {
    it('renders the Explore all beaches link', () => {
      renderFavorites();
      expect(screen.getByText(/Explore all beaches/i)).toBeInTheDocument();
    });

    it('links to /discover', () => {
      renderFavorites();
      const exploreLink = screen.getByText(/Explore all beaches/i).closest('a');
      expect(exploreLink).toHaveAttribute('href', '/discover');
    });
  });
});
