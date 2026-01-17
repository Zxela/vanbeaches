import { useMemo } from 'react';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';

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
    <div
      className={`rounded-xl shadow-lg p-4 ${isGoldenHour ? 'bg-gradient-to-br from-orange-100 to-yellow-50 dark:from-orange-900/50 dark:to-yellow-900/30' : 'bg-white dark:bg-gray-800'}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Sun Times</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌅</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sunrise</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatSunTime(sunTimes.sunrise)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌇</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Sunset</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatSunTime(sunTimes.sunset)}
            </p>
          </div>
        </div>
      </div>

      {isGoldenHour && (
        <div className="mt-4 bg-gradient-to-r from-orange-200 to-yellow-200 dark:from-orange-800 dark:to-yellow-800 rounded-lg px-3 py-2 text-center">
          <span className="text-orange-800 dark:text-orange-200 font-medium">Golden Hour Now!</span>
        </div>
      )}

      {!isGoldenHour && sunsetCountdown && isDaytime && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            <span className="font-medium">Golden hour in </span>
            {sunsetCountdown.hours > 0 && (
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {sunsetCountdown.hours}h{' '}
              </span>
            )}
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {sunsetCountdown.mins}m
            </span>
          </p>
        </div>
      )}

      {!isDaytime && (
        <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg px-3 py-2 text-center">
          <span className="text-indigo-700 dark:text-indigo-300">Night time</span>
        </div>
      )}
    </div>
  );
}
