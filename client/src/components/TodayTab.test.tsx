import { render, screen } from '@testing-library/react';

import type { Beach, TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it, vi } from 'vitest';
import { TodayTab } from './TodayTab';

// --- Helper factories ---

function makeBeach(overrides: Partial<Beach> = {}): Beach {
  return {
    id: 'kits',
    name: 'Kitsilano Beach',
    slug: 'kitsilano',
    location: { latitude: 49.2766, longitude: -123.1554 },
    tideStationId: 'station-7795',
    webcamUrl: null,
    ...overrides,
  };
}

function makeWeather(overrides: Partial<WeatherForecast['current']> = {}): WeatherForecast {
  return {
    beachId: 'kits',
    current: {
      temperature: 22,
      condition: 'sunny',
      humidity: 55,
      windSpeed: 10,
      windDirection: 'NW',
      uvIndex: 5,
      ...overrides,
    },
    hourly: [],
    daily: [
      { date: '2026-02-27', high: 22, low: 14, condition: 'sunny' },
      { date: '2026-02-28', high: 18, low: 12, condition: 'partly-cloudy' },
      { date: '2026-03-01', high: 20, low: 13, condition: 'sunny' },
      { date: '2026-03-02', high: 14, low: 10, condition: 'rainy' },
      { date: '2026-03-03', high: 16, low: 11, condition: 'partly-cloudy' },
    ],
    fetchedAt: new Date().toISOString(),
  };
}

function makeTides(predictions: TideData['predictions'] = []): TideData {
  return {
    beachId: 'kits',
    stationId: 'station-7795',
    stationName: 'Point Atkinson',
    predictions,
    fetchedAt: new Date().toISOString(),
  };
}

function makeWaterQuality(level: WaterQualityStatus['level'] = 'good'): WaterQualityStatus {
  return {
    beachId: 'kits',
    level,
    ecoliCount: null,
    advisoryReason: null,
    sampleDate: null,
    fetchedAt: new Date().toISOString(),
  };
}

// --- Tests ---

describe('TodayTab', () => {
  // AC-001: TodayTab renders BeachVerdict at the top
  it('renders BeachVerdict at the top when weather is provided', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/today's verdict/i)).toBeInTheDocument();
  });

  it('does not render BeachVerdict when weather is null', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={null}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.queryByText(/today's verdict/i)).toBeNull();
  });

  // AC-002: TodayTab renders a compact conditions grid with temperature, wind, UV, water quality
  it('renders a "Conditions" section heading', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/^conditions$/i)).toBeInTheDocument();
  });

  it('renders temperature in the conditions grid', () => {
    const { container } = render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather({ temperature: 22 })}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    // Should show "22°" in the conditions grid (text-xl font-bold)
    const tempEl = container.querySelector('.text-xl.font-bold');
    expect(tempEl?.textContent).toMatch(/22°/);
  });

  it('renders wind speed in the conditions grid', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather({ windSpeed: 10, windDirection: 'NW' })}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/10\s*km\/h/i)).toBeInTheDocument();
  });

  it('renders UV index in the conditions grid', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather({ uvIndex: 5 })}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/uv\s*5/i)).toBeInTheDocument();
  });

  it('renders water quality in the conditions grid when provided', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={makeWaterQuality('good')}
        sunsetTime={null}
      />,
    );
    // The conditions grid shows "Water" label in a heading role
    const waterEls = screen.getAllByText(/^water$/i);
    expect(waterEls.length).toBeGreaterThan(0);
  });

  it('renders conditions grid as 3-col grid on mobile', () => {
    const { container } = render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    // The conditions grid should use grid-cols-3 class
    const html = container.innerHTML;
    expect(html).toMatch(/grid-cols-3/);
  });

  // AC-003: TodayTab renders TideCanvas when beach has a tide station
  it('renders a "Tides" section heading when beach has a tideStationId', () => {
    render(
      <TodayTab
        beach={makeBeach({ tideStationId: 'station-7795' })}
        weather={makeWeather()}
        tides={makeTides()}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/^tides$/i)).toBeInTheDocument();
  });

  it('does not render a "Tides" section when beach has no tideStationId', () => {
    render(
      <TodayTab
        beach={makeBeach({ tideStationId: null })}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.queryByText(/^tides$/i)).toBeNull();
  });

  it('does not render a "Tides" section when tides data is null', () => {
    render(
      <TodayTab
        beach={makeBeach({ tideStationId: 'station-7795' })}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.queryByText(/^tides$/i)).toBeNull();
  });

  // AC-004: TodayTab renders WeatherForecast for 5-day outlook
  it('renders a "5-Day Forecast" section when weather has daily data', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/5-day forecast/i)).toBeInTheDocument();
  });

  it('does not render WeatherForecast section when weather is null', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={null}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.queryByText(/5-day forecast/i)).toBeNull();
  });

  // Section headings use Fraunces (font-display)
  it('uses font-display (Fraunces) class on section headings', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    const conditionsHeading = screen.getByText(/^conditions$/i);
    expect(conditionsHeading.className).toMatch(/font-display/);
  });

  // Light-mode only — TodayTab's own wrapper element should not use dark: classes
  it('does not use dark: classes in TodayTab own wrapper', () => {
    const { container } = render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={makeTides()}
        waterQuality={makeWaterQuality()}
        sunsetTime="2026-02-27T19:45:00.000Z"
      />,
    );
    // The outermost wrapper div should not have dark: classes
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).not.toContain('dark:');
  });

  // ActivityRecommendations section (What to do)
  it('renders activity recommendations when weather is provided', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    // ActivityRecommendations renders "Recommended Activities" or individual activities
    // For sunny + 22° weather, beach walking will always be there
    expect(screen.getByText(/beach walking/i)).toBeInTheDocument();
  });

  // SunTimesWidget rendered (sunrise/sunset)
  it('renders sun times section with beach coordinates', () => {
    render(
      <TodayTab
        beach={makeBeach({ location: { latitude: 49.2766, longitude: -123.1554 } })}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    // SunTimesWidget shows "Sun Times" heading
    expect(screen.getByText(/sun times/i)).toBeInTheDocument();
  });

  // AC-010-UI: Water quality displayed as text label badge with colored background
  it('renders water quality as text label with data-testid and bg-emerald class for good quality', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={makeWaterQuality('good')}
        sunsetTime={null}
      />,
    );
    const label = screen.getByTestId('water-quality-label');
    expect(label).toHaveTextContent('Safe');
    expect(label.className).toMatch(/bg-emerald/);
  });

  // AC-017: Conditions section shows "Updated X min ago" timestamp
  it('shows "Updated X min ago" timestamp in conditions section when weather is loaded', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    expect(screen.getByText(/Updated \d+ min ago/)).toBeInTheDocument();
  });

  // AC-015: Weather error shows error card with retry button
  it('shows "Couldn\'t load conditions" error card when weatherError is provided', () => {
    render(
      <TodayTab
        beach={makeBeach()}
        weather={null}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
        weatherError="Failed to fetch"
        onRetryWeather={vi.fn()}
      />,
    );
    expect(screen.getByText("Couldn't load conditions")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  // AC-016: Tide error shows "Tide data unavailable" with retry button
  it('shows "Tide data unavailable" error card when tideError is provided', () => {
    const onRetryTide = vi.fn();
    render(
      <TodayTab
        beach={makeBeach({ tideStationId: 'station-7795' })}
        weather={makeWeather()}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
        tideError="Failed to fetch"
        onRetryTide={onRetryTide}
      />,
    );
    expect(screen.getByText('Tide data unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
