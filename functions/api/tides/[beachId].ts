import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import type { TideData, TidePrediction } from '@van-beaches/shared';
import { AppError } from '../../_middleware';

interface Env {
  BEACH_CACHE: KVNamespace;
}

const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';
const TIDE_TTL_SECONDS = 3600;

interface IWLSResponse {
  eventDate: string;
  value: number;
  qcFlagCode: string;
  timeSeriesId: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const beachId = context.params.beachId as string;
  const beach = getBeachById(beachId);

  if (!beach) {
    throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);
  }

  if (!beach.tideStationId) {
    return Response.json(
      createSuccessResponse({
        beachId,
        stationId: '',
        stationName: 'N/A',
        predictions: [],
        fetchedAt: new Date().toISOString(),
        message: 'Tide information not applicable for this location',
      }),
    );
  }

  const kv = context.env.BEACH_CACHE;
  const cacheKey = `tides:${beach.tideStationId}`;

  // Try cache first
  const cached = await kv.get<TideData>(cacheKey, 'json');
  if (cached) {
    return Response.json(createSuccessResponse(cached, true, cached.fetchedAt));
  }

  // Cache miss - fetch from IWLS API
  const from = new Date();
  const to = new Date(from.getTime() + 48 * 60 * 60 * 1000);

  const url = `${IWLS_BASE_URL}/stations/${beach.tideStationId}/data?time-series-code=wlp-hilo&from=${from.toISOString()}&to=${to.toISOString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError('SERVICE_UNAVAILABLE', `IWLS API error: ${response.status}`);
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
    stationId: beach.tideStationId,
    stationName: `${beach.name} (Vancouver)`,
    predictions,
    fetchedAt: new Date().toISOString(),
  };

  await kv.put(cacheKey, JSON.stringify(tideData), { expirationTtl: TIDE_TTL_SECONDS });

  return Response.json(createSuccessResponse(tideData, true, tideData.fetchedAt));
};
