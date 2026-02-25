import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock cacheManager to bypass cache and call through to fetch
vi.mock('../cache/cacheManager.js', () => ({
  cacheManager: {
    getOrFetch: vi.fn().mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    ),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('weatherService', () => {
  const capturedUrls: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    capturedUrls.length = 0;

    // Capture the URL and return a mock response with daily data
    mockFetch.mockImplementation((url: string) => {
      capturedUrls.push(url);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            current: {
              temperature_2m: 18.5,
              weather_code: 1,
              relative_humidity_2m: 65,
              wind_speed_10m: 12,
              wind_direction_10m: 180,
              uv_index: 4,
            },
            hourly: {
              time: Array.from({ length: 24 }, (_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`),
              temperature_2m: Array.from({ length: 24 }, () => 17),
              weather_code: Array.from({ length: 24 }, () => 1),
              precipitation_probability: Array.from({ length: 24 }, () => 10),
            },
            daily: {
              time: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
              weather_code: [1, 2, 3, 61, 95],
              temperature_2m_max: [20, 18, 16, 14, 12],
              temperature_2m_min: [10, 9, 8, 7, 6],
            },
          }),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('daily forecast parameters', () => {
    it('includes daily=weather_code,temperature_2m_max,temperature_2m_min in URL', async () => {
      const { getWeatherForecast } = await import('./weatherService.js');
      await getWeatherForecast('test-beach', 49.2827, -123.1207);

      expect(capturedUrls[0]).toContain('daily=weather_code,temperature_2m_max,temperature_2m_min');
    });

    it('includes forecast_days=5 in URL', async () => {
      const { getWeatherForecast } = await import('./weatherService.js');
      await getWeatherForecast('test-beach', 49.2827, -123.1207);

      expect(capturedUrls[0]).toContain('forecast_days=5');
    });

    it('returns daily array with 5 entries containing date, high, low, and condition', async () => {
      const { getWeatherForecast } = await import('./weatherService.js');
      const result = await getWeatherForecast('test-beach', 49.2827, -123.1207);

      expect(result.daily).toHaveLength(5);
      expect(result.daily![0]).toHaveProperty('date', '2024-01-01');
      expect(result.daily![0]).toHaveProperty('high', 20);
      expect(result.daily![0]).toHaveProperty('low', 10);
      expect(result.daily![0]).toHaveProperty('condition', 'sunny');
    });

    it('returns undefined for daily field when daily data is absent from API response', async () => {
      mockFetch.mockImplementationOnce((_url: string) => {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 18.5,
                weather_code: 1,
                relative_humidity_2m: 65,
                wind_speed_10m: 12,
                wind_direction_10m: 180,
                uv_index: 4,
              },
              hourly: {
                time: Array.from({ length: 24 }, (_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`),
                temperature_2m: Array.from({ length: 24 }, () => 17),
                weather_code: Array.from({ length: 24 }, () => 1),
                precipitation_probability: Array.from({ length: 24 }, () => 10),
              },
              // no 'daily' field
            }),
        });
      });

      const { getWeatherForecast } = await import('./weatherService.js');
      const result = await getWeatherForecast('test-beach-no-daily', 49.2827, -123.1207);

      expect(result.daily).toBeUndefined();
    });
  });
});
