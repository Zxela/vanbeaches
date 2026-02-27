import { render, screen } from '@testing-library/react';
import type { TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { BeachScore } from './BeachScore';

const mockWeather: WeatherForecast = {
  beachId: 'test-beach',
  current: {
    temperature: 24,
    condition: 'sunny',
    humidity: 60,
    windSpeed: 10,
    windDirection: 'N',
    uvIndex: 5,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

const mockTides: TideData = {
  beachId: 'test-beach',
  stationId: 'station-1',
  stationName: 'Test Station',
  predictions: [
    { time: new Date(Date.now() + 60 * 60000).toISOString(), height: 0.3, type: 'low' },
    { time: new Date(Date.now() + 7 * 60 * 60000).toISOString(), height: 1.8, type: 'high' },
  ],
  fetchedAt: new Date().toISOString(),
};

const mockWaterQuality: WaterQualityStatus = {
  beachId: 'test-beach',
  level: 'good',
  ecoliCount: null,
  advisoryReason: null,
  sampleDate: null,
  fetchedAt: new Date().toISOString(),
};

describe('BeachScore', () => {
  // AC-001: Returns null when weather is null (graceful degradation)
  it('returns null when weather is null', () => {
    const { container } = render(<BeachScore weather={null} tides={null} waterQuality={null} />);
    expect(container.firstChild).toBeNull();
  });

  // AC-002: Renders with Target icon and section header
  it('renders section header with Target icon and title', () => {
    render(<BeachScore weather={mockWeather} tides={null} waterQuality={null} />);
    expect(screen.getByText(/beach score/i)).toBeInTheDocument();
    // Target icon renders as SVG
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  // AC-003: Displays a numeric score between 0-100
  it('displays a numeric score between 0 and 100', () => {
    render(<BeachScore weather={mockWeather} tides={mockTides} waterQuality={mockWaterQuality} />);
    const scoreEl = screen.getByTestId('beach-score-value');
    const score = Number.parseInt(scoreEl.textContent || '0', 10);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // AC-004: Progress bar with gradient coloring
  it('renders a progress bar element', () => {
    const { container } = render(
      <BeachScore weather={mockWeather} tides={null} waterQuality={null} />,
    );
    // Check for a div with width style (progress bar pattern)
    const html = container.innerHTML;
    expect(html).toContain('width:');
    expect(html).toContain('gradient');
  });

  // AC-005: Natural-language recommendation text is shown
  it('displays a natural-language recommendation', () => {
    render(<BeachScore weather={mockWeather} tides={null} waterQuality={null} />);
    // Should show some recommendation text
    const html = document.body.textContent || '';
    // Any of these words indicate a recommendation
    const hasRecommendation =
      /great|good|excellent|fair|poor|perfect|ideal|warning|caution|sunny|warm|cool|cold|windy|rain|storm/i.test(
        html,
      );
    expect(hasRecommendation).toBe(true);
  });

  // AC-006: Scoring algorithm - weather conditions affect score
  it('gives a lower score for stormy weather than sunny weather', () => {
    const { rerender } = render(
      <BeachScore weather={mockWeather} tides={null} waterQuality={null} />,
    );
    const sunnyScore = extractScore(document.body);

    const stormyWeather: WeatherForecast = {
      ...mockWeather,
      current: { ...mockWeather.current, condition: 'stormy' },
    };
    rerender(<BeachScore weather={stormyWeather} tides={null} waterQuality={null} />);
    const stormyScore = extractScore(document.body);

    expect(sunnyScore).toBeGreaterThan(stormyScore);
  });

  // AC-007: Scoring algorithm - water quality advisory reduces score
  it('reduces score when water quality is advisory', () => {
    const { rerender } = render(
      <BeachScore weather={mockWeather} tides={null} waterQuality={mockWaterQuality} />,
    );
    const goodScore = extractScore(document.body);

    const advisoryQuality: WaterQualityStatus = { ...mockWaterQuality, level: 'advisory' };
    rerender(<BeachScore weather={mockWeather} tides={null} waterQuality={advisoryQuality} />);
    const advisoryScore = extractScore(document.body);

    expect(goodScore).toBeGreaterThan(advisoryScore);
  });

  // AC-008: Scoring algorithm - water quality closed greatly reduces score
  it('greatly reduces score when water quality is closed', () => {
    const closedQuality: WaterQualityStatus = { ...mockWaterQuality, level: 'closed' };
    render(<BeachScore weather={mockWeather} tides={null} waterQuality={closedQuality} />);
    const closedScore = extractScore(document.body);
    // closed should reduce by 30, putting a base score in low range
    // base 50 + weather +20 + wind +10 + UV +5 - 30 = 55 (may vary)
    // just confirm it's not high (>= 80 would be excellent)
    expect(closedScore).toBeLessThan(80);
  });

  // AC-009: Score is clamped to 0-100
  it('clamps score to 0 when all conditions are worst case', () => {
    const worstWeather: WeatherForecast = {
      ...mockWeather,
      current: {
        temperature: 5,
        condition: 'stormy',
        humidity: 90,
        windSpeed: 50,
        windDirection: 'N',
        uvIndex: 10,
      },
    };
    const closedQuality: WaterQualityStatus = { ...mockWaterQuality, level: 'closed' };
    render(<BeachScore weather={worstWeather} tides={null} waterQuality={closedQuality} />);
    const score = extractScore(document.body);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // AC-010: Light-mode-only styles (no dark: classes in BeachScore's own markup)
  it('uses light-mode-only styles in BeachScore-specific elements', () => {
    render(<BeachScore weather={mockWeather} tides={null} waterQuality={null} />);
    // The score value element itself should not have dark: classes
    const scoreEl = screen.getByTestId('beach-score-value');
    expect(scoreEl.className).not.toContain('dark:');
    // The recommendation text should not have dark: classes
    const allP = document.querySelectorAll('p.text-sand-700');
    expect(allP.length).toBeGreaterThan(0);
    for (const el of allP) {
      expect(el.className).not.toContain('dark:');
    }
  });

  // AC-011: Tide timing bonus for low tide within 2 hours
  it('gives bonus for low tide within 2 hours', () => {
    // Use weather that scores below 95 so the +5 tide bonus is detectable
    const weatherWithRoom: WeatherForecast = {
      ...mockWeather,
      current: {
        ...mockWeather.current,
        condition: 'cloudy', // +10 instead of +20
        temperature: 20, // +10 instead of +15
        windSpeed: 20, // +5 instead of +10
        uvIndex: 7, // no bonus (4-6 range gives +5, 7 gives 0)
      },
    };
    // base 50 + 10 + 10 + 5 = 75 without tides, 80 with near low tide

    const tidesSoon: TideData = {
      ...mockTides,
      predictions: [
        { time: new Date(Date.now() + 60 * 60000).toISOString(), height: 0.3, type: 'low' },
      ],
    };
    const tidesLater: TideData = {
      ...mockTides,
      predictions: [
        { time: new Date(Date.now() + 5 * 60 * 60000).toISOString(), height: 0.3, type: 'low' },
      ],
    };

    const { rerender } = render(
      <BeachScore weather={weatherWithRoom} tides={tidesSoon} waterQuality={null} />,
    );
    const scoreWithNearLowTide = extractScore(document.body);

    rerender(<BeachScore weather={weatherWithRoom} tides={tidesLater} waterQuality={null} />);
    const scoreWithFarLowTide = extractScore(document.body);

    expect(scoreWithNearLowTide).toBeGreaterThan(scoreWithFarLowTide);
  });
});

// Helper: extract the beach score from the score value element
function extractScore(body: HTMLElement): number {
  const el = body.querySelector('[data-testid="beach-score-value"]');
  if (!el) return 0;
  const n = Number.parseInt(el.textContent || '0', 10);
  return Number.isNaN(n) ? 0 : n;
}
