import type { EnvironmentalWeather, WeatherCondition, WeatherForecast } from '@van-beaches/shared';
import { kvCache } from '../cache/kvCache';

const WEATHER_TTL_SECONDS = 1800; // 30 minutes

async function retrieveWeatherForBeach(
  beachId: string,
  lat: number,
  lon: number,
): Promise<WeatherForecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,surface_pressure,cloud_cover,precipitation,rain,showers&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,uv_index,relative_humidity_2m,cloud_cover,visibility,rain,showers&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=America/Vancouver&timeformat=unixtime&past_hours=6&forecast_hours=72&forecast_days=10&wind_speed_unit=kmh`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

  const data: Record<string, unknown> = await response.json();
  const current = data.current as Record<string, number> & { time?: string | number };
  const hourly = data.hourly as Record<string, (string | number)[]>;
  const dailyData = data.daily as Record<string, (string | number)[]> | undefined;

  if (
    !current ||
    !hourly ||
    !Array.isArray(hourly.time) ||
    !Number.isFinite(current.temperature_2m)
  ) {
    throw new Error('Invalid weather response');
  }
  const utc = (value: string | number) =>
    typeof value === 'number' ? new Date(value * 1000).toISOString() : value;
  const sample = (
    row: Record<string, unknown>,
    time: string,
    intervalSeconds = 3600,
  ): EnvironmentalWeather | null => {
    if (!Number.isFinite(Date.parse(time)) || !Number.isFinite(row.temperature_2m)) return null;
    const condition = mapWeatherCode(Number(row.weather_code));
    const number = (key: string, fallback = 0) => optionalNumber(row[key]) ?? fallback;
    return {
      time,
      temperature: number('temperature_2m'),
      condition,
      cloudCover: Math.max(
        0,
        Math.min(100, number('cloud_cover', condition === 'sunny' ? 10 : 75)),
      ),
      precipitation: (Math.max(0, number('precipitation')) * 3600) / intervalSeconds,
      rain: (Math.max(0, number('rain') + number('showers')) * 3600) / intervalSeconds,
      windSpeed: Math.max(0, number('wind_speed_10m')),
      windDirection: ((number('wind_direction_10m') % 360) + 360) % 360,
      visibility: optionalNumber(row.visibility) ?? null,
    };
  };
  const environmentHourly = (hourly.time as (string | number)[]).flatMap((time, i) => {
    const row = Object.fromEntries(Object.entries(hourly).map(([key, values]) => [key, values[i]]));
    const value = sample(row, utc(time));
    return value ? [value] : [];
  });
  const condition = mapWeatherCode(current.weather_code);

  const daily = dailyData
    ? (dailyData.time as (string | number)[]).map((date, i: number) => ({
        date:
          typeof date === 'number'
            ? new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Vancouver',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(new Date(date * 1000))
            : date,
        high: Math.round((dailyData.temperature_2m_max[i] as number) * 10) / 10,
        low: Math.round((dailyData.temperature_2m_min[i] as number) * 10) / 10,
        condition: mapWeatherCode(dailyData.weather_code[i] as number),
        sunrise: optionalTime(dailyData.sunrise?.[i]),
        sunset: optionalTime(dailyData.sunset?.[i]),
        precipitationProbability: optionalNumber(dailyData.precipitation_probability_max?.[i]),
      }))
    : undefined;

  const forecast: WeatherForecast = {
    beachId,
    environment: {
      current:
        current.time === undefined
          ? null
          : sample(current, utc(current.time), current.interval > 0 ? current.interval : 900),
      hourly: environmentHourly,
    },
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
    hourly: (hourly.time as (string | number)[]).map((time, i: number) => ({
      time: utc(time),
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

  const upcoming = forecast.hourly.filter((item) => Date.parse(item.time) >= Date.now() - 3600000);
  forecast.hourly = (upcoming.length ? upcoming : forecast.hourly).slice(0, 24);
  return forecast;
}

function mapWeatherCode(code: number): WeatherCondition {
  if (code <= 1) return 'sunny';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'foggy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'cloudy'; // Snow is retained as precipitation, never rendered as rain.
  if (code <= 82) return 'rainy';
  if (code >= 95) return 'stormy';
  return 'cloudy';
}

function getWindDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalTime(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return new Date(value * 1000).toISOString();
  return typeof value === 'string' ? value : undefined;
}

function optionalWindDirection(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? getWindDirection(value) : undefined;
}

export function getWeatherForBeach(kv: KVNamespace, beachId: string, lat: number, lon: number) {
  return kvCache.resilient(
    kv,
    `weather:${beachId}`,
    () => retrieveWeatherForBeach(beachId, lat, lon),
    WEATHER_TTL_SECONDS,
  );
}

// Existing scheduled-job API now shares cache coalescing with Pages requests.
export const fetchWeatherForBeach = getWeatherForBeach;
