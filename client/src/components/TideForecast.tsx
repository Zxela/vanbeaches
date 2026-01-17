import type { TidePrediction } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { cn, formatDateLabel, formatNumber, formatTideTime } from '../lib/utils';
import { Card, CardTitle, Icon } from './ui';

interface TideForecastProps {
  predictions: TidePrediction[];
  loading?: boolean;
  error?: string | null;
  className?: string;
}

interface DayForecast {
  date: string;
  label: string;
  tides: TidePrediction[];
  highMax: number;
  lowMin: number;
}

export function TideForecast({ predictions, loading, error, className }: TideForecastProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group predictions by day
  const dayForecasts = useMemo<DayForecast[]>(() => {
    const grouped: Record<string, TidePrediction[]> = {};

    for (const tide of predictions) {
      const date = new Date(tide.time).toDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(tide);
    }

    return Object.entries(grouped)
      .slice(0, 7) // Max 7 days
      .map(([date, tides]) => {
        const highs = tides.filter((t) => t.type === 'high').map((t) => t.height);
        const lows = tides.filter((t) => t.type === 'low').map((t) => t.height);
        return {
          date,
          label: formatDateLabel(tides[0].time),
          tides,
          highMax: highs.length > 0 ? Math.max(...highs) : 0,
          lowMin: lows.length > 0 ? Math.min(...lows) : 0,
        };
      });
  }, [predictions]);

  if (loading) {
    return (
      <Card variant="ocean" className={className}>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Calendar} size="lg" color="ocean" />
          Tide Forecast
        </CardTitle>
        <div className="mt-4 flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-32 h-36 shimmer rounded-xl"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="ocean" className={className}>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Calendar} size="lg" color="ocean" />
          Tide Forecast
        </CardTitle>
        <p className="mt-4 text-red-500 dark:text-red-400">{error}</p>
      </Card>
    );
  }

  if (dayForecasts.length === 0) {
    return (
      <Card variant="ocean" className={className}>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Calendar} size="lg" color="ocean" />
          Tide Forecast
        </CardTitle>
        <p className="mt-4 text-sand-500 dark:text-sand-400 text-center py-4">
          Tide forecast not available
        </p>
      </Card>
    );
  }

  return (
    <Card variant="ocean" padding="none" className={cn('overflow-hidden', className)}>
      <div className="p-4 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Calendar} size="lg" color="ocean" />
          Tide Forecast
        </CardTitle>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dayForecasts.map((day, index) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="snap-start"
          >
            <DayCard day={day} isToday={index === 0} />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

interface DayCardProps {
  day: DayForecast;
  isToday: boolean;
}

function DayCard({ day, isToday }: DayCardProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-36 rounded-xl p-3',
        'border transition-all duration-200',
        isToday
          ? 'bg-ocean-100 dark:bg-ocean-900/30 border-ocean-300 dark:border-ocean-700'
          : 'bg-white/50 dark:bg-sand-800/50 border-sand-200/50 dark:border-sand-700/50 hover:border-ocean-200 dark:hover:border-ocean-800',
      )}
    >
      {/* Day label */}
      <div className="text-center mb-3">
        <p
          className={cn(
            'text-xs font-medium uppercase tracking-wide',
            isToday ? 'text-ocean-600 dark:text-ocean-400' : 'text-sand-500 dark:text-sand-400',
          )}
        >
          {day.label}
        </p>
      </div>

      {/* Mini tide curve visualization */}
      <MiniTideCurve tides={day.tides} />

      {/* High/Low summary */}
      <div className="mt-3 space-y-1.5">
        {day.tides
          .filter((t) => t.type === 'high')
          .slice(0, 2)
          .map((tide) => (
            <div key={tide.time} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-tide-high">
                <Icon icon={TrendingUp} size="xs" />
                <span className="font-medium">{formatNumber(tide.height)}m</span>
              </span>
              <span className="text-sand-500 dark:text-sand-400">
                {formatTideTime(tide.time).replace(' ', '')}
              </span>
            </div>
          ))}
        {day.tides
          .filter((t) => t.type === 'low')
          .slice(0, 2)
          .map((tide) => (
            <div key={tide.time} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-tide-low">
                <Icon icon={TrendingDown} size="xs" />
                <span className="font-medium">{formatNumber(tide.height)}m</span>
              </span>
              <span className="text-sand-500 dark:text-sand-400">
                {formatTideTime(tide.time).replace(' ', '')}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

interface MiniTideCurveProps {
  tides: TidePrediction[];
}

function MiniTideCurve({ tides }: MiniTideCurveProps) {
  const width = 120;
  const height = 40;
  const padding = 4;

  const { path, fillPath, points } = useMemo(() => {
    if (tides.length < 2)
      return { path: '', fillPath: '', points: [] as { x: number; y: number; type: string }[] };

    const dayStart = new Date(tides[0].time);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const heights = tides.map((t) => t.height);
    const minH = Math.min(...heights) - 0.3;
    const maxH = Math.max(...heights) + 0.3;

    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const curvePoints: { x: number; y: number }[] = [];
    const markerPoints: { x: number; y: number; type: string }[] = [];

    // Generate smooth curve
    for (let i = 0; i <= chartWidth; i += 2) {
      const progress = i / chartWidth;
      const time = new Date(
        dayStart.getTime() + progress * (dayEnd.getTime() - dayStart.getTime()),
      );

      // Find surrounding tides and interpolate
      let height = tides[0].height;
      for (let j = 0; j < tides.length - 1; j++) {
        const t1 = new Date(tides[j].time).getTime();
        const t2 = new Date(tides[j + 1].time).getTime();
        const currentTime = time.getTime();
        if (currentTime >= t1 && currentTime <= t2) {
          const t = (currentTime - t1) / (t2 - t1);
          const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
          height = tides[j].height + (tides[j + 1].height - tides[j].height) * smoothT;
          break;
        }
        if (currentTime < t1) {
          height = tides[j].height;
          break;
        }
        height = tides[j + 1].height;
      }

      const x = padding + i;
      const y = padding + ((maxH - height) / (maxH - minH)) * chartHeight;
      curvePoints.push({ x, y });
    }

    // Mark high/low points
    for (const tide of tides) {
      const tideTime = new Date(tide.time).getTime();
      const progress = (tideTime - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime());
      if (progress >= 0 && progress <= 1) {
        const x = padding + progress * chartWidth;
        const y = padding + ((maxH - tide.height) / (maxH - minH)) * chartHeight;
        markerPoints.push({ x, y, type: tide.type });
      }
    }

    // Build SVG path
    let pathD = `M ${curvePoints[0].x} ${curvePoints[0].y}`;
    for (let i = 1; i < curvePoints.length; i++) {
      pathD += ` L ${curvePoints[i].x} ${curvePoints[i].y}`;
    }

    // Fill path (closes to bottom)
    const fillPathD = `${pathD} L ${curvePoints[curvePoints.length - 1].x} ${height} L ${curvePoints[0].x} ${height} Z`;

    return { path: pathD, fillPath: fillPathD, points: markerPoints };
  }, [tides]);

  if (!path) {
    return <div className="h-10 bg-sand-100 dark:bg-sand-700 rounded animate-pulse" />;
  }

  return (
    <svg width={width} height={height} className="block mx-auto" aria-hidden="true">
      <defs>
        <linearGradient id="miniTideGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className="text-ocean-500" />
          <stop
            offset="100%"
            stopColor="currentColor"
            stopOpacity="0.05"
            className="text-ocean-500"
          />
        </linearGradient>
      </defs>

      {/* Fill */}
      <path d={fillPath} fill="url(#miniTideGradient)" />

      {/* Curve */}
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-ocean-500"
      />

      {/* High/Low markers */}
      {points.map((point) => (
        <circle
          key={`${point.type}-${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r="2.5"
          fill={point.type === 'high' ? '#10b981' : '#06b6d4'}
        />
      ))}
    </svg>
  );
}
