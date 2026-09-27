import {
  type TideData,
  type TidePrediction,
  type TideSample,
  type TideSeries,
  VANCOUVER_TIDE_STATION,
} from '@van-beaches/shared';
import { kvCache } from '../cache/kvCache';

const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';
const TIDE_TTL_SECONDS = 3600; // 1 hour

interface IWLSResponse {
  eventDate: string;
  value: number;
  qcFlagCode: string;
  timeSeriesId: string;
}

async function retrieveTidesForStation(
  stationId: string,
  beachId: string,
  beachName: string,
): Promise<TideData> {
  // Include the timeline's recent past and seven complete future days without fixed PST offsets.
  const from = new Date(Date.now() - 24 * 3600000);
  const to = new Date(Date.now() + 7 * 24 * 3600000);

  const url = `${IWLS_BASE_URL}/stations/${stationId}/data?time-series-code=wlp-hilo&from=${from.toISOString()}&to=${to.toISOString()}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`IWLS API error: ${response.status}`);
  }

  const raw: IWLSResponse[] = await response.json();
  if (!Array.isArray(raw)) throw new Error('Invalid IWLS high/low data');
  const data = raw
    .filter((row) => Number.isFinite(row.value) && Number.isFinite(Date.parse(row.eventDate)))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
  if (!data.length) throw new Error('No IWLS high/low data');

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

  return tideData;
}

export function getTidesForStation(
  kv: KVNamespace,
  stationId: string,
  beachId: string,
  beachName: string,
) {
  return kvCache.resilient(
    kv,
    `tides:${stationId}`,
    () => retrieveTidesForStation(stationId, beachId, beachName),
    TIDE_TTL_SECONDS,
  );
}

async function getSeries(kv: KVNamespace, code: 'wlo' | 'wlp') {
  return kvCache.resilient(
    kv,
    `tides:${VANCOUVER_TIDE_STATION}:${code}`,
    async () => {
      const now = Date.now();
      const from = new Date(now - 8 * 3600000).toISOString();
      const to = new Date(now + (code === 'wlp' ? 50 * 3600000 : 0)).toISOString();
      const response = await fetch(
        `${IWLS_BASE_URL}/stations/${VANCOUVER_TIDE_STATION}/data?time-series-code=${code}&from=${from}&to=${to}`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok) throw new Error(`IWLS ${code}: ${response.status}`);
      const raw: IWLSResponse[] = await response.json();
      if (!Array.isArray(raw)) throw new Error('Invalid IWLS series');
      const samples: TideSample[] = raw
        .filter(
          (row) =>
            Number.isFinite(row.value) &&
            Number.isFinite(Date.parse(row.eventDate)) &&
            (code !== 'wlo' || String(row.qcFlagCode) === '1'),
        )
        .map((row) => ({ time: row.eventDate, heightCD: row.value, qcFlag: row.qcFlagCode }))
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
      if (!samples.length) throw new Error(`No usable IWLS ${code} samples`);
      return {
        samples:
          code === 'wlp'
            ? samples.filter(
                (sample, i) =>
                  i === 0 || i === samples.length - 1 || Date.parse(sample.time) % 300000 === 0,
              )
            : samples,
        fetchedAt: new Date().toISOString(),
      };
    },
    code === 'wlo' ? 300 : 3600,
  );
}

export async function getCoastalTides(kv: KVNamespace): Promise<TideSeries> {
  // Independent failures: an unavailable gauge must never suppress official predictions.
  const [predictions, observations, extremes] = await Promise.allSettled([
    getSeries(kv, 'wlp'),
    getSeries(kv, 'wlo'),
    getTidesForStation(kv, VANCOUVER_TIDE_STATION, 'english-bay', 'Vancouver'),
  ]);
  return {
    stationCode: '07735',
    stationId: VANCOUVER_TIDE_STATION,
    predictions: predictions.status === 'fulfilled' ? predictions.value.samples : [],
    observations: observations.status === 'fulfilled' ? observations.value.samples : [],
    extremes: extremes.status === 'fulfilled' ? extremes.value.predictions : [],
    predictionsFetchedAt: predictions.status === 'fulfilled' ? predictions.value.fetchedAt : null,
    observationsFetchedAt:
      observations.status === 'fulfilled' ? observations.value.fetchedAt : null,
  };
}

export const fetchTidesForStation = getTidesForStation;
