import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { getWeatherForBeach } from '../../../worker/src/services/weatherService';
import { AppError } from '../../_middleware';

export const onRequestGet: PagesFunction<{ BEACH_CACHE: KVNamespace }> = async (context) => {
  const beach = getBeachById(context.params.beachId as string);
  if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${context.params.beachId}`);
  const data = await getWeatherForBeach(
    context.env.BEACH_CACHE,
    beach.id,
    beach.location.latitude,
    beach.location.longitude,
  );
  return Response.json(createSuccessResponse(data, true, data.fetchedAt));
};
