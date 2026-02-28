import type { TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { type BeachVerdict, computeVerdict } from './verdict';

// Helpers for building mock data
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

// A future time string N hours from now
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

describe('BeachVerdict interface', () => {
  // AC-001: BeachVerdict interface shape
  it('computeVerdict returns an object with all required BeachVerdict fields', () => {
    const result: BeachVerdict = computeVerdict(makeWeather(), null, null, null);

    expect(result).toHaveProperty('recommendation');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('bestTimeWindow');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('suggestion');

    expect(['perfect', 'good', 'fair', 'skip']).toContain(result.recommendation);
    expect(typeof result.summary).toBe('string');
    expect(typeof result.bestTimeWindow).toBe('string');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.suggestion).toBe('string');
  });
});

describe('computeVerdict - perfect conditions', () => {
  // AC-002: perfect when sunny, temp >= 20, wind < 15, UV 3-6, water quality good
  it('returns perfect when sunny, temp >= 20, wind < 15, UV 3-6, water quality good', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 10, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');

    const result = computeVerdict(weather, null, waterQuality, null);

    expect(result.recommendation).toBe('perfect');
  });

  it('returns perfect at the boundary temperature of 20', () => {
    const weather = makeWeather({ temperature: 20, condition: 'sunny', windSpeed: 10, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');

    const result = computeVerdict(weather, null, waterQuality, null);

    expect(result.recommendation).toBe('perfect');
  });

  it('returns perfect at wind speed of 14 (just below 15)', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 14, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');

    const result = computeVerdict(weather, null, waterQuality, null);

    expect(result.recommendation).toBe('perfect');
  });

  it('does not return perfect when water quality is not good', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 10, uvIndex: 5 });
    const waterQuality = makeWaterQuality('advisory');

    const result = computeVerdict(weather, null, waterQuality, null);

    expect(result.recommendation).not.toBe('perfect');
  });

  it('does not return perfect when wind is >= 15', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 15, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');

    const result = computeVerdict(weather, null, waterQuality, null);

    expect(result.recommendation).not.toBe('perfect');
  });
});

describe('computeVerdict - skip conditions', () => {
  // AC-003: skip when stormy or rainy with high winds
  it('returns skip when weather is stormy', () => {
    const weather = makeWeather({ condition: 'stormy', windSpeed: 35 });

    const result = computeVerdict(weather, null, null, null);

    expect(result.recommendation).toBe('skip');
  });

  it('returns skip when weather is rainy with high winds', () => {
    const weather = makeWeather({ condition: 'rainy', windSpeed: 30 });

    const result = computeVerdict(weather, null, null, null);

    expect(result.recommendation).toBe('skip');
  });

  it('does not return skip for rainy weather with low winds', () => {
    const weather = makeWeather({ condition: 'rainy', windSpeed: 8 });

    const result = computeVerdict(weather, null, null, null);

    expect(result.recommendation).not.toBe('skip');
  });
});

describe('computeVerdict - human-readable summary', () => {
  // AC-004: summary mentions key conditions
  it('produces a non-empty summary string', () => {
    const result = computeVerdict(makeWeather(), null, null, null);

    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('produces a summary that reads like editorial prose', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 10, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');

    const result = computeVerdict(weather, null, waterQuality, null);

    // Summary should be at least a few words (not just a single word)
    const wordCount = result.summary.split(' ').filter((w) => w.length > 0).length;
    expect(wordCount).toBeGreaterThanOrEqual(3);
  });

  it('mentions temperature or conditions in the summary', () => {
    const weather = makeWeather({
      temperature: 25,
      condition: 'sunny',
      windSpeed: 8,
      uvIndex: 4,
    });
    const result = computeVerdict(weather, null, makeWaterQuality('good'), null);

    // summary should reference something meaningful about conditions
    const summaryLower = result.summary.toLowerCase();
    const mentionsSomethingRelevant =
      /sunny|warm|perfect|ideal|hot|golden|afternoon|evening|day|beach|tide|wind|calm/i.test(
        summaryLower,
      );
    expect(mentionsSomethingRelevant).toBe(true);
  });

  it('produces a different summary for skip conditions', () => {
    const perfectWeather = makeWeather({
      temperature: 22,
      condition: 'sunny',
      windSpeed: 10,
      uvIndex: 5,
    });
    const skipWeather = makeWeather({ condition: 'stormy', windSpeed: 40 });

    const perfectResult = computeVerdict(perfectWeather, null, makeWaterQuality('good'), null);
    const skipResult = computeVerdict(skipWeather, null, null, null);

    expect(perfectResult.summary).not.toBe(skipResult.summary);
  });
});

describe('computeVerdict - bestTimeWindow', () => {
  // AC-005: bestTimeWindow based on tide timing and sunset
  it('returns a non-empty bestTimeWindow string', () => {
    const result = computeVerdict(makeWeather(), null, null, null);

    expect(result.bestTimeWindow.length).toBeGreaterThan(0);
  });

  it('bestTimeWindow reflects high tide timing when provided', () => {
    const highTideAt6pm = makeTides([
      { time: hoursFromNow(6), height: 1.8, type: 'high' },
      { time: hoursFromNow(12), height: 0.3, type: 'low' },
    ]);
    const sunset = hoursFromNow(7); // 7 hours from now

    const result = computeVerdict(makeWeather(), highTideAt6pm, null, sunset);

    // bestTimeWindow should mention some time range (e.g. "5-7pm", "3-5pm", etc.)
    expect(result.bestTimeWindow).toMatch(/\d/); // contains a digit
  });

  it('bestTimeWindow produces a time-range-like string when sunset is provided', () => {
    const sunset = hoursFromNow(5);

    const result = computeVerdict(makeWeather(), null, null, sunset);

    // Should contain digits indicating a time range
    expect(result.bestTimeWindow).toMatch(/\d/);
  });
});

describe('computeVerdict - reasons array', () => {
  it('returns 2-4 reason strings', () => {
    const weather = makeWeather({ temperature: 22, condition: 'sunny', windSpeed: 10, uvIndex: 5 });
    const waterQuality = makeWaterQuality('good');
    const tides = makeTides([{ time: hoursFromNow(3), height: 1.8, type: 'high' }]);

    const result = computeVerdict(weather, tides, waterQuality, null);

    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.reasons.length).toBeLessThanOrEqual(4);
    for (const r of result.reasons) {
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    }
  });

  it('includes calm winds as a reason when wind is low', () => {
    const weather = makeWeather({ windSpeed: 8, condition: 'sunny', temperature: 22 });

    const result = computeVerdict(weather, null, null, null);

    const hasWindReason = result.reasons.some((r) => /calm|wind/i.test(r));
    expect(hasWindReason).toBe(true);
  });

  it('includes high tide timing as a reason when high tide is coming up', () => {
    const tides = makeTides([{ time: hoursFromNow(3), height: 1.8, type: 'high' }]);

    const result = computeVerdict(makeWeather(), tides, null, null);

    const hasTideReason = result.reasons.some((r) => /tide/i.test(r));
    expect(hasTideReason).toBe(true);
  });

  it('includes golden hour as a reason when sunset time is provided', () => {
    const sunset = hoursFromNow(4);

    const result = computeVerdict(makeWeather(), null, null, sunset);

    const hasGoldenHourReason = result.reasons.some((r) => /golden|sunset|hour/i.test(r));
    expect(hasGoldenHourReason).toBe(true);
  });
});

describe('computeVerdict - suggestion', () => {
  it('returns a non-empty actionable suggestion string', () => {
    const result = computeVerdict(makeWeather(), null, null, null);

    expect(result.suggestion.length).toBeGreaterThan(0);
  });

  it('suggestion ends with a period', () => {
    const result = computeVerdict(makeWeather(), null, null, null);

    expect(result.suggestion.endsWith('.')).toBe(true);
  });

  it('suggestion is different for perfect vs skip conditions', () => {
    const perfectResult = computeVerdict(
      makeWeather({ condition: 'sunny', temperature: 22, windSpeed: 10, uvIndex: 5 }),
      null,
      makeWaterQuality('good'),
      null,
    );
    const skipResult = computeVerdict(
      makeWeather({ condition: 'stormy', windSpeed: 40 }),
      null,
      null,
      null,
    );

    expect(perfectResult.suggestion).not.toBe(skipResult.suggestion);
  });
});
