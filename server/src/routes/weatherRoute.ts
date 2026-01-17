import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { getWeatherForecast } from '../services/weatherService.js';

const router: Router = Router();

router.get('/weather/:beachId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const beachId = req.params.beachId as string;
    const beach = getBeachById(beachId);
    if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);

    const weather = await getWeatherForecast(
      beachId,
      beach.location.latitude,
      beach.location.longitude,
    );
    res.json(createSuccessResponse(weather, true, weather.fetchedAt));
  } catch (error) {
    next(error);
  }
});

export default router;
