import type { WeatherForecast } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface WeatherWidgetProps {
  weather: WeatherForecast | null;
  loading?: boolean;
  error?: string | null;
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
    <div className="flex items-center gap-3">
      <motion.div
        className="relative w-10 h-10 rounded-full bg-ocean-50 dark:bg-ocean-900/30 border-2 border-ocean-200 dark:border-ocean-700 flex items-center justify-center"
        initial={{ rotate: 0 }}
        animate={{ rotate: rotation }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[10px] border-l-transparent border-r-transparent border-b-ocean-500" />
      </motion.div>
      <div>
        <p className="font-semibold text-sand-900 dark:text-sand-100">{speed} km/h</p>
        <p className="text-xs text-sand-500 dark:text-sand-400">{direction}</p>
      </div>
    </div>
  );
}

function UVIndicator({ index }: { index: number }) {
  const getColor = (uv: number) => {
    if (uv <= 2) return 'bg-emerald-400';
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
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full ${getColor(index)} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
      >
        {index}
      </div>
      <div>
        <p className="font-semibold text-sand-900 dark:text-sand-100">UV {getLabel(index)}</p>
        <p className="text-xs text-sand-500 dark:text-sand-400">Index</p>
      </div>
    </div>
  );
}

export function WeatherWidget({ weather, loading, error }: WeatherWidgetProps) {
  if (loading) {
    return (
      <Card variant="sky">
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Thermometer} size="lg" color="sky" />
          Current Weather
        </CardTitle>
        <CardContent className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 shimmer rounded-full" />
            <div className="space-y-2">
              <div className="w-20 h-8 shimmer rounded" />
              <div className="w-24 h-4 shimmer rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-sky-200/50 dark:border-sand-700">
            <div className="w-full h-12 shimmer rounded" />
            <div className="w-full h-12 shimmer rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="sky">
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Thermometer} size="lg" color="sky" />
          Current Weather
        </CardTitle>
        <CardContent className="mt-4">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const WeatherIcon = weatherIcons[weather.current.condition] || Thermometer;
  const iconColor = weatherColors[weather.current.condition] || 'text-sand-500';

  return (
    <Card variant="sky" animated>
      <CardTitle className="flex items-center gap-2">
        <Icon icon={Thermometer} size="lg" color="sky" />
        Current Weather
      </CardTitle>

      <CardContent className="mt-4">
        <div className="flex items-center gap-4 mb-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <WeatherIcon className={`w-16 h-16 ${iconColor}`} strokeWidth={1.5} />
          </motion.div>
          <div>
            <motion.p
              className="text-4xl font-bold text-sand-900 dark:text-sand-50"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {weather.current.temperature.toFixed(0)}°C
            </motion.p>
            <motion.p
              className="text-sand-600 dark:text-sand-400 capitalize"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {weather.current.condition.replace('-', ' ')}
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-sky-200/50 dark:border-sand-700">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon icon={Wind} size="sm" color="ocean" />
              <span className="text-xs font-medium text-sand-500 dark:text-sand-400 uppercase">
                Wind
              </span>
            </div>
            <WindCompass
              direction={weather.current.windDirection}
              speed={weather.current.windSpeed}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon icon={Sun} size="sm" color="warning" />
              <span className="text-xs font-medium text-sand-500 dark:text-sand-400 uppercase">
                UV
              </span>
            </div>
            <UVIndicator index={weather.current.uvIndex} />
          </motion.div>

          <motion.div
            className="col-span-2 flex items-center gap-3 pt-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                <Icon icon={Droplets} size="lg" color="ocean" />
              </div>
              <div>
                <p className="font-semibold text-sand-900 dark:text-sand-100">
                  {weather.current.humidity}%
                </p>
                <p className="text-xs text-sand-500 dark:text-sand-400">Humidity</p>
              </div>
            </div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
