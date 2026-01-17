import type { WeatherForecast } from '@van-beaches/shared';

interface WeatherWidgetProps {
  weather: WeatherForecast | null;
  loading?: boolean;
  error?: string | null;
}

const icons: Record<string, string> = { sunny: '☀️', 'partly-cloudy': '⛅', cloudy: '☁️', rainy: '🌧️', stormy: '⛈️', foggy: '🌫️' };

export function WeatherWidget({ weather, loading, error }: WeatherWidgetProps) {
  if (loading) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Weather</h3><div className="animate-pulse h-24 bg-gray-200 rounded" /></div>;
  if (error) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Weather</h3><p className="text-red-500">{error}</p></div>;
  if (!weather) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Current Weather</h3>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{icons[weather.current.condition] || '🌡️'}</span>
        <div>
          <p className="text-3xl font-bold">{weather.current.temperature.toFixed(1)}°C</p>
          <p className="text-gray-600 capitalize">{weather.current.condition.replace('-', ' ')}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
        <div>💨 {weather.current.windSpeed} km/h {weather.current.windDirection}</div>
        <div>💧 {weather.current.humidity}%</div>
        <div>☀️ UV {weather.current.uvIndex}</div>
      </div>
    </div>
  );
}
