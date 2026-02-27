import { BEACHES, type BeachSummary } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { FavoriteButton } from './FavoriteButton';
import { Icon } from './ui';

interface BeachCardProps {
  beach: BeachSummary;
}

const waterQualityDot: Record<string, string> = {
  good: 'bg-emerald-500',
  advisory: 'bg-amber-500',
  closed: 'bg-red-500',
  unknown: 'bg-sand-400',
  'off-season': 'bg-sky-400',
};

const waterQualityLabel: Record<string, string> = {
  good: 'Good',
  advisory: 'Advisory',
  closed: 'Closed',
  'off-season': 'Off-season',
};

// Fallback gradients when no image is available
const fallbackGradients = [
  'from-ocean-400 to-sky-500',
  'from-shore-400 to-ocean-500',
  'from-sky-400 to-ocean-600',
  'from-ocean-500 to-shore-400',
];

export function BeachCard({ beach }: BeachCardProps) {
  const beachData = useMemo(() => BEACHES.find((b) => b.id === beach.id), [beach.id]);
  const WeatherIcon = beach.currentWeather ? getWeatherIcon(beach.currentWeather.condition) : null;
  const weatherColor = beach.currentWeather ? getWeatherColor(beach.currentWeather.condition) : '';
  const gradientIdx = beach.name.length % fallbackGradients.length;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-sand-800 shadow-card dark:shadow-card-dark hover:shadow-card-hover dark:hover:shadow-ocean-md transition-all duration-300 hover:-translate-y-0.5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/beach/${beach.id}`} className="block">
        {/* Photo section - top 60% */}
        <div className="relative aspect-[3/2] overflow-hidden">
          {beachData?.images ? (
            <img
              src={beachData.images.thumb}
              alt={beach.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${fallbackGradients[gradientIdx]}`} />
          )}

          {/* Gradient overlay at bottom of photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Weather badge - top right */}
          {beach.currentWeather && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
              {WeatherIcon && (
                <WeatherIcon className={`w-4 h-4 ${weatherColor}`} strokeWidth={1.5} />
              )}
              <span className="text-sm font-semibold text-white">
                {beach.currentWeather.temperature}°C
              </span>
            </div>
          )}

          {/* Beach name + tagline at bottom of photo */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white leading-tight">{beach.name}</h3>
            {beachData?.tagline && (
              <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{beachData.tagline}</p>
            )}
          </div>
        </div>

        {/* Bottom strip - info bar */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            {beach.nextTide && (
              <div className="flex items-center gap-1.5 text-sand-600 dark:text-sand-400">
                <Icon
                  icon={beach.nextTide.type === 'high' ? TrendingUp : TrendingDown}
                  size="sm"
                  color={beach.nextTide.type === 'high' ? 'tide-high' : 'tide-low'}
                />
                <span className="capitalize">
                  {beach.nextTide.type} {beach.nextTide.time}
                </span>
              </div>
            )}
            {beach.waterQuality && beach.waterQuality !== 'unknown' && (
              <div className="flex items-center gap-1.5 text-sand-500 dark:text-sand-400">
                <span className={`w-2 h-2 rounded-full ${waterQualityDot[beach.waterQuality]}`} />
                <span className="text-xs">{waterQualityLabel[beach.waterQuality]}</span>
              </div>
            )}
          </div>

          <span className="flex items-center gap-1 text-xs text-ocean-600 dark:text-ocean-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Explore
            <Icon
              icon={ArrowRight}
              size="xs"
              className="translate-x-0 group-hover:translate-x-1 transition-transform"
            />
          </span>
        </div>
      </Link>

      {/* Favorite button floating over photo */}
      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>
    </motion.div>
  );
}
