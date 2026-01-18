import type { BeachSummary } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';
import { Card, Icon } from './ui';

interface BeachCardProps {
  beach: BeachSummary;
}

const weatherIcons: Record<string, LucideIcon> = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  stormy: CloudLightning,
  foggy: CloudFog,
};

const weatherColors: Record<string, string> = {
  sunny: 'text-amber-500',
  'partly-cloudy': 'text-sky-400',
  cloudy: 'text-sand-400',
  rainy: 'text-sky-500',
  stormy: 'text-purple-500',
  foggy: 'text-sand-400',
};

export function BeachCard({ beach }: BeachCardProps) {
  const WeatherIcon = beach.currentWeather
    ? weatherIcons[beach.currentWeather.condition] || Thermometer
    : null;
  const weatherColor = beach.currentWeather
    ? weatherColors[beach.currentWeather.condition] || 'text-sand-500'
    : '';

  return (
    <Card variant="interactive" padding="none" className="group relative overflow-hidden">
      <Link to={`/beach/${beach.id}`} className="block p-4">
        <div className="flex items-start justify-between">
          <motion.h3
            className="text-lg font-semibold text-sand-900 dark:text-sand-100 group-hover:text-ocean-600 dark:group-hover:text-ocean-400 transition-colors pr-10"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            {beach.name}
          </motion.h3>
          {WeatherIcon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <WeatherIcon className={`w-7 h-7 ${weatherColor}`} strokeWidth={1.5} />
            </motion.div>
          )}
        </div>

        <motion.div
          className="mt-3 flex items-center gap-3 text-sm"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {beach.currentWeather && (
            <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full">
              <Icon icon={Thermometer} size="xs" className="text-sky-500" />
              <span className="font-medium">{beach.currentWeather.temperature}°C</span>
            </div>
          )}
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
        </motion.div>

        <motion.div
          className="mt-3 flex items-center gap-2 text-xs text-sand-500 dark:text-sand-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Icon icon={Waves} size="xs" color="ocean" />
          <span>View details</span>
        </motion.div>
      </Link>

      <div className="absolute top-3 right-3 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>

      <div className="h-1 bg-gradient-to-r from-ocean-400 to-shore-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </Card>
  );
}
