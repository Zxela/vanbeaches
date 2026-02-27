import type { BeachSummary } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { FavoriteButton } from './FavoriteButton';
import { Card, Icon } from './ui';

interface BeachCardProps {
  beach: BeachSummary;
}

const conditionGradients: Record<string, string> = {
  sunny: 'from-amber-400/20 via-orange-300/10 to-transparent',
  'partly-cloudy': 'from-sky-300/15 via-sky-200/8 to-transparent',
  cloudy: 'from-sand-300/15 via-sand-200/8 to-transparent',
  rainy: 'from-slate-400/15 via-slate-300/8 to-transparent',
  stormy: 'from-purple-400/15 via-slate-400/8 to-transparent',
};

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

export function BeachCard({ beach }: BeachCardProps) {
  const WeatherIcon = beach.currentWeather ? getWeatherIcon(beach.currentWeather.condition) : null;
  const weatherColor = beach.currentWeather ? getWeatherColor(beach.currentWeather.condition) : '';
  const gradient = beach.currentWeather
    ? conditionGradients[beach.currentWeather.condition] || ''
    : '';

  return (
    <Card variant="interactive" padding="none" className="group relative overflow-hidden">
      {/* Condition-based gradient accent */}
      {gradient && (
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient} pointer-events-none`} />
      )}

      <Link to={`/beach/${beach.id}`} className="block p-4 relative">
        <div className="flex items-start justify-between gap-2">
          <motion.h3
            className="text-lg font-semibold text-sand-900 dark:text-sand-100 group-hover:text-ocean-600 dark:group-hover:text-ocean-400 transition-colors pr-8"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            {beach.name}
          </motion.h3>
          {/* Weather temp - prominent */}
          {beach.currentWeather && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {WeatherIcon && (
                <WeatherIcon className={`w-6 h-6 ${weatherColor}`} strokeWidth={1.5} />
              )}
              <span className="text-lg font-bold text-sand-900 dark:text-sand-100">
                {beach.currentWeather.temperature}°C
              </span>
            </motion.div>
          )}
        </div>

        <motion.div
          className="mt-3 flex items-center gap-3 text-sm"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
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
          {/* Water quality indicator */}
          {beach.waterQuality && beach.waterQuality !== 'unknown' && (
            <div className="flex items-center gap-1.5 text-sand-500 dark:text-sand-400">
              <span className={`w-2 h-2 rounded-full ${waterQualityDot[beach.waterQuality]}`} />
              <span className="text-xs">{waterQualityLabel[beach.waterQuality]}</span>
            </div>
          )}
        </motion.div>

        <motion.div
          className="mt-3 flex items-center justify-between text-xs text-sand-500 dark:text-sand-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="flex items-center gap-1 group-hover:text-ocean-600 dark:group-hover:text-ocean-400 transition-colors">
            View details
            <Icon icon={ArrowRight} size="xs" className="translate-x-0 group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.div>
      </Link>

      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>

      <div className="h-0.5 bg-gradient-to-r from-ocean-400 to-shore-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Card>
  );
}
