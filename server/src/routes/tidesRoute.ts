import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getTidePredictions } from '../services/iwlsService.js';

const router: Router = Router();

router.get('/tides/:beachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const beachId = req.params.beachId as string;
    const beach = getBeachById(beachId);

    if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);

    if (!beach.tideStationId) {
      res.json(
        createSuccessResponse({
          beachId,
          stationId: '',
          stationName: 'N/A',
          predictions: [],
          fetchedAt: new Date().toISOString(),
          message: 'Tide information not applicable for this location',
        }),
      );
      return;
    }

    const tideData = await getTidePredictions(beach.tideStationId, beachId, beach.name);
    res.json(createSuccessResponse(tideData, true, tideData.fetchedAt));
  } catch (error) {
    next(error);
  }
});

export default router;
