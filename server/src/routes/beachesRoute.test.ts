import { BEACHES } from '@van-beaches/shared';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import supertest from 'supertest';

vi.mock('../cache/cacheManager.js', () => ({
  cacheManager: {
    get: vi.fn(),
  },
}));

import { cacheManager } from '../cache/cacheManager.js';

const mockWeatherData = {
  beachId: BEACHES[0].id,
  current: {
    temperature: 18.5,
    condition: 'sunny',
    humidity: 65,
    windSpeed: 12,
    windDirection: 'N',
    uvIndex: 4,
  },
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

const mockTideData = {
  beachId: BEACHES[0].id,
  stationId: '5cebf1de3d0f4a073c4bb943',
  stationName: 'Vancouver Harbour',
  predictions: [
    { time: new Date(Date.now() + 3600000).toISOString(), height: 4.2, type: 'high' },
    { time: new Date(Date.now() + 7200000).toISOString(), height: 0.5, type: 'low' },
  ],
  fetchedAt: new Date().toISOString(),
};

async function buildApp() {
  const app = express();
  const { default: beachesRouter } = await import('./beachesRoute.js');
  app.use('/api', beachesRouter);
  return app;
}

describe('beachesRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/beaches', () => {
    it('returns weather data when cache has weather for a beach', async () => {
      vi.mocked(cacheManager.get).mockImplementation(async (key: string) => {
        if (key === `weather:${BEACHES[0].id}`) return mockWeatherData;
        return null;
      });

      const app = await buildApp();
      const res = await supertest(app).get('/api/beaches');

      expect(res.status).toBe(200);
      const beach = res.body.data.find((b: { id: string }) => b.id === BEACHES[0].id);
      expect(beach.currentWeather).not.toBeNull();
      expect(beach.currentWeather.temperature).toBe(18.5);
      expect(beach.currentWeather.condition).toBe('sunny');
      expect(beach.currentWeather.icon).toBeDefined();
    });

    it('returns tide data when cache has tides for a beach', async () => {
      vi.mocked(cacheManager.get).mockImplementation(async (key: string) => {
        if (BEACHES[0].tideStationId && key === `tides:${BEACHES[0].tideStationId}`) {
          return mockTideData;
        }
        return null;
      });

      const app = await buildApp();
      const res = await supertest(app).get('/api/beaches');

      expect(res.status).toBe(200);
      const beach = res.body.data.find((b: { id: string }) => b.id === BEACHES[0].id);
      expect(beach.nextTide).not.toBeNull();
      expect(beach.nextTide.type).toBe('high');
      expect(beach.nextTide.height).toBe(4.2);
      expect(beach.nextTide.time).toBeDefined();
    });

    it('returns null for currentWeather and nextTide when cache is empty (cold start)', async () => {
      vi.mocked(cacheManager.get).mockResolvedValue(null);

      const app = await buildApp();
      const res = await supertest(app).get('/api/beaches');

      expect(res.status).toBe(200);
      for (const beach of res.body.data) {
        expect(beach.currentWeather).toBeNull();
        expect(beach.nextTide).toBeNull();
      }
    });

    it('returns null for a single field when per-beach cache read fails, not 500', async () => {
      vi.mocked(cacheManager.get).mockRejectedValue(new Error('Cache error'));

      const app = await buildApp();
      const res = await supertest(app).get('/api/beaches');

      expect(res.status).toBe(200);
      for (const beach of res.body.data) {
        expect(beach.currentWeather).toBeNull();
        expect(beach.nextTide).toBeNull();
      }
    });
  });
});
