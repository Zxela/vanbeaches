import { Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Icon } from './ui';

export function MobileBottomNav() {
  const location = useLocation();

  const isDiscover = location.pathname === '/' || location.pathname === '/discover';
  const isBeachDetail = location.pathname.startsWith('/beach/');

  return (
    <nav
      className={cn(
        'safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl sm:hidden',
        isBeachDetail
          ? 'border-white/15 bg-slate-950/35 text-white'
          : 'border-white/60 bg-slate-50/75 dark:border-white/10 dark:bg-slate-950/75',
      )}
    >
      <div className="flex items-center justify-center h-16">
        <Link
          to="/discover"
          className={cn(
            'flex flex-col items-center justify-center w-20 h-full transition-colors',
            isDiscover
              ? 'text-blue-600 dark:text-blue-300'
              : isBeachDetail
                ? 'text-white/75'
                : 'text-slate-500',
          )}
        >
          <Icon icon={Home} size="lg" />
          <span className="text-xs mt-1 font-medium">Home</span>
        </Link>
      </div>
    </nav>
  );
}
