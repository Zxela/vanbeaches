import type { WeatherCondition, WeatherForecast } from '@van-beaches/shared';
import { cacheManager } from '../cache/cacheManager.js';

const WEATHER_CACHE_TTL = 1800000; // 30 minutes

export async function getWeatherForecast(
  beachId: string,
  lat: number,
  lon: number,
): Promise<WeatherForecast> {
  const cacheKey = `weather:${beachId}`;

  return cacheManager.getOrFetch(
    cacheKey,
    async () => {
      // Using Open-Meteo as fallback (Environment Canada API is complex)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&timezone=America/Vancouver&forecast_hours=24`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

      const data = await response.json();
      const condition = mapWeatherCode(data.current.weather_code);

      return {
        beachId,
        current: {
          temperature: Math.round(data.current.temperature_2m * 10) / 10,
          condition,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDirection: getWindDirection(data.current.wind_direction_10m),
          uvIndex: data.current.uv_index || 0,
        },
        hourly: data.hourly.time.slice(0, 24).map((time: string, i: number) => ({
          time,
          temperature: Math.round(data.hourly.temperature_2m[i] * 10) / 10,
          condition: mapWeatherCode(data.hourly.weather_code[i]),
          precipitationProbability: data.hourly.precipitation_probability[i] || 0,
        })),
        fetchedAt: new Date().toISOString(),
      };
    },
    WEATHER_CACHE_TTL,
  );
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
