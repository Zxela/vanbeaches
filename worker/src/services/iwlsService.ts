import type { TideData, TidePrediction } from '@van-beaches/shared';
import { kvCache } from '../cache/kvCache';

const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';
const TIDE_TTL_SECONDS = 3600; // 1 hour

interface IWLSResponse {
  eventDate: string;
  value: number;
  qcFlagCode: string;
  timeSeriesId: string;
}

export async function fetchTidesForStation(
  kv: KVNamespace,
  stationId: string,
  beachId: string,
  beachName: string,
): Promise<TideData> {
  // Start from beginning of today in Pacific time so all of today's tides are included
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(8, 0, 0, 0); // Midnight PST (UTC-8) = 08:00 UTC
  if (now.getTime() < todayStart.getTime()) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }
  const from = todayStart;
  // Fetch 7 days of predictions for the forecast view
  const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `${IWLS_BASE_URL}/stations/${stationId}/data?time-series-code=wlp-hilo&from=${from.toISOString()}&to=${to.toISOString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IWLS API error: ${response.status}`);
  }

  const data: IWLSResponse[] = await response.json();

  const predictions: TidePrediction[] = data.map((item, index, arr) => {
    const prev = index > 0 ? arr[index - 1].value : item.value;
    const next = index < arr.length - 1 ? arr[index + 1].value : item.value;
    const isHigh = item.value >= prev && item.value >= next;
    return {
      time: item.eventDate,
      height: Number(item.value.toFixed(2)),
      type: isHigh ? 'high' : 'low',
    };
  });

  const tideData: TideData = {
    beachId,
    stationId,
    stationName: `${beachName} (Vancouver)`,
    predictions,
    fetchedAt: new Date().toISOString(),
  };

  await kvCache.set(kv, `tides:${stationId}`, tideData, TIDE_TTL_SECONDS);
  return tideData;
}
