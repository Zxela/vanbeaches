import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getWaterQuality } from '../services/waterQualityService.js';

const router: Router = Router();

router.get('/water-quality/:beachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const beachId = req.params.beachId as string;
    const beach = getBeachById(beachId);
    if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);

    const status = await getWaterQuality(beachId);
    res.json(createSuccessResponse(status, true, status.fetchedAt));
  } catch (error) {
    next(error);
  }
});

export default router;
