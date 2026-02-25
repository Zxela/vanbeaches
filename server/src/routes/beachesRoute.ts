import { BEACHES, createSuccessResponse } from '@van-beaches/shared';
import type { BeachSummary, TideData, WeatherForecast } from '@van-beaches/shared';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { cacheManager } from '../cache/cacheManager.js';

const router: Router = Router();

router.get('/beaches', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summaries: BeachSummary[] = await Promise.all(
      BEACHES.map(async (beach) => {
        let weather: WeatherForecast | null = null;
        let tides: TideData | null = null;

        try {
          weather = await cacheManager.get<WeatherForecast>(`weather:${beach.id}`);
        } catch {
          // Per-beach cache read failure returns null for this field
        }

        try {
          if (beach.tideStationId) {
            tides = await cacheManager.get<TideData>(`tides:${beach.tideStationId}`);
          }
        } catch {
          // Per-beach cache read failure returns null for this field
        }

        // Extract current weather summary
        const currentWeather = weather
          ? {
              temperature: weather.current.temperature,
              condition: weather.current.condition,
              icon: weather.current.condition,
            }
          : null;

        // Find next upcoming tide prediction
        const now = new Date();
        const nextTidePrediction = tides
          ? (tides.predictions.find((p) => new Date(p.time) > now) ?? null)
          : null;

        return {
          id: beach.id,
          name: beach.name,
          currentWeather,
          nextTide: nextTidePrediction
            ? {
                type: nextTidePrediction.type,
                time: nextTidePrediction.time,
                height: nextTidePrediction.height,
              }
            : null,
          waterQuality: 'unknown',
          lastUpdated: new Date().toISOString(),
        };
      }),
    );
    res.json(createSuccessResponse(summaries));
  } catch (error) {
    next(error);
  }
});

export default router;
