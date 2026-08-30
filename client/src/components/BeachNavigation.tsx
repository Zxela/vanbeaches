import { BEACHES } from '@van-beaches/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeachNavigationProps {
  currentBeachId: string;
}

export function BeachNavigation({ currentBeachId }: BeachNavigationProps) {
  const sorted = [...BEACHES].sort((a, b) => a.name.localeCompare(b.name));
  const currentIndex = sorted.findIndex((b) => b.id === currentBeachId);
  const prev = sorted[(currentIndex - 1 + sorted.length) % sorted.length];
  const next = sorted[(currentIndex + 1) % sorted.length];

  return (
    <div className="flex items-center justify-between border-t border-white/15 px-4 py-6">
      <Link
        to={`/beach/${prev.id}`}
        data-testid="beach-nav-prev"
        className="flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
      >
        <ChevronLeft className="w-4 h-4" /> {prev.name}
      </Link>
      <Link
        to={`/beach/${next.id}`}
        data-testid="beach-nav-next"
        className="flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
      >
        {next.name} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
