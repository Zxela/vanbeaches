import { motion } from 'framer-motion';
import { Clock, Moon, Sunrise, Sunset } from 'lucide-react';
import { useMemo } from 'react';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { cn } from '../lib/utils';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface SunTimesWidgetProps {
  latitude: number;
  longitude: number;
}

export function SunTimesWidget({ latitude, longitude }: SunTimesWidgetProps) {
  const sunTimes = useSunTimes(latitude, longitude);
  const now = new Date();

  const { isGoldenHour, sunsetCountdown } = useMemo(() => {
    const isGolden = now >= sunTimes.goldenHourStart && now <= sunTimes.goldenHourEnd;
    const msToSunset = sunTimes.sunset.getTime() - now.getTime();
    const hoursToSunset = Math.floor(msToSunset / (1000 * 60 * 60));
    const minsToSunset = Math.floor((msToSunset % (1000 * 60 * 60)) / (1000 * 60));

    return {
      isGoldenHour: isGolden,
      sunsetCountdown: msToSunset > 0 ? { hours: hoursToSunset, mins: minsToSunset } : null,
    };
  }, [now, sunTimes]);

  const isDaytime = now >= sunTimes.sunrise && now <= sunTimes.sunset;

  return (
    <Card
      variant={isGoldenHour ? 'default' : 'default'}
      className={cn(
        isGoldenHour &&
          'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50',
      )}
      animated
    >
      <CardTitle className="flex items-center gap-2">
        <Icon icon={isDaytime ? Sunrise : Moon} size="lg" color={isDaytime ? 'warning' : 'muted'} />
        Sun Times
      </CardTitle>

      <CardContent className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Icon icon={Sunrise} size="lg" className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-sand-500 dark:text-sand-400 uppercase font-medium">
                Sunrise
              </p>
              <p className="text-lg font-semibold text-sand-900 dark:text-sand-100">
                {formatSunTime(sunTimes.sunrise)}
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Icon icon={Sunset} size="lg" className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-sand-500 dark:text-sand-400 uppercase font-medium">
                Sunset
              </p>
              <p className="text-lg font-semibold text-sand-900 dark:text-sand-100">
                {formatSunTime(sunTimes.sunset)}
              </p>
            </div>
          </motion.div>
        </div>

        {isGoldenHour && (
          <motion.div
            className="mt-4 bg-gradient-to-r from-amber-200 to-orange-200 dark:from-amber-800/50 dark:to-orange-800/50 rounded-xl px-4 py-3 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-amber-800 dark:text-amber-200 font-semibold flex items-center justify-center gap-2">
              <Sunset className="w-5 h-5" />
              Golden Hour Now!
            </span>
          </motion.div>
        )}

        {!isGoldenHour && sunsetCountdown && isDaytime && (
          <motion.div
            className="mt-4 bg-ocean-50 dark:bg-ocean-900/30 rounded-xl px-4 py-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-sm text-sand-600 dark:text-sand-300 text-center flex items-center justify-center gap-2">
              <Icon icon={Clock} size="sm" color="ocean" />
              <span className="font-medium">Golden hour in </span>
              {sunsetCountdown.hours > 0 && (
                <span className="font-bold text-ocean-600 dark:text-ocean-400">
                  {sunsetCountdown.hours}h{' '}
                </span>
              )}
              <span className="font-bold text-ocean-600 dark:text-ocean-400">
                {sunsetCountdown.mins}m
              </span>
            </p>
          </motion.div>
        )}

        {!isDaytime && (
          <motion.div
            className="mt-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl px-4 py-3 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-indigo-700 dark:text-indigo-300 font-medium flex items-center justify-center gap-2">
              <Icon icon={Moon} size="sm" />
              Night time
            </span>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
