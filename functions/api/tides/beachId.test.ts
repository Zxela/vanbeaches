import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { onRequestGet } from './[beachId]';

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

function createMockContext(beachId: string, kv: KVNamespace) {
  return {
    request: new Request(`https://example.com/api/tides/${beachId}`),
    env: { BEACH_CACHE: kv },
    params: { beachId },
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequestGet>[0];
}

const mockTideData = {
  beachId: 'english-bay',
  stationId: '5cebf1de3d0f4a073c4bb943',
  stationName: 'English Bay (Vancouver)',
  predictions: [
    { time: '2026-02-25T06:00:00Z', height: 3.5, type: 'high' },
    { time: '2026-02-25T12:00:00Z', height: 0.8, type: 'low' },
  ],
  fetchedAt: '2026-02-25T00:00:00.000Z',
};

describe('GET /api/tides/:beachId', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns cached tide data on cache hit', async () => {
    const kv = createMockKV({
      'tides:5cebf1de3d0f4a073c4bb943': mockTideData,
    });
    const context = createMockContext('english-bay', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: { predictions: unknown[] };
    };

    expect(body.success).toBe(true);
    expect(body.data.predictions.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown beachId', async () => {
    const kv = createMockKV();
    const context = createMockContext('nonexistent-beach', kv);

    await expect(onRequestGet(context)).rejects.toThrow('Beach not found: nonexistent-beach');
  });

  it('returns empty predictions for Trout Lake (null tideStationId)', async () => {
    const kv = createMockKV();
    const context = createMockContext('trout-lake', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: { predictions: unknown[]; message: string };
    };

    expect(body.success).toBe(true);
    expect(body.data.predictions).toEqual([]);
    expect(body.data.message).toContain('not applicable');
  });

  it('fetches from IWLS API on cache miss', async () => {
    const kv = createMockKV();
    const mockIWLSData = [
      { eventDate: '2026-02-25T06:00:00Z', value: 3.5, qcFlagCode: 'ok', timeSeriesId: '1' },
      { eventDate: '2026-02-25T12:00:00Z', value: 0.8, qcFlagCode: 'ok', timeSeriesId: '1' },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIWLSData,
    }) as unknown as typeof fetch;

    const context = createMockContext('english-bay', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as {
      success: boolean;
      data: { beachId: string; predictions: unknown[] };
    };

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(body.success).toBe(true);
    expect(body.data.beachId).toBe('english-bay');
    expect(body.data.predictions.length).toBeGreaterThan(0);
  });

  it('writes fetched data to KV cache', async () => {
    const kv = createMockKV();
    const mockIWLSData = [
      { eventDate: '2026-02-25T06:00:00Z', value: 3.5, qcFlagCode: 'ok', timeSeriesId: '1' },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIWLSData,
    }) as unknown as typeof fetch;

    const context = createMockContext('english-bay', kv);
    await onRequestGet(context);

    expect(kv.put).toHaveBeenCalledWith(
      'tides:5cebf1de3d0f4a073c4bb943',
      expect.any(String),
      { expirationTtl: 3600 },
    );
  });
});
