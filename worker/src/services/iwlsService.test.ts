import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTidesForStation } from './iwlsService';

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

const MOCK_IWLS_RESPONSE = [
  { eventDate: '2026-02-25T03:30:00Z', value: 4.5, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-25T09:15:00Z', value: 1.2, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-25T15:45:00Z', value: 4.8, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-25T21:30:00Z', value: 0.9, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-26T03:00:00Z', value: 4.3, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-26T09:45:00Z', value: 1.5, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
  { eventDate: '2026-02-26T16:00:00Z', value: 4.6, qcFlagCode: '1', timeSeriesId: 'wlp-hilo' },
];

describe('iwlsService', () => {
  let mockKv: ReturnType<typeof createMockKv>;

  beforeEach(() => {
    mockKv = createMockKv();
    vi.restoreAllMocks();
  });

  it('fetches from IWLS API and returns TideData', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_IWLS_RESPONSE),
      }),
    );

    const result = await fetchTidesForStation(
      mockKv,
      '5cebf1de3d0f4a073c4bb943',
      'english-bay',
      'English Bay',
    );

    expect(result.stationId).toBe('5cebf1de3d0f4a073c4bb943');
    expect(result.beachId).toBe('english-bay');
    expect(result.stationName).toBe('English Bay (Vancouver)');
    expect(result.predictions.length).toBeGreaterThan(0);
    expect(result.predictions.length).toBeLessThanOrEqual(6);
    expect(result.fetchedAt).toBeDefined();
  });

  it('returns predictions with correct high/low classification', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_IWLS_RESPONSE),
      }),
    );

    const result = await fetchTidesForStation(
      mockKv,
      '5cebf1de3d0f4a073c4bb943',
      'english-bay',
      'English Bay',
    );

    for (const pred of result.predictions) {
      expect(['high', 'low']).toContain(pred.type);
      expect(typeof pred.height).toBe('number');
      expect(typeof pred.time).toBe('string');
    }

    // First entry (4.5) is high: prev=4.5 (self), next=1.2 -> 4.5 >= 4.5 && 4.5 >= 1.2 = high
    expect(result.predictions[0].type).toBe('high');
    // Second entry (1.2) is low: prev=4.5, next=4.8 -> 1.2 < 4.5 = low
    expect(result.predictions[1].type).toBe('low');
  });

  it('writes tide data to KV with 3600s TTL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_IWLS_RESPONSE),
      }),
    );

    await fetchTidesForStation(mockKv, '5cebf1de3d0f4a073c4bb943', 'english-bay', 'English Bay');

    expect(mockKv.put).toHaveBeenCalledWith('tides:5cebf1de3d0f4a073c4bb943', expect.any(String), {
      expirationTtl: 3600,
    });
  });

  it('throws on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    await expect(fetchTidesForStation(mockKv, 'bad-id', 'test', 'Test')).rejects.toThrow(
      'IWLS API error: 503',
    );
  });
});
