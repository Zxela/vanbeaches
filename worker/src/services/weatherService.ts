import type { WeatherCondition, WeatherForecast } from '@van-beaches/shared';
import { kvCache } from '../cache/kvCache';

const WEATHER_TTL_SECONDS = 1800; // 30 minutes

export async function fetchWeatherForBeach(
  kv: KVNamespace,
  beachId: string,
  lat: number,
  lon: number,
): Promise<WeatherForecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,surface_pressure&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,uv_index,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=America/Vancouver&forecast_hours=24&forecast_days=10`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

  const data: Record<string, unknown> = await response.json();
  const current = data.current as Record<string, number>;
  const hourly = data.hourly as Record<string, (string | number)[]>;
  const dailyData = data.daily as Record<string, (string | number)[]> | undefined;

  const condition = mapWeatherCode(current.weather_code);

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
      condition,
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

  await kvCache.set(kv, `weather:${beachId}`, forecast, WEATHER_TTL_SECONDS);
  return forecast;
}

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
