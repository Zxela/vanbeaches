import type { BeachVerdict } from '../utils/verdict';

type RecommendationLevel = BeachVerdict['recommendation'];

interface VerdictBadgeProps {
  recommendation: RecommendationLevel;
  size?: 'sm' | 'md';
}

function getBadgeColors(recommendation: RecommendationLevel): string {
  switch (recommendation) {
    case 'perfect':
      return 'bg-emerald-100 text-emerald-800';
    case 'good':
      return 'bg-ocean-100 text-ocean-800';
    case 'fair':
      return 'bg-amber-100 text-amber-800';
    case 'skip':
      return 'bg-red-100 text-red-800';
  }
}

function getLabel(recommendation: RecommendationLevel): string {
  switch (recommendation) {
    case 'perfect':
      return 'Perfect';
    case 'good':
      return 'Good';
    case 'fair':
      return 'Fair';
    case 'skip':
      return 'Skip';
  }
}

export function VerdictBadge({ recommendation, size = 'sm' }: VerdictBadgeProps) {
  const colors = getBadgeColors(recommendation);
  const label = getLabel(recommendation);

  const sizeClasses =
    size === 'md'
      ? 'text-sm font-semibold px-3 py-1 rounded-full'
      : 'text-xs font-semibold px-2 py-0.5 rounded-full';

  return (
    <span className={`inline-block ${sizeClasses} ${colors}`}>{label}</span>
  );
}

export function VerdictBadgeSkeleton({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses =
    size === 'md' ? 'h-6 w-14 rounded-full' : 'h-5 w-12 rounded-full';

  return <span className={`inline-block animate-pulse bg-sand-200 ${sizeClasses}`} />;
}
