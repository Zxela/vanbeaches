export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'foggy';

export interface WeatherForecast {
  beachId: string;
  current: {
    temperature: number;
    condition: WeatherCondition;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    uvIndex: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    condition: WeatherCondition;
    precipitationProbability: number;
  }>;
  fetchedAt: string;
}

export function isWeatherCondition(value: unknown): value is WeatherCondition {
  return (
    typeof value === 'string' &&
    ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'foggy'].includes(value)
  );
}

export function isWeatherForecast(value: unknown): value is WeatherForecast {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.beachId === 'string' &&
    typeof obj.current === 'object' &&
    obj.current !== null &&
    Array.isArray(obj.hourly) &&
    typeof obj.fetchedAt === 'string'
  );
}
