import type { TideData, TidePrediction } from '@van-beaches/shared';
import { cacheManager } from '../cache/cacheManager.js';
import { rateLimiter } from '../cache/rateLimiter.js';

const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';
const TIDE_CACHE_TTL = 3600000; // 1 hour

interface IWLSResponse {
  eventDate: string;
  value: number;
  qcFlagCode: string;
  timeSeriesId: string;
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

        // Determine high/low by comparing to adjacent values
        // In wlp-hilo data, points alternate between local maxima (high) and minima (low)
        const predictions: TidePrediction[] = data.slice(0, 6).map((item, index, arr) => {
          const prev = index > 0 ? arr[index - 1].value : item.value;
          const next = index < arr.length - 1 ? arr[index + 1].value : item.value;
          // If current value is greater than both neighbors, it's a high tide
          // If current value is less than both neighbors, it's a low tide
          const isHigh = item.value >= prev && item.value >= next;
          return {
            time: item.eventDate,
            height: Number(item.value.toFixed(2)),
            type: isHigh ? 'high' : 'low',
          };
        });

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
