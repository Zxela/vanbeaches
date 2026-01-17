import type { TidePrediction } from '@van-beaches/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clamp, cn, formatNumber, formatTideTime, mapRange } from '../lib/utils';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface TideCanvasProps {
  predictions: TidePrediction[];
  loading?: boolean;
  className?: string;
}

interface TooltipData {
  x: number;
  y: number;
  time: Date;
  height: number;
  type?: 'high' | 'low';
}

// Canvas configuration
const CANVAS_CONFIG = {
  padding: { top: 30, right: 20, bottom: 40, left: 50 },
  gridLines: { horizontal: 5, vertical: 5 },
  colors: {
    light: {
      curve: '#00acc1',
      curveGlow: 'rgba(0, 172, 193, 0.3)',
      gradientTop: 'rgba(0, 188, 212, 0.4)',
      gradientBottom: 'rgba(0, 150, 136, 0.05)',
      grid: 'rgba(0, 0, 0, 0.06)',
      text: '#616161',
      now: '#ef4444',
      nowGlow: 'rgba(239, 68, 68, 0.4)',
      high: '#10b981',
      low: '#06b6d4',
    },
    dark: {
      curve: '#26c6da',
      curveGlow: 'rgba(38, 198, 218, 0.3)',
      gradientTop: 'rgba(0, 188, 212, 0.3)',
      gradientBottom: 'rgba(0, 150, 136, 0.02)',
      grid: 'rgba(255, 255, 255, 0.08)',
      text: '#9e9e9e',
      now: '#f87171',
      nowGlow: 'rgba(248, 113, 113, 0.4)',
      high: '#34d399',
      low: '#22d3ee',
    },
  },
};

export function TideCanvas({ predictions, loading, className }: TideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Get today's data
  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    [now],
  );
  const todayEnd = useMemo(
    () => new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
    [todayStart],
  );

  const todayTides = useMemo(() => {
    return predictions.filter((t) => {
      const time = new Date(t.time);
      return time >= todayStart && time < todayEnd;
    });
  }, [predictions, todayStart, todayEnd]);

  // Calculate height bounds with padding
  const { minHeight, maxHeight } = useMemo(() => {
    if (todayTides.length === 0) return { minHeight: 0, maxHeight: 5 };
    const heights = todayTides.map((t) => t.height);
    const min = Math.floor(Math.min(...heights) - 0.5);
    const max = Math.ceil(Math.max(...heights) + 0.5);
    return { minHeight: Math.max(0, min), maxHeight: max };
  }, [todayTides]);

  // Current time progress (0-1)
  const currentProgress = useMemo(() => {
    const elapsed = now.getTime() - todayStart.getTime();
    const total = 24 * 60 * 60 * 1000;
    return clamp(elapsed / total, 0, 1);
  }, [now, todayStart]);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height: Math.max(height, 180) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Animate curve on mount
  useEffect(() => {
    if (loading || todayTides.length === 0) return;

    let start: number | null = null;
    const duration = 800;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      setAnimationProgress(eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [loading, todayTides.length]);

  // Interpolate tide height at any time using catmull-rom spline
  const getHeightAtTime = useCallback(
    (targetTime: Date): number => {
      if (todayTides.length === 0) return 0;
      if (todayTides.length === 1) return todayTides[0].height;

      const targetMs = targetTime.getTime();

      // Find surrounding points
      let before = todayTides[0];
      let after = todayTides[todayTides.length - 1];

      for (let i = 0; i < todayTides.length - 1; i++) {
        const t1 = new Date(todayTides[i].time).getTime();
        const t2 = new Date(todayTides[i + 1].time).getTime();
        if (targetMs >= t1 && targetMs <= t2) {
          before = todayTides[i];
          after = todayTides[i + 1];
          break;
        }
      }

      const t1 = new Date(before.time).getTime();
      const t2 = new Date(after.time).getTime();
      const t = (targetMs - t1) / (t2 - t1);

      // Smooth sinusoidal interpolation for tides
      const smoothT = (1 - Math.cos(t * Math.PI)) / 2;
      return before.height + (after.height - before.height) * smoothT;
    },
    [todayTides],
  );

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || dimensions.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const { padding, colors } = CANVAS_CONFIG;
    const theme = isDark ? colors.dark : colors.light;
    const chartWidth = dimensions.width - padding.left - padding.right;
    const chartHeight = dimensions.height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines (every 6 hours)
    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (chartWidth / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = theme.text;
    ctx.font = '11px Inter, system-ui';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = maxHeight - ((maxHeight - minHeight) / 4) * i;
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(`${value.toFixed(1)}m`, padding.left - 8, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const timeLabels = ['12am', '6am', '12pm', '6pm', '12am'];
    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (chartWidth / 4) * i;
      ctx.fillText(timeLabels[i], x, dimensions.height - 10);
    }

    if (todayTides.length === 0) return;

    // Generate smooth curve points
    const curvePoints: { x: number; y: number }[] = [];
    const steps = Math.floor(chartWidth * animationProgress);

    for (let i = 0; i <= steps; i++) {
      const progress = i / chartWidth;
      const time = new Date(todayStart.getTime() + progress * 24 * 60 * 60 * 1000);
      const height = getHeightAtTime(time);
      const x = padding.left + progress * chartWidth;
      const y = padding.top + mapRange(height, maxHeight, minHeight, 0, chartHeight);
      curvePoints.push({ x, y });
    }

    if (curvePoints.length < 2) return;

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, theme.gradientTop);
    gradient.addColorStop(1, theme.gradientBottom);

    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, padding.top + chartHeight);
    for (const p of curvePoints) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw curve with glow
    ctx.shadowColor = theme.curveGlow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 1; i < curvePoints.length; i++) {
      ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
    }
    ctx.strokeStyle = theme.curve;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw "now" indicator
    if (animationProgress >= currentProgress) {
      const nowX = padding.left + currentProgress * chartWidth;
      const nowHeight = getHeightAtTime(now);
      const nowY = padding.top + mapRange(nowHeight, maxHeight, minHeight, 0, chartHeight);

      // Vertical line
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = theme.now;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(nowX, padding.top);
      ctx.lineTo(nowX, padding.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glow circle
      ctx.shadowColor = theme.nowGlow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(nowX, nowY, 6, 0, Math.PI * 2);
      ctx.fillStyle = theme.now;
      ctx.fill();
      ctx.shadowBlur = 0;

      // White inner circle
      ctx.beginPath();
      ctx.arc(nowX, nowY, 3, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#1f2937' : '#ffffff';
      ctx.fill();
    }

    // Draw high/low markers
    for (const tide of todayTides) {
      const tideTime = new Date(tide.time);
      const tideProgress = (tideTime.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000);

      if (tideProgress <= animationProgress) {
        const x = padding.left + tideProgress * chartWidth;
        const y = padding.top + mapRange(tide.height, maxHeight, minHeight, 0, chartHeight);

        // Marker circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = tide.type === 'high' ? theme.high : theme.low;
        ctx.fill();
        ctx.strokeStyle = isDark ? '#1f2937' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [
    dimensions,
    isDark,
    todayTides,
    todayStart,
    minHeight,
    maxHeight,
    getHeightAtTime,
    animationProgress,
    currentProgress,
    now,
  ]);

  // Redraw on changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle mouse/touch interaction
  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || todayTides.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const { padding } = CANVAS_CONFIG;
      const chartWidth = dimensions.width - padding.left - padding.right;
      const chartHeight = dimensions.height - padding.top - padding.bottom;

      // Check if within chart area
      if (
        x < padding.left ||
        x > dimensions.width - padding.right ||
        y < padding.top ||
        y > padding.top + chartHeight
      ) {
        setTooltip(null);
        return;
      }

      const progress = (x - padding.left) / chartWidth;
      const time = new Date(todayStart.getTime() + progress * 24 * 60 * 60 * 1000);
      const height = getHeightAtTime(time);

      // Check if near a high/low marker
      let nearestTide: TidePrediction | undefined;
      for (const tide of todayTides) {
        const tideTime = new Date(tide.time);
        const tideProgress = (tideTime.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000);
        const tideX = padding.left + tideProgress * chartWidth;
        if (Math.abs(x - tideX) < 20) {
          nearestTide = tide;
        }
      }

      setTooltip({
        x,
        y: padding.top + mapRange(height, maxHeight, minHeight, 0, chartHeight),
        time,
        height,
        type: nearestTide?.type,
      });
    },
    [dimensions, todayStart, todayTides, getHeightAtTime, minHeight, maxHeight],
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseLeave = () => setTooltip(null);
  const handleTouchEnd = () => setTooltip(null);

  if (loading) {
    return (
      <Card variant="ocean" className={className}>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Waves} size="lg" color="ocean" />
          Today's Tides
        </CardTitle>
        <CardContent className="mt-4">
          <div className="h-[180px] shimmer rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (todayTides.length === 0) {
    return (
      <Card variant="ocean" className={className}>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Waves} size="lg" color="ocean" />
          Today's Tides
        </CardTitle>
        <CardContent className="mt-4">
          <p className="text-sand-500 dark:text-sand-400 text-center py-8">
            No tide data available for today
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="ocean" padding="none" className={cn('overflow-hidden', className)}>
      <div className="p-4 pb-0">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon icon={Waves} size="lg" color="ocean" />
            Today's Tides
          </span>
          <div className="flex items-center gap-3 text-sm">
            {todayTides
              .filter((t) => t.type === 'high')
              .slice(0, 1)
              .map((t) => (
                <span key={t.time} className="flex items-center gap-1 text-tide-high">
                  <Icon icon={TrendingUp} size="sm" />
                  <span className="font-medium">{formatNumber(t.height)}m</span>
                  <span className="text-sand-500 dark:text-sand-400 text-xs">
                    {formatTideTime(t.time)}
                  </span>
                </span>
              ))}
            {todayTides
              .filter((t) => t.type === 'low')
              .slice(0, 1)
              .map((t) => (
                <span key={t.time} className="flex items-center gap-1 text-tide-low">
                  <Icon icon={TrendingDown} size="sm" />
                  <span className="font-medium">{formatNumber(t.height)}m</span>
                  <span className="text-sand-500 dark:text-sand-400 text-xs">
                    {formatTideTime(t.time)}
                  </span>
                </span>
              ))}
          </div>
        </CardTitle>
      </div>

      <div
        ref={containerRef}
        className="relative h-[200px] touch-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: dimensions.width, height: dimensions.height }}
        />

        {/* Tooltip */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute pointer-events-none z-10',
                'bg-white dark:bg-sand-800 rounded-lg shadow-lg',
                'border border-sand-200 dark:border-sand-700',
                'px-3 py-2 text-sm',
              )}
              style={{
                left: clamp(tooltip.x - 60, 10, dimensions.width - 130),
                top: Math.max(tooltip.y - 60, 10),
              }}
            >
              <div className="font-medium text-sand-900 dark:text-sand-100">
                {tooltip.time.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>
              <div
                className={cn(
                  'text-lg font-bold',
                  tooltip.type === 'high' && 'text-tide-high',
                  tooltip.type === 'low' && 'text-tide-low',
                  !tooltip.type && 'text-ocean-600 dark:text-ocean-400',
                )}
              >
                {formatNumber(tooltip.height)}m
                {tooltip.type && (
                  <span className="text-xs font-normal ml-1">
                    {tooltip.type === 'high' ? 'HIGH' : 'LOW'}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crosshair */}
        {tooltip && (
          <div
            className="absolute w-px bg-ocean-400/50 dark:bg-ocean-500/50 pointer-events-none"
            style={{
              left: tooltip.x,
              top: CANVAS_CONFIG.padding.top,
              height: dimensions.height - CANVAS_CONFIG.padding.top - CANVAS_CONFIG.padding.bottom,
            }}
          />
        )}
      </div>
    </Card>
  );
}
