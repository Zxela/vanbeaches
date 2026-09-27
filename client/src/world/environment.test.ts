import {
  type EnvironmentData,
  type EnvironmentalWeather,
  isEnvironmentData,
} from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { normalizeEnvironment, predictedTide, smoothTide, visualWeather } from './environment';
import { solarPosition } from './solar';

const now = Date.parse('2026-09-18T20:00:00Z');
const location = { latitude: 49.276, longitude: -123.215 };
const weather: EnvironmentalWeather = {
  time: new Date(now).toISOString(),
  temperature: 18,
  condition: 'cloudy',
  cloudCover: 100,
  precipitation: 0,
  rain: 0,
  windSpeed: 20,
  windDirection: 350,
  visibility: null,
};
function fixture(): EnvironmentData {
  return {
    version: 1,
    beachId: 'spanish-banks',
    ...location,
    tide: {
      stationId: 'vancouver',
      stationCode: '07735',
      predictionsFetchedAt: new Date(now).toISOString(),
      observationsFetchedAt: new Date(now).toISOString(),
      extremes: [],
      predictions: [
        { time: new Date(now - 3600000).toISOString(), heightCD: 4 },
        { time: new Date(now).toISOString(), heightCD: 3 },
      ],
      observations: [{ time: new Date(now - 60000).toISOString(), heightCD: 3.2, qcFlag: '1' }],
    },
    weather: {
      current: weather,
      hourly: [
        weather,
        {
          ...weather,
          time: new Date(now + 3600000).toISOString(),
          windDirection: 10,
          cloudCover: 20,
        },
      ],
      fetchedAt: new Date(now).toISOString(),
    },
  };
}

describe('environment normalization', () => {
  it('rejects damaged persisted data before it reaches the renderer', () => {
    expect(isEnvironmentData(fixture())).toBe(true);
    const data = fixture();
    expect(isEnvironmentData({ ...data, tide: { ...data.tide, observations: [null] } })).toBe(
      false,
    );
    expect(
      isEnvironmentData({
        ...data,
        weather: { ...data.weather, current: { ...weather, rain: null } },
      }),
    ).toBe(false);
  });
  it('uses a recent good observation only in LIVE; timeline retains official prediction', () => {
    expect(normalizeEnvironment(fixture(), now, 'LIVE', location, 3, now).tide).toMatchObject({
      heightCD: 3.2,
      observed: true,
      source: 'observed',
    });
    expect(normalizeEnvironment(fixture(), now, 'TIMELINE', location, 3, now).tide).toMatchObject({
      heightCD: 3,
      observed: false,
      source: 'predicted',
    });
  });
  it('rejects suspect and stale observations without losing predictions', () => {
    const data = fixture();
    data.tide.observations[0].qcFlag = '3';
    expect(normalizeEnvironment(data, now, 'LIVE', location, 3, now).tide.source).toBe('predicted');
    data.tide.observations[0] = {
      time: new Date(now - 3600000).toISOString(),
      heightCD: 3.2,
      qcFlag: '1',
    };
    expect(normalizeEnvironment(data, now, 'LIVE', location, 3, now).tide.source).toBe('predicted');
  });
  it('interpolates only inside the prediction coverage; gaps are not fabricated', () => {
    const samples = fixture().tide.predictions;
    expect(predictedTide(samples, now - 1800000)).toBe(3.5);
    expect(predictedTide(samples, now + 1)).toBeNull();
    samples[0].time = new Date(now - 7200000).toISOString();
    expect(predictedTide(samples, now - 1800000)).toBeNull();
  });
  it('keeps last-known values explicit, then uses a neutral fallback when data expires', () => {
    expect(
      normalizeEnvironment(fixture(), now + 3600000, 'LIVE', location, 3, now).tide,
    ).toMatchObject({ source: 'last-known', stale: true, observed: false });
    const state = normalizeEnvironment(null, now, 'LIVE', location, 2.9, now);
    expect(state.tide).toMatchObject({ heightCD: 2.9, source: 'neutral', stale: true });
    expect(state.weather.source).toBe('neutral');
    expect(Number.isFinite(state.sun.elevation)).toBe(true);
  });
  it('interpolates weather and wind across north, and exposes stale forecast age', () => {
    const state = normalizeEnvironment(
      fixture(),
      now + 1800000,
      'TIMELINE',
      location,
      3,
      now + 7200000,
    );
    expect(state.weather.windDirection).toBe(0);
    expect(state.weather.cloudCover).toBe(60);
    expect(state.weather.stale).toBe(true);
  });
  it('solar position responds to UTC instants, independent of browser timezone', () => {
    const noon = solarPosition(
      Date.parse('2026-06-21T20:00:00Z'),
      location.latitude,
      location.longitude,
    );
    const night = solarPosition(
      Date.parse('2026-06-21T08:00:00Z'),
      location.latitude,
      location.longitude,
    );
    expect(noon.elevation).toBeGreaterThan(60);
    expect(noon.azimuth).toBeGreaterThan(160);
    expect(noon.azimuth).toBeLessThan(180);
    expect(night.elevation).toBeLessThan(-10);
  });
  it('smooths a refreshed tide without snapping or overshooting, at any frame rate', () => {
    const level = smoothTide(0, 4, 1 / 60, 'LIVE');
    expect(level).toBeGreaterThan(0);
    expect(level).toBeLessThan(0.01);
    let displayed = 0;
    for (let i = 0; i < 60; i++) displayed = smoothTide(displayed, 4, 1 / 60, 'LIVE');
    expect(displayed).toBeCloseTo(smoothTide(0, 4, 1, 'LIVE'), 10);
  });
  it('keeps ordinary overcast clear, bounds wind response, and uses FROM bearing correctly', () => {
    expect(visualWeather(weather).haze).toBe(1 / 40000);
    const gale = visualWeather({ ...weather, windSpeed: 200, windDirection: 0 });
    expect(gale.amplitude).toBe(0.16);
    expect(gale.direction.y).toBe(1); // northerly wind travels south (+Z)
    expect(visualWeather({ ...weather, precipitation: 2, rain: 0 }).rain).toBe(0);
  });
});
