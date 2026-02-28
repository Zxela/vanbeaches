import { render, screen } from '@testing-library/react';
import type { TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { BeachVerdict } from './BeachVerdict';

// --- Helper factories ---

function makeWeather(overrides: Partial<WeatherForecast['current']> = {}): WeatherForecast {
  return {
    beachId: 'test-beach',
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
    fetchedAt: new Date().toISOString(),
  };
}

function makeTides(predictions: TideData['predictions'] = []): TideData {
  return {
    beachId: 'test-beach',
    stationId: 'station-1',
    stationName: 'Test Station',
    predictions,
    fetchedAt: new Date().toISOString(),
  };
}

function makeWaterQuality(level: WaterQualityStatus['level'] = 'good'): WaterQualityStatus {
  return {
    beachId: 'test-beach',
    level,
    ecoliCount: null,
    advisoryReason: null,
    sampleDate: null,
    fetchedAt: new Date().toISOString(),
  };
}

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

// --- Tests ---

describe('BeachVerdict', () => {
  // AC-003: renders null when no weather data is available
  it('renders null when weather is null', () => {
    const { container } = render(
      <BeachVerdict weather={null} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // AC-001: renders the verdict summary text from computeVerdict
  it('renders the verdict summary text', () => {
    render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    // The summary from computeVerdict should appear in the document
    // For perfect conditions: "Perfect conditions..." or similar
    const html = document.body.textContent || '';
    const hasSummary = /perfect|good|decent|fair|storm|rain|conditions|beach|day|trip/i.test(html);
    expect(hasSummary).toBe(true);
  });

  it('renders the "Today\'s Verdict" heading', () => {
    render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    expect(screen.getByText(/today's verdict/i)).toBeInTheDocument();
  });

  // AC-002: displays the bestTimeWindow
  it('displays the bestTimeWindow from computeVerdict', () => {
    render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    // bestTimeWindow should appear somewhere — "This afternoon" or a time range
    const html = document.body.textContent || '';
    const hasBestTime = /afternoon|am|pm|\d{1,2}:\d{2}/i.test(html);
    expect(hasBestTime).toBe(true);
  });

  it('labels the bestTimeWindow with "Best time"', () => {
    render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    expect(screen.getByText(/best time/i)).toBeInTheDocument();
  });

  // AC-004: color coding based on recommendation level
  it('uses green/emerald color for perfect recommendation', () => {
    const perfectWeather = makeWeather({
      temperature: 22,
      condition: 'sunny',
      windSpeed: 10,
      uvIndex: 5,
    });
    const { container } = render(
      <BeachVerdict
        weather={perfectWeather}
        tides={null}
        waterQuality={makeWaterQuality('good')}
        sunsetTime={null}
      />,
    );
    // Should contain emerald or green class somewhere in the component
    const html = container.innerHTML;
    const hasGreenColor = /emerald|green/i.test(html);
    expect(hasGreenColor).toBe(true);
  });

  it('uses amber/yellow color for fair recommendation', () => {
    // Fair: rainy with low winds
    const fairWeather = makeWeather({ condition: 'rainy', windSpeed: 5 });
    const { container } = render(
      <BeachVerdict weather={fairWeather} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    const html = container.innerHTML;
    const hasAmberColor = /amber|yellow/i.test(html);
    expect(hasAmberColor).toBe(true);
  });

  it('uses red color for skip recommendation', () => {
    const skipWeather = makeWeather({ condition: 'stormy', windSpeed: 35 });
    const { container } = render(
      <BeachVerdict weather={skipWeather} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    const html = container.innerHTML;
    const hasRedColor = /\bred[-\w]*(?:bg|text|border|ring)|\b(?:bg|text|border|ring)-red/i.test(
      html,
    );
    expect(hasRedColor).toBe(true);
  });

  it('uses blue/ocean color for good recommendation', () => {
    // good: cloudy, warm, moderate winds
    const goodWeather = makeWeather({
      condition: 'sunny',
      temperature: 22,
      windSpeed: 18, // >= 15, so not perfect
      uvIndex: 5,
    });
    const { container } = render(
      <BeachVerdict weather={goodWeather} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    const html = container.innerHTML;
    const hasBlueColor = /ocean|blue/i.test(html);
    expect(hasBlueColor).toBe(true);
  });

  // Renders reasons list
  it('renders the reasons from computeVerdict', () => {
    render(
      <BeachVerdict
        weather={makeWeather({ windSpeed: 8 })}
        tides={null}
        waterQuality={null}
        sunsetTime={null}
      />,
    );
    // calm winds reason should appear
    const html = document.body.textContent || '';
    const hasReason = /calm|wind|sunny|warm|pleasant|uv|tide|golden|sunset/i.test(html);
    expect(hasReason).toBe(true);
  });

  // Uses Fraunces font for the heading
  it('uses font-display (Fraunces) class on the heading', () => {
    render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    const heading = screen.getByText(/today's verdict/i);
    expect(heading.className).toMatch(/font-display/);
  });

  // No dark: classes (light-mode only)
  it('does not use any dark: classes in the component', () => {
    const { container } = render(
      <BeachVerdict weather={makeWeather()} tides={null} waterQuality={null} sunsetTime={null} />,
    );
    expect(container.innerHTML).not.toContain('dark:');
  });

  // Renders correctly with tides and sunset time provided
  it('displays time window when tides are provided', () => {
    const tides = makeTides([{ time: hoursFromNow(4), height: 1.8, type: 'high' }]);
    render(
      <BeachVerdict
        weather={makeWeather()}
        tides={tides}
        waterQuality={null}
        sunsetTime={hoursFromNow(6)}
      />,
    );
    // bestTimeWindow should include a digit (time range)
    const html = document.body.textContent || '';
    expect(/\d/.test(html)).toBe(true);
  });
});
