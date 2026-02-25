import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './[beachId]';

const MOCK_WATER_QUALITY: Record<string, unknown> = {
  beachId: 'english-bay',
  level: 'good',
  ecoliCount: 42,
  advisoryReason: null,
  sampleDate: '2026-02-20T12:00:00.000Z',
  fetchedAt: '2026-02-25T00:00:00.000Z',
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
    request: new Request(`https://example.com/api/water-quality/${beachId}`),
    env: { BEACH_CACHE: kv },
    params: { beachId },
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/water-quality/:beachId', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ApiResponse<WaterQualityStatus> on cache hit', async () => {
    const kv = createMockKv({
      'waterquality:english-bay': JSON.stringify(MOCK_WATER_QUALITY),
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

  it('returns 404 for unknown beachId', async () => {
    const kv = createMockKv();
    const context = createMockContext('nonexistent-beach', kv);

    await expect(onRequestGet(context)).rejects.toThrow('Beach not found: nonexistent-beach');
  });

  it('on cache miss, generates synthetic data and returns it', async () => {
    const kv = createMockKv();
    const context = createMockContext('english-bay', kv);
    const response = await onRequestGet(context);
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.success).toBe(true);
    const data = body.data as Record<string, unknown>;
    expect(data.beachId).toBe('english-bay');
    expect(data.level).toBeDefined();
    expect(data.fetchedAt).toBeDefined();
  });

  it('writes generated data to KV on cache miss', async () => {
    const kv = createMockKv();
    const context = createMockContext('english-bay', kv);
    await onRequestGet(context);

    expect(kv.put).toHaveBeenCalledWith('waterquality:english-bay', expect.any(String), {
      expirationTtl: 21600,
    });
  });
});
