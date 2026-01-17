import type { BeachSummary } from '@van-beaches/shared';
import { Link } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';

interface BeachCardProps {
  beach: BeachSummary;
}

const weatherIcons: Record<string, string> = {
  sunny: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  foggy: '🌫️',
};

export function BeachCard({ beach }: BeachCardProps) {
  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600">
      <Link to={`/beach/${beach.id}`} className="block p-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-8">
            {beach.name}
          </h3>
          {beach.currentWeather && (
            <span className="text-2xl">{weatherIcons[beach.currentWeather.condition] || '🌡️'}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          {beach.currentWeather && (
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              <span className="font-medium">{beach.currentWeather.temperature}°C</span>
            </div>
          )}
          {beach.nextTide && (
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
              <span
                className={
                  beach.nextTide.type === 'high'
                    ? 'text-cyan-500 dark:text-cyan-400'
                    : 'text-gray-400 dark:text-gray-500'
                }
              >
                {beach.nextTide.type === 'high' ? '▲' : '▼'}
              </span>
              <span>
                {beach.nextTide.type} tide {beach.nextTide.time}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="absolute top-3 right-3">
        <FavoriteButton beachId={beach.id} size="sm" />
      </div>

      <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </div>
  );
}
