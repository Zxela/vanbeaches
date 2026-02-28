import type { TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { type BeachVerdict as BeachVerdictData, computeVerdict } from '../utils/verdict';

interface BeachVerdictProps {
  weather: WeatherForecast | null;
  tides: TideData | null;
  waterQuality: WaterQualityStatus | null;
  sunsetTime: string | null;
}

type RecommendationLevel = BeachVerdictData['recommendation'];

function getColorConfig(recommendation: RecommendationLevel): {
  badge: string;
  border: string;
  heading: string;
  bestTime: string;
  reasonBullet: string;
} {
  switch (recommendation) {
    case 'perfect':
      return {
        badge: 'bg-emerald-100 text-emerald-800',
        border: 'border-emerald-200',
        heading: 'text-emerald-700',
        bestTime: 'bg-emerald-50 text-emerald-800',
        reasonBullet: 'bg-emerald-400',
      };
    case 'good':
      return {
        badge: 'bg-ocean-100 text-ocean-800',
        border: 'border-ocean-200',
        heading: 'text-ocean-700',
        bestTime: 'bg-blue-50 text-blue-800',
        reasonBullet: 'bg-blue-400',
      };
    case 'fair':
      return {
        badge: 'bg-amber-100 text-amber-800',
        border: 'border-amber-200',
        heading: 'text-amber-700',
        bestTime: 'bg-amber-50 text-amber-800',
        reasonBullet: 'bg-amber-400',
      };
    case 'skip':
      return {
        badge: 'bg-red-100 text-red-800',
        border: 'border-red-200',
        heading: 'text-red-700',
        bestTime: 'bg-red-50 text-red-800',
        reasonBullet: 'bg-red-400',
      };
  }
}

function getRecommendationLabel(recommendation: RecommendationLevel): string {
  switch (recommendation) {
    case 'perfect':
      return 'Perfect';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'skip':
      return 'Skip it';
  }
}

export function BeachVerdict({ weather, tides, waterQuality, sunsetTime }: BeachVerdictProps) {
  if (!weather) return null;

  const verdict = computeVerdict(weather, tides, waterQuality, sunsetTime);
  const colors = getColorConfig(verdict.recommendation);
  const label = getRecommendationLabel(verdict.recommendation);

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${colors.border}`}>
      {/* Heading */}
      <h2 className={`font-display text-xl font-semibold mb-1 ${colors.heading}`}>
        Today's Verdict
      </h2>

      {/* Recommendation badge */}
      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-3 ${colors.badge}`}>
        {label}
      </span>

      {/* Summary prose */}
      <p className="text-sand-800 text-base leading-relaxed mb-4">
        {verdict.summary}
      </p>

      {/* Best time window */}
      <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 mb-4 ${colors.bestTime}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">Best time</span>
        <span className="text-sm font-medium">{verdict.bestTimeWindow}</span>
      </div>

      {/* Reasons */}
      {verdict.reasons.length > 0 && (
        <ul className="space-y-1.5">
          {verdict.reasons.map((reason) => (
            <li key={reason} className="flex items-center gap-2 text-sm text-sand-700">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.reasonBullet}`} />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
