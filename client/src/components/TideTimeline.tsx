import type { TidePrediction } from '@van-beaches/shared';
import { useMemo } from 'react';

interface TideTimelineProps {
  predictions: TidePrediction[];
  loading?: boolean;
}

export function TideTimeline({ predictions, loading }: TideTimelineProps) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayTides = useMemo(() => {
    return predictions.filter((t) => {
      const time = new Date(t.time);
      return time >= todayStart && time < todayEnd;
    });
  }, [predictions, todayStart, todayEnd]);

  const currentProgress = useMemo(() => {
    const elapsed = now.getTime() - todayStart.getTime();
    const total = 24 * 60 * 60 * 1000;
    return (elapsed / total) * 100;
  }, [now, todayStart]);

  const { maxHeight, minHeight } = useMemo(() => {
    if (todayTides.length === 0) return { maxHeight: 5, minHeight: 0 };
    const heights = todayTides.map((t) => t.height);
    return {
      maxHeight: Math.max(...heights, 4),
      minHeight: Math.min(...heights, 0),
    };
  }, [todayTides]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Tides</h3>
        <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (todayTides.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Tides</h3>
        <p className="text-gray-500 dark:text-gray-400">No tide data available</p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Tides</h3>

      <div className="relative h-32">
        {/* Background grid */}
        <div className="absolute inset-0 flex justify-between">
          {[0, 6, 12, 18, 24].map((hour) => (
            <div key={hour} className="border-l border-gray-200 dark:border-gray-700 h-full" />
          ))}
        </div>

        {/* Tide curve (simplified wave) */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {todayTides.length >= 2 && (
            <path
              d={generateTidePath(todayTides, todayStart, maxHeight, minHeight)}
              fill="url(#tideGradient)"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Tide markers */}
        {todayTides.map((tide) => {
          const time = new Date(tide.time);
          const x = ((time.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)) * 100;
          const y = 100 - ((tide.height - minHeight) / (maxHeight - minHeight)) * 80 - 10;

          return (
            <div
              key={tide.time}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 ${tide.type === 'high' ? 'bg-cyan-400 border-cyan-600' : 'bg-blue-300 border-blue-500'}`}
              />
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
                <span
                  className={
                    tide.type === 'high'
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-blue-500 dark:text-blue-400'
                  }
                >
                  {tide.type === 'high' ? '▲' : '▼'} {tide.height.toFixed(1)}m
                </span>
              </div>
            </div>
          );
        })}

        {/* Current time marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${currentProgress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-500 font-medium">
            Now
          </div>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-6 text-xs text-gray-500 dark:text-gray-400">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour}>{formatHour(hour)}</span>
        ))}
        <span>12am</span>
      </div>
    </div>
  );
}

function generateTidePath(
  tides: TidePrediction[],
  dayStart: Date,
  maxH: number,
  minH: number,
): string {
  const points = tides.map((t) => {
    const time = new Date(t.time);
    const x = ((time.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000)) * 100;
    const y = 100 - ((t.height - minH) / (maxH - minH)) * 80 - 10;
    return { x, y };
  });

  if (points.length < 2) return '';

  // Create smooth curve through points
  let path = `M 0,90 L ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${cpx},${prev.y} ${curr.x},${curr.y}`;
  }
  path += ' L 100,90 L 0,90 Z';

  return path;
}
