import { BEACHES, createSuccessResponse } from '@van-beaches/shared';
import type { BeachSummary, TideData, WeatherForecast } from '@van-beaches/shared';

interface Env {
  BEACH_CACHE: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const kv = context.env.BEACH_CACHE;

  const summaries: BeachSummary[] = await Promise.all(
    BEACHES.map(async (beach) => {
      let weather: WeatherForecast | null = null;
      let tides: TideData | null = null;

      try {
        weather = await kv.get<WeatherForecast>(`weather:${beach.id}`, 'json');
      } catch {
        // Per-beach cache read failure returns null for this field
      }

      try {
        if (beach.tideStationId) {
          tides = await kv.get<TideData>(`tides:${beach.tideStationId}`, 'json');
        }
      } catch {
        // Per-beach cache read failure returns null for this field
      }

      const currentWeather = weather
        ? {
            temperature: weather.current.temperature,
            condition: weather.current.condition,
            icon: weather.current.condition,
          }
        : null;

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
        waterQuality: 'unknown' as const,
        lastUpdated: new Date().toISOString(),
      };
    }),
  );

  return Response.json(createSuccessResponse(summaries));
};
