import { VANCOUVER_TIDE_STATION } from '@van-beaches/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kvCache } from '../cache/kvCache';
import { getCoastalTides } from './iwlsService';
import { fetchWeatherForBeach } from './weatherService';

function cache() {
  const values = new Map<string, string>();
  return {
    values,
    kv: {
      get: vi.fn(async (key: string) => values.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        values.delete(key);
      }),
    } as unknown as KVNamespace,
  };
}
beforeEach(() => {
  vi.restoreAllMocks();
});
describe('shared environmental services', () => {
  it('caches the station curve once across beach requests; observation failure is independent', async () => {
    const { kv } = cache();
    const fetcher = vi.fn(async (url: string) => ({
      ok: !url.includes('code=wlo&'),
      status: 503,
      json: async () => [{ eventDate: '2026-09-18T20:00:00Z', value: 3.2, qcFlagCode: '2' }],
    }));
    vi.stubGlobal('fetch', fetcher);
    const result = await getCoastalTides(kv);
    expect(result.predictions[0].heightCD).toBe(3.2);
    expect(result.observations).toEqual([]);
    expect(result.stationCode).toBe('07735');
    await getCoastalTides(kv);
    expect(fetcher).toHaveBeenCalledTimes(3);
    const puts = vi.mocked(kv.put).mock.calls.map(([key]) => key);
    expect(puts.filter((key) => key === `tides:${VANCOUVER_TIDE_STATION}`)).toHaveLength(1);
    expect(puts.filter((key) => key === `last-good:tides:${VANCOUVER_TIDE_STATION}`)).toHaveLength(
      1,
    );
    expect(fetcher.mock.calls.every(([url]) => url.includes(VANCOUVER_TIDE_STATION))).toBe(true);
  });
  it('rejects null, suspect and unknown-quality gauge readings', async () => {
    const { kv } = cache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          { eventDate: '2026-09-18T20:00:00Z', value: null, qcFlagCode: '1' },
          { eventDate: '2026-09-18T20:01:00Z', value: 99, qcFlagCode: '3' },
          { eventDate: '2026-09-18T20:02:00Z', value: 2.8, qcFlagCode: '2' },
          { eventDate: '2026-09-18T20:03:00Z', value: 3.1, qcFlagCode: '1' },
        ],
      })),
    );
    expect((await getCoastalTides(kv)).observations).toEqual([
      { time: '2026-09-18T20:03:00Z', heightCD: 3.1, qcFlag: '1' },
    ]);
  });
  it('coalesces cache misses, retains last-good values and backs off after failures', async () => {
    const { kv, values } = cache();
    const fetcher = vi.fn(async () => ({ fetchedAt: 'original', value: 1 }));
    await Promise.all([
      kvCache.resilient(kv, 'test', fetcher, 300),
      kvCache.resilient(kv, 'test', fetcher, 300),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    values.delete('test');
    const failed = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await kvCache.resilient(kv, 'test', failed, 300)).toEqual({
      fetchedAt: 'original',
      value: 1,
    });
    await kvCache.resilient(kv, 'test', failed, 300);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(values.has('fetching:test')).toBe(false);
  });
  it('normalizes unambiguous UNIX weather timestamps across the DST repeated hour', async () => {
    const { kv } = cache();
    const epoch = Date.parse('2026-11-01T08:00:00Z') / 1000;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          current: {
            time: epoch,
            temperature_2m: 10,
            weather_code: 45,
            wind_direction_10m: 359,
            rain: 0.2,
            showers: 0.1,
            precipitation: 0.4,
            interval: 900,
          },
          hourly: {
            time: [epoch, epoch + 3600],
            temperature_2m: [10, 11],
            weather_code: [45, 71],
            precipitation_probability: [0, 20],
            precipitation: [0, 1],
            rain: [0, 0],
            cloud_cover: [100, 100],
          },
        }),
      })),
    );
    const forecast = await fetchWeatherForBeach(kv, 'spanish-banks', 49.276, -123.215);
    expect(forecast.environment?.hourly.map((w) => w.time)).toEqual([
      '2026-11-01T08:00:00.000Z',
      '2026-11-01T09:00:00.000Z',
    ]);
    expect(forecast.environment?.current?.condition).toBe('foggy');
    expect(forecast.environment?.current?.rain).toBeCloseTo(1.2);
    expect(forecast.environment?.current?.precipitation).toBeCloseTo(1.6);
    expect(forecast.environment?.hourly[1].rain).toBe(0);
  });
});
