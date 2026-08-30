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
  sunny: 'from-[#25679d] via-[#397ba8] to-[#6697b6]',
  'partly-cloudy': 'from-[#405f7b] via-[#55758e] to-[#7893a6]',
  cloudy: 'from-[#4b6174] via-[#607588] to-[#8193a1]',
  rainy: 'from-[#293f57] via-[#3b536a] to-[#587086]',
  stormy: 'from-[#17283e] via-[#2b3d55] to-[#43576e]',
  foggy: 'from-[#5d7180] via-[#718491] to-[#8e9da6]',
  snowy: 'from-[#52758d] via-[#7392a4] to-[#9aadb8]',
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
    <article className="group relative overflow-hidden rounded-[1.35rem] shadow-md shadow-slate-950/10 ring-1 ring-white/40 dark:ring-white/10">
      <Link
        to={`/beach/${beach.id}`}
        className={`relative flex min-h-32 items-stretch overflow-hidden bg-gradient-to-br ${background} p-5 text-white transition duration-200 hover:saturate-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-slate-950/10 via-transparent to-white/5" />
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
