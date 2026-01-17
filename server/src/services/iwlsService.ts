import type { TideData, TidePrediction } from '@van-beaches/shared';
import { cacheManager } from '../cache/cacheManager.js';
import { rateLimiter } from '../cache/rateLimiter.js';

const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';
const TIDE_CACHE_TTL = 3600000; // 1 hour

interface IWLSResponse {
  eventDate: string;
  value: number;
  eventType: string;
}

export async function getTidePredictions(
  stationId: string,
  beachId: string,
  beachName: string,
): Promise<TideData> {
  const cacheKey = `tides:${stationId}`;

  return cacheManager.getOrFetch(
    cacheKey,
    async () => {
      await rateLimiter.acquireSlot('iwls');

      const from = new Date();
      const to = new Date(from.getTime() + 48 * 60 * 60 * 1000); // 48 hours

      const url = `${IWLS_BASE_URL}/stations/${stationId}/data?time-series-code=wlp-hilo&from=${from.toISOString()}&to=${to.toISOString()}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`IWLS API error: ${response.status}`);
        }

        const data: IWLSResponse[] = await response.json();

        const predictions: TidePrediction[] = data.slice(0, 6).map((item) => ({
          time: item.eventDate,
          height: Number(item.value.toFixed(2)),
          type: item.eventType.toLowerCase().includes('high') ? 'high' : 'low',
        }));

        return {
          beachId,
          stationId,
          stationName: `${beachName} (Vancouver)`,
          predictions,
          fetchedAt: new Date().toISOString(),
        };
      } finally {
        rateLimiter.release('iwls');
      }
    },
    TIDE_CACHE_TTL,
  );
}
