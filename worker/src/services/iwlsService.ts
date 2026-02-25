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
  const from = new Date();
  const to = new Date(from.getTime() + 48 * 60 * 60 * 1000); // 48 hours

  const url = `${IWLS_BASE_URL}/stations/${stationId}/data?time-series-code=wlp-hilo&from=${from.toISOString()}&to=${to.toISOString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`IWLS API error: ${response.status}`);
  }

  const data: IWLSResponse[] = await response.json();

  const predictions: TidePrediction[] = data.slice(0, 6).map((item, index, arr) => {
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
