import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './[beachId]';

const MOCK_WEATHER_FORECAST = {
  beachId: 'english-bay',
  current: {
    temperature: 18.5,
    condition: 'partly-cloudy',
    humidity: 65,
    windSpeed: 12,
    windDirection: 'SW',
    uvIndex: 5,
  },
  hourly: Array.from({ length: 24 }, (_, i) => ({
    time: `2026-02-25T${String(i).padStart(2, '0')}:00`,
    temperature: 18,
    condition: 'sunny' as const,
    precipitationProbability: 10,
  })),
  daily: [{ date: '2026-02-25', high: 20, low: 12, condition: 'sunny' as const }],
  fetchedAt: '2026-02-25T00:00:00.000Z',
};

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
    time: ['2026-02-25'],
    temperature_2m_max: [20],
    temperature_2m_min: [12],
    weather_code: [0],
  },
};

function createMockKv(cachedData?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(cachedData ?? {}));
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn(),
  } as unknown as KVNamespace;
}

function createMockContext(beachId: string, kv: KVNamespace) {
  return {
    request: new Request(`https://example.com/api/weather/${beachId}`),
    env: { BEACH_CACHE: kv },
    params: { beachId },
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/weather/:beachId', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ApiResponse<WeatherForecast> on cache hit', async () => {
    const kv = createMockKv({
      'weather:english-bay': JSON.stringify(MOCK_WEATHER_FORECAST),
    });
    const context = createMockContext('english-bay', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect((body.data as Record<string, unknown>).beachId).toBe('english-bay');
    expect(body.cached).toBe(true);
    expect(body.cachedAt).toBe('2026-02-25T00:00:00.000Z');
  });

  it('returns 404 with error response for unknown beachId', async () => {
    const kv = createMockKv();
    const context = createMockContext('nonexistent-beach', kv);

    await expect(onRequestGet(context)).rejects.toThrow('Beach not found: nonexistent-beach');
  });

  it('on cache miss, fetches from Open-Meteo and returns the result', async () => {
    const kv = createMockKv();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
      }),
    );

    const context = createMockContext('english-bay', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as Record<string, unknown>;

    expect(global.fetch).toHaveBeenCalled();
    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.beachId).toBe('english-bay');
    expect(data.current).toBeDefined();
    expect(data.hourly).toBeDefined();
  });

  it('writes fetched weather data to KV on cache miss', async () => {
    const kv = createMockKv();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_OPEN_METEO_RESPONSE),
      }),
    );

    const context = createMockContext('english-bay', kv);
    await onRequestGet(context);

    expect(kv.put).toHaveBeenCalledWith('weather:english-bay', expect.any(String), {
      expirationTtl: 1800,
    });
  });
});
