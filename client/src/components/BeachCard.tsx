import type { BeachSummary } from '@van-beaches/shared';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPersonality } from '../data/beach-personalities';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { FavoriteButton } from './FavoriteButton';

interface BeachCardProps {
  beach: BeachSummary;
}

export function BeachCard({ beach }: BeachCardProps) {
  const personality = useMemo(() => getPersonality(beach.id), [beach.id]);
  const WeatherIcon = beach.currentWeather ? getWeatherIcon(beach.currentWeather.condition) : null;
  const weatherColor = beach.currentWeather ? getWeatherColor(beach.currentWeather.condition) : '';

  return (
    <div className="group relative">
      <Link
        to={`/beach/${beach.id}`}
        className="flex items-center gap-3 py-3 px-1 hover:bg-sand-50 transition-colors"
      >
        {/* Left: name + tagline */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-sand-900 leading-tight truncate">
            {beach.name}
          </h3>
          {personality && (
            <p className="text-xs text-sand-500 mt-0.5 truncate">{personality.tagline}</p>
          )}
        </div>

        {/* Right: conditions */}
        {beach.currentWeather && (
          <div className="flex items-center gap-1.5 shrink-0 mr-8">
            {WeatherIcon && (
              <WeatherIcon className={`w-3.5 h-3.5 ${weatherColor} shrink-0`} strokeWidth={2} />
            )}
            <span className="text-xs font-semibold text-ocean-700">
              {beach.currentWeather.temperature}°C
            </span>
            <span className="text-xs text-sand-500 capitalize">
              {beach.currentWeather.condition}
            </span>
          </div>
        )}
      </Link>

      {/* Favorite button — right-aligned */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>
    </div>
  );
}
