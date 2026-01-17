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

  const { maxHeight, minHeight, yAxisLabels } = useMemo(() => {
    if (todayTides.length === 0) return { maxHeight: 5, minHeight: 0, yAxisLabels: [5, 2.5, 0] };
    const heights = todayTides.map((t) => t.height);
    const max = Math.ceil(Math.max(...heights, 4));
    const min = Math.floor(Math.min(...heights, 0));
    const mid = (max + min) / 2;
    return {
      maxHeight: max,
      minHeight: min,
      yAxisLabels: [max, mid, min],
    };
  }, [todayTides]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-4">Today's Tides</h3>
        <div className="animate-pulse h-40 bg-ocean-100 dark:bg-sand-700 rounded" />
      </div>
    );
  }

  if (todayTides.length === 0) {
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-4">Today's Tides</h3>
        <p className="text-sand-500 dark:text-sand-400">No tide data available</p>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  return (
    <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
      <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-4">Today's Tides</h3>

      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-40 pr-2 text-xs text-sand-500 dark:text-sand-400 font-mono">
          {yAxisLabels.map((label) => (
            <span key={label} className="text-right w-8">
              {label.toFixed(1)}m
            </span>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1 relative h-40">
          {/* Horizontal grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {yAxisLabels.map((_, i) => (
              <div key={i} className="border-t border-ocean-200/50 dark:border-sand-700 w-full" />
            ))}
          </div>

          {/* Vertical grid lines */}
          <div className="absolute inset-0 flex justify-between">
            {[0, 6, 12, 18, 24].map((hour) => (
              <div key={hour} className="border-l border-ocean-200/50 dark:border-sand-700 h-full" />
            ))}
          </div>

          {/* Tide curve */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00bcd4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#009688" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {todayTides.length >= 2 && (
              <path
                d={generateTidePath(todayTides, todayStart, maxHeight, minHeight)}
                fill="url(#tideGradient)"
                stroke="#00acc1"
                strokeWidth="2.5"
              />
            )}
          </svg>

          {/* Tide markers */}
          {todayTides.map((tide) => {
            const time = new Date(tide.time);
            const x = ((time.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)) * 100;
            const y = 100 - ((tide.height - minHeight) / (maxHeight - minHeight)) * 100;

            return (
              <div
                key={tide.time}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 shadow-md ${tide.type === 'high' ? 'bg-shore-400 border-shore-600' : 'bg-ocean-400 border-ocean-600'}`}
                />
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-white/90 dark:bg-sand-800/90 px-1.5 py-0.5 rounded shadow-sm">
                  <span
                    className={`font-medium ${
                      tide.type === 'high'
                        ? 'text-shore-600 dark:text-shore-400'
                        : 'text-ocean-600 dark:text-ocean-400'
                    }`}
                  >
                    {tide.type === 'high' ? '▲' : '▼'} {tide.height.toFixed(1)}m
                  </span>
                </div>
              </div>
            );
          })}

          {/* Current time marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${currentProgress}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-sand-800 shadow-md" />
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-500 dark:text-red-400 font-semibold bg-white/90 dark:bg-sand-800/90 px-1.5 py-0.5 rounded shadow-sm">
              Now
            </div>
          </div>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex mt-6 text-xs text-sand-500 dark:text-sand-400">
        <div className="w-10" /> {/* Spacer for y-axis */}
        <div className="flex-1 flex justify-between">
          {[0, 6, 12, 18].map((hour) => (
            <span key={hour}>{formatHour(hour)}</span>
          ))}
          <span>12am</span>
        </div>
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
