import { BEACHES } from '@van-beaches/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeachNavigationProps {
  currentBeachId: string;
}

export function BeachNavigation({ currentBeachId }: BeachNavigationProps) {
  const sorted = [...BEACHES].sort((a, b) => a.name.localeCompare(b.name));
  const currentIndex = sorted.findIndex(b => b.id === currentBeachId);
  const prev = sorted[(currentIndex - 1 + sorted.length) % sorted.length];
  const next = sorted[(currentIndex + 1) % sorted.length];

  return (
    <div className="flex justify-between items-center py-6 px-4 border-t border-sand-200 dark:border-sand-700">
      <Link to={`/beach/${prev.id}`} data-testid="beach-nav-prev" className="flex items-center gap-1 text-sm text-ocean-600 dark:text-ocean-400 hover:text-ocean-700">
        <ChevronLeft className="w-4 h-4" /> {prev.name}
      </Link>
      <Link to={`/beach/${next.id}`} data-testid="beach-nav-next" className="flex items-center gap-1 text-sm text-ocean-600 dark:text-ocean-400 hover:text-ocean-700">
        {next.name} <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
