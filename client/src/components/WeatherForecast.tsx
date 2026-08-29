import type { WeatherForecast as ForecastType } from '@van-beaches/shared';
import { CalendarDays } from 'lucide-react';
import { getWeatherIcon } from '../lib/weatherIcons';

interface WeatherForecastProps {
  forecast: ForecastType | null;
  loading?: boolean;
}

export function WeatherForecast({ forecast, loading }: WeatherForecastProps) {
  if (loading) {
    return (
      <section className="weather-panel p-4">
        <h2 className="mb-4 text-sm text-white/70">10-Day Forecast</h2>
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
      </section>
    );
  }

  if (!forecast?.daily || forecast.daily.length === 0) {
    return (
      <section className="weather-panel p-4">
        <h2>10-Day Forecast</h2>
        <p className="mt-4 text-white/60">Forecast unavailable</p>
      </section>
    );
  }

  const daily = forecast.daily;

  return (
    <section className="weather-panel overflow-hidden">
      <div className="weather-panel-title">
        <CalendarDays className="h-4 w-4" />
        <h2>{forecast.daily.length > 5 ? '10-Day Forecast' : '5-Day Forecast'}</h2>
      </div>
      <div className="px-4">
        {daily.slice(0, 10).map((day, idx) => {
          const date = new Date(day.date);
          const dayName =
            idx === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
          const WeatherIcon = getWeatherIcon(day.condition);
          const min = Math.min(...daily.map((item) => item.low));
          const max = Math.max(...daily.map((item) => item.high));
          const range = Math.max(max - min, 1);
          const left = ((day.low - min) / range) * 45;
          const width = Math.max(((day.high - day.low) / range) * 55, 14);

          return (
            <div
              key={day.date}
              className="grid grid-cols-[4.5rem_2rem_2rem_1fr_2rem] items-center gap-2 border-b border-white/15 py-3 last:border-0"
            >
              <p className="text-sm font-semibold text-white">{dayName}</p>
              <WeatherIcon className="h-6 w-6 text-white" strokeWidth={1.5} />
              <p className="text-sm text-white/55">{day.low.toFixed(0)}°</p>
              <div className="relative h-1 rounded-full bg-white/20">
                <span
                  className="absolute h-1 rounded-full bg-gradient-to-r from-sky-200 via-amber-200 to-orange-300"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
              <p className="text-right text-sm font-semibold text-white">{day.high.toFixed(0)}°</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
