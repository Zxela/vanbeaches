import { BEACHES } from '@van-beaches/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Star, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { MobileBottomNav } from './MobileBottomNav';
import { OfflineBanner } from './OfflineBanner';
import { Icon } from './ui';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useFavorites();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h') navigate('/');
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  const currentBeachId = location.pathname.startsWith('/beach/')
    ? location.pathname.split('/')[2]
    : null;
  const currentBeach = currentBeachId ? BEACHES.find((b) => b.id === currentBeachId) : null;

  const favoriteBeaches = BEACHES.filter((b) => favorites.includes(b.id));
  const otherBeaches = BEACHES.filter((b) => !favorites.includes(b.id));

  return (
    <div className="min-h-screen bg-sand-50 dark:bg-sand-900">
      <OfflineBanner />
      {/* App container */}
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-sand-900/95 backdrop-blur-md text-sand-900 dark:text-sand-100 shadow-xl border-b border-ocean-200/30 dark:border-ocean-800/30">
          <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-400 to-shore-500 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon icon={Waves} size="lg" className="text-white" />
                </motion.div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-ocean-600 to-shore-500 bg-clip-text text-transparent group-hover:from-ocean-500 group-hover:to-shore-400 transition-all">
                    Van Beaches
                  </h1>
                  <p className="text-sand-500 dark:text-sand-400 text-sm">
                    Vancouver Beach Conditions
                  </p>
                </div>
              </Link>
              <nav className="hidden sm:flex items-center gap-3">
                <Link
                  to="/discover"
                  className="px-3 py-2 bg-ocean-50 dark:bg-ocean-900/30 hover:bg-ocean-100 dark:hover:bg-ocean-800/40 rounded-lg transition-colors text-sm text-ocean-700 dark:text-ocean-300"
                >
                  Discover
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-md"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{currentBeach?.name || 'Select Beach'}</span>
                    <motion.span
                      animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Icon icon={ChevronDown} size="sm" className="text-white" />
                    </motion.span>
                  </motion.button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-sand-800 rounded-xl shadow-2xl overflow-hidden border border-sand-200 dark:border-sand-700 max-h-96 overflow-y-auto"
                        style={{ zIndex: 9999 }}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                      >
                        {favoriteBeaches.length > 0 && (
                          <div className="border-b border-sand-100 dark:border-sand-700">
                            <p className="px-4 py-2 text-xs text-sand-500 dark:text-sand-400 uppercase font-medium">
                              Favorites
                            </p>
                            {favoriteBeaches.map((beach) => (
                              <button
                                type="button"
                                key={beach.id}
                                onClick={() => {
                                  navigate(`/beach/${beach.id}`);
                                  setIsDropdownOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                                  currentBeachId === beach.id
                                    ? 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 font-medium'
                                    : 'text-sand-700 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700',
                                )}
                              >
                                <Icon
                                  icon={Star}
                                  size="xs"
                                  className="text-amber-400 fill-amber-400"
                                />
                                {beach.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="py-1">
                          {otherBeaches.map((beach) => (
                            <button
                              type="button"
                              key={beach.id}
                              onClick={() => {
                                navigate(`/beach/${beach.id}`);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                                currentBeachId === beach.id
                                  ? 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 font-medium'
                                  : 'text-sand-700 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700',
                              )}
                            >
                              {beach.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content - pages control their own containers */}
        <main className="flex-1 pb-24 sm:pb-6">{children}</main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
