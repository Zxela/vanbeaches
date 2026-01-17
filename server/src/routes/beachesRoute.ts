import { BEACHES, createSuccessResponse } from '@van-beaches/shared';
import type { BeachSummary } from '@van-beaches/shared';
import { type NextFunction, type Request, type Response, Router } from 'express';

const router: Router = Router();

router.get('/beaches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summaries: BeachSummary[] = BEACHES.map((beach) => ({
      id: beach.id,
      name: beach.name,
      currentWeather: null, // Would aggregate from weather service
      nextTide: null, // Would aggregate from tide service
      waterQuality: 'unknown',
      lastUpdated: new Date().toISOString(),
    }));
    res.json(createSuccessResponse(summaries));
  } catch (error) {
    next(error);
  }
});

export default router;
