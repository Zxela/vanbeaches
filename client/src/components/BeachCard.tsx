import type { Beach, BeachSummary } from '@van-beaches/shared';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { weatherTheme } from '../lib/weatherTheme';
import { computeSummaryVerdict } from '../utils/verdict';
import { VerdictBadge } from './VerdictBadge';

interface BeachCardProps {
  beach: Beach;
  conditions?: BeachSummary;
  isFavorite?: boolean;
}

function formatCondition(condition?: string) {
  if (!condition) return 'Conditions unavailable';
  return condition.charAt(0).toUpperCase() + condition.slice(1).replaceAll('-', ' ');
}

export function BeachCard({ beach, conditions, isFavorite = false }: BeachCardProps) {
  const weather = conditions?.currentWeather ?? null;
  const waterQuality = conditions?.waterQuality ?? 'unknown';
  const verdict = computeSummaryVerdict(weather, waterQuality);
  const background = weatherTheme(weather?.condition);

  return (
    <article className="group relative overflow-hidden rounded-2xl shadow-md shadow-slate-950/10 ring-1 ring-white/10">
      <Link
        to={`/beach/${beach.id}`}
        className={`relative flex min-h-32 items-stretch overflow-hidden weather-background ${background} p-5 text-white transition duration-200 hover:saturate-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-white/5" />
        <span className="relative flex min-w-0 flex-1 flex-col justify-between gap-5">
          <span>
            <span className="flex items-start gap-2">
              <span className="min-w-0 flex-1 text-xl font-semibold leading-tight tracking-tight">
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
          </span>
        </span>
        <span className="relative ml-3 flex w-24 shrink-0 text-right flex-col items-end">
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
