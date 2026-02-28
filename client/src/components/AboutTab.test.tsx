import { render, screen } from '@testing-library/react';
import type { Beach, BeachAmenities } from '@van-beaches/shared';
import type { WaterQualityStatus } from '@van-beaches/shared';
import type { WeatherForecast } from '@van-beaches/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { AboutTab } from './AboutTab';

// IntersectionObserver is not available in jsdom
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

const mockAmenities: BeachAmenities = {
  parking: 'paid',
  restrooms: true,
  showers: true,
  lifeguard: 'seasonal',
  foodNearby: true,
  dogFriendly: false,
  wheelchairAccessible: true,
  volleyballCourts: 6,
  firepits: false,
};

// kitsilano-beach has well-known personality data we can assert against
const mockBeachKits: Beach = {
  id: 'kitsilano-beach',
  name: 'Kitsilano Beach',
  slug: 'kitsilano-beach',
  location: { latitude: 49.2741, longitude: -123.153 },
  tideStationId: null,
  webcamUrl: null,
  amenities: mockAmenities,
  safetyNotes: ['Swim near lifeguard', 'Rip currents possible'],
};

const mockBeachWithWebcam: Beach = {
  ...mockBeachKits,
  webcamUrl: 'https://example.com/kits-webcam.jpg',
};

const mockBeachNoPersonality: Beach = {
  id: 'unknown-beach',
  name: 'Unknown Beach',
  slug: 'unknown-beach',
  location: { latitude: 49.0, longitude: -123.0 },
  tideStationId: null,
  webcamUrl: null,
};

const mockBeachDogFriendly: Beach = {
  ...mockBeachKits,
  id: 'locarno-beach',
  name: 'Locarno Beach',
  slug: 'locarno-beach',
  amenities: {
    ...mockAmenities,
    dogFriendly: true,
    volleyballCourts: 0,
  },
};

const mockWaterQuality: WaterQualityStatus = {
  beachId: 'kitsilano-beach',
  level: 'good',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: '2024-06-01',
  fetchedAt: new Date().toISOString(),
};

const mockWeather: WeatherForecast = {
  beachId: 'kitsilano-beach',
  current: {
    temperature: 22,
    condition: 'sunny',
    humidity: 60,
    windSpeed: 15,
    windDirection: 'N',
    uvIndex: 4,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

describe('AboutTab', () => {
  // AC-001: Renders beach personality editorial from beach-personalities.ts
  describe('AC-001: Beach personality editorial description', () => {
    it('renders the editorial description from getPersonality(beach.id)', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      // kitsilano-beach editorial: "Kits Beach is Vancouver's most popular beach"
      expect(screen.getByText(/most popular beach/i)).toBeInTheDocument();
    });

    it('renders an "About this beach" heading', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByText(/about this beach/i)).toBeInTheDocument();
    });

    it('renders gracefully when no personality exists for beach id', () => {
      expect(() =>
        render(<AboutTab beach={mockBeachNoPersonality} waterQuality={null} weather={null} />),
      ).not.toThrow();
    });

    it('does not render editorial section when personality is not found', () => {
      render(<AboutTab beach={mockBeachNoPersonality} waterQuality={null} weather={null} />);
      expect(screen.queryByText(/about this beach/i)).not.toBeInTheDocument();
    });
  });

  // AC-002: Renders differentiators as 'What makes it special' list
  describe('AC-002: What makes it special list', () => {
    it('renders the "What makes it special" heading', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByText('What makes it special')).toBeInTheDocument();
    });

    it('renders each differentiator from personality.differentiators', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      // kitsilano-beach differentiators include "6 volleyball courts" (may appear in multiple places)
      const volleyballItems = screen.getAllByText(/6 volleyball courts/i);
      expect(volleyballItems.length).toBeGreaterThan(0);
      expect(screen.getByText(/Kitsilano Pool/i)).toBeInTheDocument();
    });

    it('does not render differentiators section when no personality', () => {
      render(<AboutTab beach={mockBeachNoPersonality} waterQuality={null} weather={null} />);
      expect(screen.queryByText('What makes it special')).not.toBeInTheDocument();
    });
  });

  // AC-003: Renders amenities grouped by use case
  describe('AC-003: Amenities grouped by use case', () => {
    it('renders "For families" group heading when restrooms or lifeguard or wheelchair exist', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByText('For families')).toBeInTheDocument();
    });

    it('renders amenity items under the families group', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      // restrooms is true, lifeguard is seasonal, wheelchairAccessible is true
      expect(screen.getByText('Restrooms')).toBeInTheDocument();
    });

    it('renders "For dogs" group heading when dogFriendly is true', () => {
      render(<AboutTab beach={mockBeachDogFriendly} waterQuality={null} weather={null} />);
      expect(screen.getByText('For dogs')).toBeInTheDocument();
    });

    it('does not render "For dogs" heading when dog not friendly', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.queryByText('For dogs')).not.toBeInTheDocument();
    });

    it('renders "For sports" group heading when volleyball courts > 0', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByText('For sports')).toBeInTheDocument();
    });

    it('does not render "For sports" heading when no volleyball courts', () => {
      render(<AboutTab beach={mockBeachDogFriendly} waterQuality={null} weather={null} />);
      expect(screen.queryByText('For sports')).not.toBeInTheDocument();
    });

    it('does not render amenity groups when beach has no amenities', () => {
      render(<AboutTab beach={mockBeachNoPersonality} waterQuality={null} weather={null} />);
      expect(screen.queryByText('For families')).not.toBeInTheDocument();
    });
  });

  // AC-004: Renders SafetyInfo component
  describe('AC-004: SafetyInfo component', () => {
    it('renders the Safety section heading from SafetyInfo', () => {
      render(
        <AboutTab beach={mockBeachKits} waterQuality={mockWaterQuality} weather={mockWeather} />,
      );
      expect(screen.getByRole('heading', { name: /safety/i })).toBeInTheDocument();
    });

    it('renders SafetyInfo with waterQuality and weather props', () => {
      render(
        <AboutTab beach={mockBeachKits} waterQuality={mockWaterQuality} weather={mockWeather} />,
      );
      expect(screen.getByText(/water quality is good/i)).toBeInTheDocument();
    });

    it('renders SafetyInfo even when waterQuality is null', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByRole('heading', { name: /safety/i })).toBeInTheDocument();
    });
  });

  // AC-005: Renders webcam section when beach has webcamUrl
  describe('AC-005: Webcam section', () => {
    it('renders a Webcam section heading when beach.webcamUrl is set', () => {
      render(<AboutTab beach={mockBeachWithWebcam} waterQuality={null} weather={null} />);
      expect(screen.getByText(/webcam/i)).toBeInTheDocument();
    });

    it('does not render webcam section when beach.webcamUrl is null', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      // Should not have a "Webcam" heading in the page
      expect(screen.queryByText(/^webcam$/i)).not.toBeInTheDocument();
    });
  });

  // Getting-there section
  describe('Getting there section', () => {
    it('renders a "Getting there" heading', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      expect(screen.getByText(/getting there/i)).toBeInTheDocument();
    });

    it('renders an "Open in Google Maps" link with coordinates', () => {
      render(<AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />);
      const link = screen.getByRole('link', { name: /open in google maps/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expect.stringContaining('49.2741'));
      expect(link).toHaveAttribute('href', expect.stringContaining('-123.153'));
    });
  });

  // Light-mode only
  describe('Light-mode-only styles', () => {
    it('does not use dark: Tailwind variants', () => {
      const { container } = render(
        <AboutTab beach={mockBeachKits} waterQuality={null} weather={null} />,
      );
      const html = container.innerHTML;
      expect(html).not.toContain('dark:');
    });
  });
});
