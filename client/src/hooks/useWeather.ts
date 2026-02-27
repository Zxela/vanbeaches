import type { WeatherForecast } from '@van-beaches/shared';
import { useApiQuery } from './useApiQuery';

export function useWeather(beachId: string | undefined) {
  const { data: weather, ...rest } = useApiQuery<WeatherForecast>(
    beachId ? `/api/weather/${beachId}` : null,
  );
  return { weather, ...rest };
}
