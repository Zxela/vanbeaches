import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWeatherForBeach } from './weatherService';

function createMockKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    _store: store,
  } as unknown as KVNamespace & { _store: Map<string, string> };
}

const MOCK_OPEN_METEO_RESPONSE = {
  current: {
    temperature_2m: 18.5,
    weather_code: 2,
    relative_humidity_2m: 65,
    wind_speed_10m: 12.3,
    wind_direction_10m: 225,
    uv_index: 5,
  },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => `2026-02-25T${String(i).padStart(2, '0')}:00`),
    temperature_2m: Array.from({ length: 24 }, () => 18),
    weather_code: Array.from({ length: 24 }, () => 1),
    precipitation_probability: Array.from({ length: 24 }, () => 10),
  },
  daily: {
    time: ['2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01'],
    temperature_2m_max: [20, 21, 19, 22, 20],
    temperature_2m_min: [12, 13, 11, 14, 12],
    weather_code: [1, 2, 3, 0, 45],
  },
};

describe('weatherService', () => {
  let mockKv: ReturnType<typeof createMockKv>;

  beforeEach(() => {
    mockKv = createMockKv();
    vi.restoreAllMocks();
  });

  it('fetches from Open-Meteo and returns a WeatherForecast', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
    }));

    const result = await fetchWeatherForBeach(mockKv, 'english-bay', 49.2867, -123.1432);

    expect(result.beachId).toBe('english-bay');
    expect(result.current.temperature).toBeDefined();
    expect(result.current.condition).toBe('partly-cloudy');
    expect(result.current.humidity).toBe(65);
    expect(result.current.windSpeed).toBe(12);
    expect(result.current.windDirection).toBe('SW');
    expect(result.current.uvIndex).toBe(5);
  });

  it('returns a WeatherForecast matching the shared type shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
    }));

    const result = await fetchWeatherForBeach(mockKv, 'english-bay', 49.2867, -123.1432);

    expect(result.beachId).toBe('english-bay');
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.hourly)).toBe(true);
    expect(result.hourly.length).toBe(24);
    expect(result.daily).toBeDefined();
    expect(result.daily!.length).toBe(5);
    expect(result.fetchedAt).toBeDefined();
  });

  it('writes weather data to KV with 1800s TTL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
    }));

    await fetchWeatherForBeach(mockKv, 'english-bay', 49.2867, -123.1432);

    expect(mockKv.put).toHaveBeenCalledWith(
      'weather:english-bay',
      expect.any(String),
      { expirationTtl: 1800 },
    );
  });

  it('throws on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    await expect(
      fetchWeatherForBeach(mockKv, 'test', 0, 0),
    ).rejects.toThrow('Weather API error: 500');
  });

  it('handles missing daily data gracefully', async () => {
    const responseWithoutDaily = {
      ...MOCK_OPEN_METEO_RESPONSE,
      daily: undefined,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseWithoutDaily),
    }));

    const result = await fetchWeatherForBeach(mockKv, 'english-bay', 49.2867, -123.1432);

    expect(result.daily).toBeUndefined();
  });
});
