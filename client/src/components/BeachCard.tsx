import type { Beach, BeachSummary } from '@van-beaches/shared';
import { Heart, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeSummaryVerdict } from '../utils/verdict';
import { VerdictBadge } from './VerdictBadge';

interface BeachCardProps {
  beach: Beach;
  conditions?: BeachSummary;
  isFavorite?: boolean;
}

const conditionStyles: Record<string, string> = {
  sunny: 'from-sky-500 via-sky-600 to-blue-800',
  cloudy: 'from-slate-500 via-slate-600 to-slate-800',
  rainy: 'from-slate-600 via-blue-800 to-slate-950',
  stormy: 'from-slate-700 via-indigo-950 to-slate-950',
  foggy: 'from-slate-400 via-slate-500 to-slate-700',
  snowy: 'from-sky-300 via-slate-400 to-slate-600',
};

function formatCondition(condition?: string) {
  if (!condition) return 'Conditions unavailable';
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function formatTide(conditions?: BeachSummary) {
  if (!conditions?.nextTide) return null;
  const time = new Date(conditions.nextTide.time).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${conditions.nextTide.type === 'high' ? 'High' : 'Low'} tide ${time}`;
}

export function BeachCard({ beach, conditions, isFavorite = false }: BeachCardProps) {
  const weather = conditions?.currentWeather ?? null;
  const waterQuality = conditions?.waterQuality ?? 'unknown';
  const verdict = computeSummaryVerdict(weather, waterQuality);
  const tide = formatTide(conditions);
  const background = conditionStyles[weather?.condition ?? ''] ?? conditionStyles.cloudy;

  return (
    <article className="group relative overflow-hidden rounded-[1.35rem] shadow-sm ring-1 ring-black/5">
      <Link
        to={`/beach/${beach.id}`}
        className={`relative flex min-h-32 items-stretch overflow-hidden bg-gradient-to-br ${background} p-5 text-white transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2`}
      >
        <span className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <span className="relative flex min-w-0 flex-1 flex-col justify-between gap-5">
          <span>
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 font-display text-xl font-semibold leading-tight tracking-tight">
                {beach.name}
              </span>
              {isFavorite && (
                <Heart aria-label="Favorite" className="h-4 w-4 shrink-0 fill-white" />
              )}
            </span>
            <span className="mt-1 block text-sm text-white/80">Vancouver, BC</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-white/85">
            <VerdictBadge recommendation={verdict} size="sm" />
            {tide && (
              <span className="inline-flex items-center gap-1">
                <Waves className="h-3.5 w-3.5" aria-hidden="true" />
                {tide}
              </span>
            )}
          </span>
        </span>
        <span className="relative ml-4 flex shrink-0 flex-col items-end">
          <span className="text-4xl font-light tracking-tighter">
            {weather ? `${Math.round(weather.temperature)}°` : '—'}
          </span>
          <span className="mt-1 text-sm font-medium text-white/85">
            {formatCondition(weather?.condition)}
          </span>
        </span>
      </Link>
    </article>
  );
}
