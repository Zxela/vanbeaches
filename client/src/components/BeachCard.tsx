import { BEACHES, type BeachSummary } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPersonality } from '../data/beach-personalities';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { FavoriteButton } from './FavoriteButton';

interface BeachCardProps {
  beach: BeachSummary;
}

// Fallback gradients when no image is available
const fallbackGradients = [
  'from-ocean-400 to-sky-500',
  'from-shore-400 to-ocean-500',
  'from-sky-400 to-ocean-600',
  'from-ocean-500 to-shore-400',
];

export function BeachCard({ beach }: BeachCardProps) {
  const beachData = useMemo(() => BEACHES.find((b) => b.id === beach.id), [beach.id]);
  const personality = useMemo(() => getPersonality(beach.id), [beach.id]);
  const WeatherIcon = beach.currentWeather ? getWeatherIcon(beach.currentWeather.condition) : null;
  const weatherColor = beach.currentWeather ? getWeatherColor(beach.currentWeather.condition) : '';
  const gradientIdx = beach.name.length % fallbackGradients.length;

  const keyDifferentiator = personality?.differentiators?.[0] ?? null;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-sand-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link to={`/beach/${beach.id}`} className="block">
        {/* Mobile: horizontal layout — photo left, info right */}
        {/* Desktop (md+): vertical layout — photo top, info below */}
        <div className="flex md:flex-col">
          {/* Thumbnail — landscape, fixed width on mobile, full-width on desktop */}
          <div className="relative w-28 shrink-0 md:w-auto md:aspect-[16/10] overflow-hidden rounded-l-2xl md:rounded-l-none md:rounded-t-2xl">
            {beachData?.images ? (
              <img
                src={beachData.images.thumb}
                alt={beach.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${fallbackGradients[gradientIdx]}`}
              />
            )}
            {/* Light overlay for warmth — much lighter than old design */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent md:bg-gradient-to-t md:from-black/30 md:to-transparent" />
          </div>

          {/* Info panel */}
          <div className="flex-1 min-w-0 p-3 md:p-4 flex flex-col justify-between">
            {/* Beach name + archetype */}
            <div>
              <h3 className="font-display text-sm font-semibold text-sand-900 leading-tight line-clamp-1 md:text-base">
                {beach.name}
              </h3>
              {personality && (
                <p className="text-xs text-coral-600 font-medium mt-0.5 line-clamp-1">
                  {personality.archetype}
                </p>
              )}
            </div>

            {/* Key differentiator */}
            {keyDifferentiator && (
              <p className="text-xs text-sand-600 mt-1.5 line-clamp-2 leading-snug">
                {keyDifferentiator}
              </p>
            )}

            {/* Current conditions */}
            {beach.currentWeather && (
              <div className="flex items-center gap-1.5 mt-2">
                {WeatherIcon && (
                  <WeatherIcon className={`w-3.5 h-3.5 ${weatherColor} shrink-0`} strokeWidth={2} />
                )}
                <span className="text-xs font-semibold text-ocean-700">
                  {beach.currentWeather.temperature}°C
                </span>
                <span className="text-xs text-sand-500 capitalize">
                  · {beach.currentWeather.condition}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Favorite button — floating over thumbnail */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>
    </motion.div>
  );
}
