import {
  type WeatherCondition,
  type WeatherForecast,
  createSuccessResponse,
  getBeachById,
} from '@van-beaches/shared';
import { AppError } from '../../_middleware';

interface Env {
  BEACH_CACHE: KVNamespace;
}

const WEATHER_TTL_SECONDS = 1800;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const beachId = context.params.beachId as string;
  const beach = getBeachById(beachId);
  if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);

  const cacheKey = `weather:${beachId}`;
  const cached = await context.env.BEACH_CACHE.get(cacheKey);

  if (cached) {
    const data: WeatherForecast = JSON.parse(cached);
    return Response.json(createSuccessResponse(data, true, data.fetchedAt));
  }

  // Cache miss: fetch from Open-Meteo
  const { latitude, longitude } = beach.location;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,uv_index,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=America/Vancouver&forecast_hours=24&forecast_days=10`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

  const apiData: Record<string, unknown> = await response.json();
  const current = apiData.current as Record<string, number>;
  const hourly = apiData.hourly as Record<string, (string | number)[]>;
  const dailyData = apiData.daily as Record<string, (string | number)[]> | undefined;

  const daily = dailyData
    ? (dailyData.time as string[]).map((date: string, i: number) => ({
        date,
        high: Math.round((dailyData.temperature_2m_max[i] as number) * 10) / 10,
        low: Math.round((dailyData.temperature_2m_min[i] as number) * 10) / 10,
        condition: mapWeatherCode(dailyData.weather_code[i] as number),
        sunrise: optionalString(dailyData.sunrise?.[i]),
        sunset: optionalString(dailyData.sunset?.[i]),
        precipitationProbability: optionalNumber(dailyData.precipitation_probability_max?.[i]),
      }))
    : undefined;

  const forecast: WeatherForecast = {
    beachId,
    current: {
      temperature: Math.round(current.temperature_2m * 10) / 10,
      condition: mapWeatherCode(current.weather_code),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: getWindDirection(current.wind_direction_10m),
      uvIndex: current.uv_index || 0,
      apparentTemperature: optionalNumber(current.apparent_temperature),
      visibility: optionalNumber(current.visibility),
      pressure: optionalNumber(current.surface_pressure),
      windGusts: optionalNumber(current.wind_gusts_10m),
    },
    hourly: (hourly.time as string[]).slice(0, 24).map((time: string, i: number) => ({
      time,
      temperature: Math.round((hourly.temperature_2m[i] as number) * 10) / 10,
      condition: mapWeatherCode(hourly.weather_code[i] as number),
      precipitationProbability: (hourly.precipitation_probability[i] as number) || 0,
      windSpeed: optionalNumber(hourly.wind_speed_10m?.[i]),
      windDirection: optionalWindDirection(hourly.wind_direction_10m?.[i]),
      uvIndex: optionalNumber(hourly.uv_index?.[i]),
      humidity: optionalNumber(hourly.relative_humidity_2m?.[i]),
      precipitation: optionalNumber(hourly.precipitation?.[i]),
    })),
    daily,
    fetchedAt: new Date().toISOString(),
  };

  await context.env.BEACH_CACHE.put(cacheKey, JSON.stringify(forecast), {
    expirationTtl: WEATHER_TTL_SECONDS,
  });

  return Response.json(createSuccessResponse(forecast, true, forecast.fetchedAt));
};

function mapWeatherCode(code: number): WeatherCondition {
  if (code <= 1) return 'sunny';
  if (code <= 3) return 'partly-cloudy';
  if (code <= 48) return 'cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'foggy';
  return 'stormy';
}

function getWindDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalWindDirection(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? getWindDirection(value) : undefined;
}
