import type { ApiResponse, WeatherForecast } from '@van-beaches/shared';
import { useCallback, useEffect, useState } from 'react';

export function useWeather(beachId: string | undefined) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!beachId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/weather/${beachId}`);
      const data: ApiResponse<WeatherForecast> = await response.json();
      if (data.success && data.data) setWeather(data.data);
      else setError(data.error || 'Failed to fetch weather');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [beachId]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);
  return { weather, loading, error, refetch: fetchWeather };
}
