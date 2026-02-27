import { render, screen } from '@testing-library/react';
import type { Beach, BeachAmenities } from '@van-beaches/shared';
import type { WaterQualityStatus } from '@van-beaches/shared';
import type { WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { SafetyInfo } from './SafetyInfo';

const mockAmenities: BeachAmenities = {
  parking: 'free',
  restrooms: true,
  showers: true,
  lifeguard: 'seasonal',
  foodNearby: true,
  dogFriendly: false,
  wheelchairAccessible: true,
  volleyballCourts: 0,
  firepits: false,
};

const mockBeach: Beach = {
  id: 'test-beach',
  name: 'Test Beach',
  slug: 'test-beach',
  location: { latitude: 49.28, longitude: -123.12 },
  tideStationId: null,
  webcamUrl: null,
  amenities: mockAmenities,
  safetyNotes: ['Always swim near a lifeguard', 'Check tide charts before visiting'],
};

const mockBeachNoLifeguard: Beach = {
  ...mockBeach,
  amenities: {
    ...mockAmenities,
    lifeguard: 'none',
  },
};

const mockWaterQualityGood: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'good',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: '2024-06-01',
  fetchedAt: new Date().toISOString(),
};

const mockWaterQualityAdvisory: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'advisory',
  ecoliCount: 250,
  advisoryReason: 'High E. coli levels detected',
  sampleDate: '2024-06-01',
  fetchedAt: new Date().toISOString(),
};

const mockWaterQualityClosed: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'closed',
  ecoliCount: 500,
  advisoryReason: 'Beach closed due to contamination',
  sampleDate: '2024-06-01',
  fetchedAt: new Date().toISOString(),
};

const mockWaterQualityUnknown: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'unknown',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: null,
  fetchedAt: new Date().toISOString(),
};

const mockWaterQualityOffSeason: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'off-season',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: null,
  fetchedAt: new Date().toISOString(),
};

const mockWeatherNormal: WeatherForecast = {
  beachId: 'test-beach',
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

const mockWeatherHighUV: WeatherForecast = {
  beachId: 'test-beach',
  current: {
    temperature: 28,
    condition: 'sunny',
    humidity: 50,
    windSpeed: 10,
    windDirection: 'N',
    uvIndex: 9,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

const mockWeatherHighWind: WeatherForecast = {
  beachId: 'test-beach',
  current: {
    temperature: 18,
    condition: 'partly-cloudy',
    humidity: 70,
    windSpeed: 35,
    windDirection: 'SW',
    uvIndex: 3,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

describe('SafetyInfo', () => {
  // AC-001: Prominent warning banner for advisory (amber) or closed (red)
  describe('AC-001: Water quality warning banners', () => {
    it('shows amber warning banner when water quality is advisory', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityAdvisory}
          weather={mockWeatherNormal}
        />,
      );
      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner.className).toContain('amber');
    });

    it('shows red warning banner when water quality is closed', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityClosed}
          weather={mockWeatherNormal}
        />,
      );
      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner.className).toContain('red');
    });

    it('displays advisory reason text in the banner', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityAdvisory}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText('High E. coli levels detected')).toBeInTheDocument();
    });

    it('does not show alert banner when water quality is good', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // AC-002: Informational message for unknown or off-season
  describe('AC-002: Informational message for unknown/off-season', () => {
    it('shows informational message for unknown water quality', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityUnknown}
          weather={mockWeatherNormal}
        />,
      );
      // Should show info message, not an alert/warning
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText(/water quality data not available/i)).toBeInTheDocument();
    });

    it('shows informational message for off-season water quality', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityOffSeason}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText(/off-season/i)).toBeInTheDocument();
    });
  });

  // AC-003: Positive status indicators when no warnings
  describe('AC-003: Positive status indicators', () => {
    it('shows positive "Water quality is good" indicator when quality is good', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText(/water quality is good/i)).toBeInTheDocument();
    });

    it('does not show positive indicator when water quality has advisory', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityAdvisory}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.queryByText(/water quality is good/i)).not.toBeInTheDocument();
    });
  });

  // AC-004: Display beach.safetyNotes array as list
  describe('AC-004: Safety notes list', () => {
    it('renders each safety note from beach.safetyNotes', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText('Always swim near a lifeguard')).toBeInTheDocument();
      expect(screen.getByText('Check tide charts before visiting')).toBeInTheDocument();
    });

    it('renders nothing for safetyNotes when array is empty', () => {
      const beachNoNotes: Beach = { ...mockBeach, safetyNotes: [] };
      const { container } = render(
        <SafetyInfo
          beach={beachNoNotes}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      // Should not have a safety notes list section
      expect(container.querySelector('ul')).toBeNull();
    });
  });

  // AC-005: Dynamic weather warnings (high UV > 7, high wind > 30 km/h)
  describe('AC-005: Dynamic weather warnings', () => {
    it('shows high UV warning when UV index is above 7', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherHighUV}
        />,
      );
      expect(screen.getByText(/high uv/i)).toBeInTheDocument();
    });

    it('shows high wind warning when wind speed is above 30 km/h', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherHighWind}
        />,
      );
      expect(screen.getByText(/high wind/i)).toBeInTheDocument();
    });

    it('does not show UV warning when UV index is 7 or below', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.queryByText(/high uv/i)).not.toBeInTheDocument();
    });

    it('does not show wind warning when wind speed is 30 km/h or below', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.queryByText(/high wind/i)).not.toBeInTheDocument();
    });
  });

  // AC-006: Lifeguard info from beach.amenities.lifeguard
  describe('AC-006: Lifeguard information', () => {
    it('shows lifeguard present info when amenities.lifeguard is seasonal', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText(/lifeguard on duty/i)).toBeInTheDocument();
    });

    it('shows no lifeguard warning when amenities.lifeguard is none', () => {
      render(
        <SafetyInfo
          beach={mockBeachNoLifeguard}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText(/no lifeguard/i)).toBeInTheDocument();
    });

    it('shows year-round lifeguard when amenities.lifeguard is year-round', () => {
      const beachYearRound: Beach = {
        ...mockBeach,
        amenities: { ...mockAmenities, lifeguard: 'year-round' },
      };
      render(
        <SafetyInfo
          beach={beachYearRound}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText(/lifeguard on duty/i)).toBeInTheDocument();
    });
  });

  // AC-007: Disclaimer that safety info is for reference only
  describe('AC-007: Safety disclaimer', () => {
    it('includes disclaimer text that safety info is for reference only', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByText(/for reference only/i)).toBeInTheDocument();
    });
  });

  // AC-008: ShieldCheck icon from lucide-react for section header
  describe('AC-008: Section header with ShieldCheck icon', () => {
    it('renders the Safety section heading', () => {
      render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      expect(screen.getByRole('heading', { name: /safety/i })).toBeInTheDocument();
    });

    it('renders a ShieldCheck svg icon in the section header', () => {
      const { container } = render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      // lucide-react renders ShieldCheck with class "lucide-shield-check"
      expect(container.querySelector('.lucide-shield-check')).toBeInTheDocument();
    });
  });

  // AC-009: Light-mode-only styles (no dark: classes)
  describe('AC-009: Light-mode-only styles', () => {
    it('does not use dark: Tailwind variants', () => {
      const { container } = render(
        <SafetyInfo
          beach={mockBeach}
          waterQuality={mockWaterQualityGood}
          weather={mockWeatherNormal}
        />,
      );
      const html = container.innerHTML;
      expect(html).not.toContain('dark:');
    });
  });

  // Null handling
  describe('Null state handling', () => {
    it('renders without errors when waterQuality is null', () => {
      expect(() =>
        render(<SafetyInfo beach={mockBeach} waterQuality={null} weather={mockWeatherNormal} />),
      ).not.toThrow();
    });

    it('renders without errors when weather is null', () => {
      expect(() =>
        render(<SafetyInfo beach={mockBeach} waterQuality={mockWaterQualityGood} weather={null} />),
      ).not.toThrow();
    });

    it('renders without errors when both waterQuality and weather are null', () => {
      expect(() =>
        render(<SafetyInfo beach={mockBeach} waterQuality={null} weather={null} />),
      ).not.toThrow();
    });
  });
});
