import type { WeatherForecast as ForecastType } from '@van-beaches/shared';
import { BarChart3 } from 'lucide-react';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface WeatherForecastProps {
  forecast: ForecastType | null;
  loading?: boolean;
}

export function WeatherForecast({ forecast, loading }: WeatherForecastProps) {
  if (loading) {
    return (
      <Card variant="sky">
        <CardTitle className="flex items-center gap-2">
          <Icon icon={BarChart3} size="lg" color="sky" />
          5-Day Forecast
        </CardTitle>
        <CardContent className="mt-4">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-center">
                <div className="h-4 shimmer rounded mb-2" />
                <div className="h-8 shimmer rounded mb-2 mx-auto w-8" />
                <div className="h-4 shimmer rounded mb-1" />
                <div className="h-3 shimmer rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast?.daily || forecast.daily.length === 0) {
    return (
      <Card variant="sky">
        <CardTitle className="flex items-center gap-2">
          <Icon icon={BarChart3} size="lg" color="sky" />
          5-Day Forecast
        </CardTitle>
        <CardContent className="mt-4">
          <p className="text-sand-500 dark:text-sand-400">Forecast unavailable</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="sky">
      <CardTitle className="flex items-center gap-2">
        <Icon icon={BarChart3} size="lg" color="sky" />
        5-Day Forecast
      </CardTitle>
      <CardContent className="mt-4">
        <div className="grid grid-cols-5 gap-2">
          {forecast.daily.slice(0, 5).map((day, idx) => {
            const date = new Date(day.date);
            const dayName =
              idx === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
            const WeatherIcon = getWeatherIcon(day.condition);
            const iconColor = getWeatherColor(day.condition);

            return (
              <div
                key={day.date}
                className="text-center p-2 rounded-lg bg-sky-50/60 dark:bg-sand-700/50"
              >
                <p className="text-xs text-sand-500 dark:text-sand-400 mb-1">{dayName}</p>
                <WeatherIcon className={"w-6 h-6 mx-auto mb-1 " + iconColor} strokeWidth={1.5} />
                <p className="text-sm font-semibold text-sand-900 dark:text-sand-100">
                  {day.high.toFixed(0)}°
                </p>
                <p className="text-xs text-sand-500 dark:text-sand-400">{day.low.toFixed(0)}°</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
