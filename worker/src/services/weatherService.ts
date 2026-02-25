import type { WeatherCondition, WeatherForecast } from '@van-beaches/shared';
import { kvCache } from '../cache/kvCache';

const WEATHER_TTL_SECONDS = 1800; // 30 minutes

export async function fetchWeatherForBeach(
  kv: KVNamespace,
  beachId: string,
  lat: number,
  lon: number,
): Promise<WeatherForecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America/Vancouver&forecast_hours=24&forecast_days=5`;

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
    },
    hourly: (hourly.time as string[]).slice(0, 24).map((time: string, i: number) => ({
      time,
      temperature: Math.round((hourly.temperature_2m[i] as number) * 10) / 10,
      condition: mapWeatherCode(hourly.weather_code[i] as number),
      precipitationProbability: (hourly.precipitation_probability[i] as number) || 0,
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
