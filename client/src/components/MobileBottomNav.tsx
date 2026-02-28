import { Home, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Icon } from './ui';

export function MobileBottomNav() {
  const location = useLocation();

  const isDiscover = location.pathname === '/' || location.pathname === '/discover';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-sand-200 sm:hidden z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        <Link
          to="/discover"
          className={cn(
            'flex flex-col items-center justify-center w-20 h-full transition-colors',
            isDiscover ? 'text-ocean-600' : 'text-sand-500',
          )}
        >
          <Icon icon={Home} size="lg" />
          <span className="text-xs mt-1 font-medium">Home</span>
        </Link>

        <Link
          to="/discover"
          className={cn(
            'flex flex-col items-center justify-center w-20 h-full transition-colors',
            'text-sand-500',
          )}
        >
          <Icon icon={Map} size="lg" />
          <span className="text-xs mt-1 font-medium">Explore</span>
        </Link>
      </div>
    </nav>
  );
}
