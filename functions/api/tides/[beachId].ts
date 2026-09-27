import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { getTidesForStation } from '../../../worker/src/services/iwlsService';
import { AppError } from '../../_middleware';

interface Env {
  BEACH_CACHE: KVNamespace;
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

  const tideData = await getTidesForStation(
    context.env.BEACH_CACHE,
    beach.tideStationId,
    beach.id,
    beach.name,
  );
  return Response.json(createSuccessResponse(tideData, true, tideData.fetchedAt));
};
