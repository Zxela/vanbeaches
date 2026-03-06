import type { Beach, BeachSummary } from '@van-beaches/shared';
import { Link } from 'react-router-dom';
import { computeSummaryVerdict } from '../utils/verdict';
import { VerdictBadge } from './VerdictBadge';

interface BeachCardProps {
  beach: Beach;
  conditions?: BeachSummary;
  isFavorite?: boolean;
}

export function BeachCard({ beach, conditions }: BeachCardProps) {
  const weather = conditions?.currentWeather ?? null;
  const waterQuality = conditions?.waterQuality ?? 'unknown';
  const verdict = computeSummaryVerdict(weather, waterQuality);

  return (
    <div className="group relative">
      <Link
        to={`/beach/${beach.id}`}
        className="flex items-center gap-3 py-3 px-1 hover:bg-sand-50 transition-colors"
      >
        {/* Beach name */}
        <span className="flex-1 min-w-0 font-display text-sm font-semibold text-sand-900 leading-tight truncate">
          {beach.name}
        </span>

        {/* Verdict badge */}
        <VerdictBadge recommendation={verdict} size="sm" />

        {/* Temperature */}
        {weather && (
          <span className="text-xs font-semibold text-ocean-700 shrink-0">
            {weather.temperature}&deg;C
          </span>
        )}
      </Link>
    </div>
  );
}
