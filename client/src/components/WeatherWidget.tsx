import type { WeatherForecast } from '@van-beaches/shared';

interface WeatherWidgetProps {
  weather: WeatherForecast | null;
  loading?: boolean;
  error?: string | null;
}

const icons: Record<string, string> = {
  sunny: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  foggy: '🌫️',
};

const windDirections: Record<string, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

function WindCompass({ direction, speed }: { direction: string; speed: number }) {
  const rotation = windDirections[direction] || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 rounded-full border-2 border-ocean-300 dark:border-ocean-600">
        <div
          className="absolute top-1/2 left-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2"
          style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        >
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-ocean-500 -translate-y-1" />
        </div>
      </div>
      <div className="text-sm">
        <p className="font-medium text-sand-900 dark:text-sand-100">{speed} km/h</p>
        <p className="text-sand-500 dark:text-sand-400 text-xs">{direction}</p>
      </div>
    </div>
  );
}

function UVIndicator({ index }: { index: number }) {
  const getColor = (uv: number) => {
    if (uv <= 2) return 'bg-shore-400';
    if (uv <= 5) return 'bg-yellow-400';
    if (uv <= 7) return 'bg-orange-400';
    if (uv <= 10) return 'bg-red-500';
    return 'bg-purple-600';
  };

  const getLabel = (uv: number) => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full ${getColor(index)} flex items-center justify-center text-white font-bold text-sm`}
      >
        {index}
      </div>
      <div className="text-sm">
        <p className="font-medium text-sand-900 dark:text-sand-100">UV Index</p>
        <p className="text-sand-500 dark:text-sand-400 text-xs">{getLabel(index)}</p>
      </div>
    </div>
  );
}

export function WeatherWidget({ weather, loading, error }: WeatherWidgetProps) {
  if (loading)
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Weather</h3>
        <div className="animate-pulse h-24 bg-ocean-100 dark:bg-sand-700 rounded" />
      </div>
    );
  if (error)
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Weather</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  if (!weather) return null;

  return (
    <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
      <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Current Weather</h3>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-5xl">{icons[weather.current.condition] || '🌡️'}</span>
        <div>
          <p className="text-4xl font-bold text-sand-900 dark:text-sand-50">
            {weather.current.temperature.toFixed(0)}°C
          </p>
          <p className="text-sand-600 dark:text-sand-400 capitalize">
            {weather.current.condition.replace('-', ' ')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ocean-200/50 dark:border-sand-700">
        <WindCompass direction={weather.current.windDirection} speed={weather.current.windSpeed} />
        <UVIndicator index={weather.current.uvIndex} />
        <div className="flex items-center gap-2">
          <span className="text-2xl">💧</span>
          <div className="text-sm">
            <p className="font-medium text-sand-900 dark:text-sand-100">{weather.current.humidity}%</p>
            <p className="text-sand-500 dark:text-sand-400 text-xs">Humidity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
