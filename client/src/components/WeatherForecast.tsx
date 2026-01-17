import type { WeatherForecast as ForecastType } from '@van-beaches/shared';

interface WeatherForecastProps {
  forecast: ForecastType | null;
  loading?: boolean;
}

const icons: Record<string, string> = {
  sunny: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  foggy: '🌫️',
};

export function WeatherForecast({ forecast, loading }: WeatherForecastProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5-Day Forecast</h3>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!forecast?.daily || forecast.daily.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5-Day Forecast</h3>
        <p className="text-gray-500 dark:text-gray-400">Forecast unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">5-Day Forecast</h3>
      <div className="grid grid-cols-5 gap-2">
        {forecast.daily.slice(0, 5).map((day, idx) => {
          const date = new Date(day.date);
          const dayName =
            idx === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

          return (
            <div
              key={day.date}
              className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{dayName}</p>
              <span className="text-2xl block mb-1">{icons[day.condition] || '🌡️'}</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {day.high.toFixed(0)}°
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{day.low.toFixed(0)}°</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
