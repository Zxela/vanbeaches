import { BEACHES } from '@van-beaches/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Moon, Star, Sun, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();

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
  const isBeachDetail = currentBeachId !== null;
  const currentBeach = currentBeachId ? BEACHES.find((b) => b.id === currentBeachId) : null;

  const favoriteBeaches = BEACHES.filter((b) => favorites.includes(b.id));
  const otherBeaches = BEACHES.filter((b) => !favorites.includes(b.id));

  return (
    <div className="app-canvas min-h-screen">
      <OfflineBanner />
      {/* App container */}
      <div className="min-h-screen flex flex-col">
        <header
          className={cn(
            'z-50 text-slate-900 dark:text-slate-100',
            isBeachDetail
              ? 'absolute inset-x-0 top-0 bg-transparent text-white dark:text-white'
              : 'sticky top-0 border-b border-white/60 bg-slate-50/65 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60',
          )}
        >
          <div className="container mx-auto max-w-7xl px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group">
                <motion.div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-950/15"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon icon={Waves} size="lg" className="text-white" />
                </motion.div>
                <div
                  className={cn(
                    'hidden sm:block',
                    isBeachDetail && '[&_h1]:text-white [&_p]:text-white/60',
                  )}
                >
                  <h1 className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent transition-all dark:from-blue-300 dark:to-sky-300">
                    Van Beaches
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Vancouver Beach Conditions
                  </p>
                </div>
              </Link>
              <nav className="flex items-center gap-3">
                <button
                  type="button"
                  data-testid="dark-mode-toggle"
                  onClick={toggleTheme}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isBeachDetail
                      ? 'bg-white/15 text-white backdrop-blur-xl hover:bg-white/25'
                      : 'app-surface text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80',
                  )}
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  <Icon icon={theme === 'light' ? Moon : Sun} size="sm" />
                </button>
                <Link
                  to="/discover"
                  className={cn(
                    'hidden rounded-lg px-3 py-2 text-sm transition-colors sm:block',
                    isBeachDetail
                      ? 'bg-white/15 text-white backdrop-blur-xl hover:bg-white/25'
                      : 'app-surface text-blue-700 hover:bg-white/80 dark:text-blue-300 dark:hover:bg-slate-800/80',
                  )}
                >
                  Discover
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <motion.button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-950/15 transition-colors hover:bg-blue-700"
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
                        className="app-surface absolute right-0 mt-2 max-h-96 w-56 overflow-y-auto rounded-xl shadow-2xl"
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
