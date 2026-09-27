import { type EnvironmentData, createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { getCoastalTides } from '../../../worker/src/services/iwlsService';
import { getWeatherForBeach } from '../../../worker/src/services/weatherService';
import { AppError } from '../../_middleware';

export const onRequestGet: PagesFunction<{ BEACH_CACHE: KVNamespace }> = async (context) => {
  const beach = getBeachById(context.params.beachId as string);
  if (!beach) throw new AppError('NOT_FOUND', 'Unknown beach');
  const { latitude, longitude } = beach.location;
  const [tide, weather] = await Promise.allSettled([
    getCoastalTides(context.env.BEACH_CACHE),
    getWeatherForBeach(context.env.BEACH_CACHE, beach.id, latitude, longitude),
  ]);
  const forecast = weather.status === 'fulfilled' ? weather.value : null;
  const data: EnvironmentData = {
    version: 1,
    beachId: beach.id,
    latitude,
    longitude,
    tide:
      tide.status === 'fulfilled'
        ? tide.value
        : {
            stationCode: '07735',
            stationId: '',
            observations: [],
            predictions: [],
            extremes: [],
            predictionsFetchedAt: null,
            observationsFetchedAt: null,
          },
    weather: {
      current: forecast?.environment?.current ?? null,
      hourly: forecast?.environment?.hourly ?? [],
      fetchedAt: forecast?.environment ? forecast.fetchedAt : null,
    },
  };
  return Response.json(createSuccessResponse(data), {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
};
