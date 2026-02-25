import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './beaches';

function createMockKV(store: Record<string, unknown> = {}) {
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const value = store[key] ?? null;
      if (type === 'json') return value;
      return value !== null ? JSON.stringify(value) : null;
    }),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function createMockContext(kv: KVNamespace) {
  return {
    request: new Request('https://example.com/api/beaches'),
    env: { BEACH_CACHE: kv },
    params: {},
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequestGet>[0];
}

const mockWeather = {
  beachId: 'english-bay',
  current: {
    temperature: 18.5,
    condition: 'sunny' as const,
    humidity: 65,
    windSpeed: 12,
    windDirection: 'NW',
    uvIndex: 5,
  },
  hourly: [],
  fetchedAt: '2026-02-25T00:00:00.000Z',
};

const mockTideData = {
  beachId: 'english-bay',
  stationId: '5cebf1de3d0f4a073c4bb943',
  stationName: 'English Bay (Vancouver)',
  predictions: [
    { time: new Date(Date.now() + 3600000).toISOString(), height: 3.5, type: 'high' as const },
    { time: new Date(Date.now() + 7200000).toISOString(), height: 0.8, type: 'low' as const },
  ],
  fetchedAt: '2026-02-25T00:00:00.000Z',
};

describe('GET /api/beaches', () => {
  it('returns all 9 beaches with success response', async () => {
    const kv = createMockKV();
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as { success: boolean; data: unknown[] };

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(9);
  });

  it('includes currentWeather from KV cache when available', async () => {
    const kv = createMockKV({
      'weather:english-bay': mockWeather,
    });
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; currentWeather: unknown }>;
    };

    const englishBay = body.data.find((b) => b.id === 'english-bay');
    expect(englishBay?.currentWeather).toEqual({
      temperature: 18.5,
      condition: 'sunny',
      icon: 'sunny',
    });
  });

  it('returns null currentWeather when not cached', async () => {
    const kv = createMockKV();
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; currentWeather: unknown }>;
    };

    const englishBay = body.data.find((b) => b.id === 'english-bay');
    expect(englishBay?.currentWeather).toBeNull();
  });

  it('includes nextTide from KV cache when available', async () => {
    const kv = createMockKV({
      'tides:5cebf1de3d0f4a073c4bb943': mockTideData,
    });
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; nextTide: { type: string; time: string; height: number } | null }>;
    };

    const englishBay = body.data.find((b) => b.id === 'english-bay');
    expect(englishBay?.nextTide).not.toBeNull();
    expect(englishBay?.nextTide?.type).toBe('high');
  });

  it('returns null nextTide for Trout Lake (null tideStationId)', async () => {
    const kv = createMockKV({
      'tides:5cebf1de3d0f4a073c4bb943': mockTideData,
    });
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; nextTide: unknown }>;
    };

    const troutLake = body.data.find((b) => b.id === 'trout-lake');
    expect(troutLake?.nextTide).toBeNull();
  });

  it('returns null for failed KV reads instead of erroring', async () => {
    const kv = createMockKV();
    (kv.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('KV error'));

    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; currentWeather: unknown }>;
    };

    expect(response.status).toBe(200);
    const englishBay = body.data.find((b) => b.id === 'english-bay');
    expect(englishBay?.currentWeather).toBeNull();
  });

  it('sets waterQuality to unknown', async () => {
    const kv = createMockKV();
    const context = createMockContext(kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: Array<{ id: string; waterQuality: string }>;
    };

    for (const beach of body.data) {
      expect(beach.waterQuality).toBe('unknown');
    }
  });
});
