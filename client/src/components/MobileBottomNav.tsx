import { BEACHES } from '@van-beaches/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Home, Moon, Star, Sun, Waves } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { Icon } from './ui';

export function MobileBottomNav() {
  const [isBeachesOpen, setIsBeachesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();

  const isDiscover = location.pathname === '/' || location.pathname === '/discover';
  const currentBeachId = location.pathname.startsWith('/beach/')
    ? location.pathname.split('/')[2]
    : null;

  const favoriteBeaches = BEACHES.filter((b) => favorites.includes(b.id));
  const otherBeaches = BEACHES.filter((b) => !favorites.includes(b.id));

  return (
    <>
      {/* Beach selector overlay */}
      <AnimatePresence>
        {isBeachesOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => setIsBeachesOpen(false)}
              aria-label="Close beach selector"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed bottom-16 left-0 right-0 bg-white/95 dark:bg-sand-800/95 backdrop-blur-xl rounded-t-2xl max-h-[70vh] overflow-y-auto z-40 sm:hidden border-t border-sand-200 dark:border-sand-700"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="sticky top-0 bg-white/95 dark:bg-sand-800/95 backdrop-blur-xl p-4 border-b border-sand-200 dark:border-sand-700">
                <div className="w-12 h-1 bg-sand-300 dark:bg-sand-600 rounded-full mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 text-center flex items-center justify-center gap-2">
                  <Icon icon={Waves} size="md" color="ocean" />
                  Select Beach
                </h3>
              </div>

              {favoriteBeaches.length > 0 && (
                <div className="p-4 border-b border-sand-200 dark:border-sand-700">
                  <p className="text-xs text-sand-500 dark:text-sand-400 uppercase font-medium mb-2">
                    Favorites
                  </p>
                  {favoriteBeaches.map((beach) => (
                    <button
                      type="button"
                      key={beach.id}
                      onClick={() => {
                        navigate(`/beach/${beach.id}`);
                        setIsBeachesOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-center gap-2',
                        currentBeachId === beach.id
                          ? 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 font-medium'
                          : 'text-sand-700 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700',
                      )}
                    >
                      <Icon icon={Star} size="sm" className="text-amber-400 fill-amber-400" />
                      {beach.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-4">
                <p className="text-xs text-sand-500 dark:text-sand-400 uppercase font-medium mb-2">
                  All Beaches
                </p>
                {otherBeaches.map((beach) => (
                  <button
                    type="button"
                    key={beach.id}
                    onClick={() => {
                      navigate(`/beach/${beach.id}`);
                      setIsBeachesOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors',
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
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-sand-800/95 backdrop-blur-xl border-t border-sand-200 dark:border-sand-700 sm:hidden z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/discover"
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full transition-colors',
              isDiscover
                ? 'text-ocean-600 dark:text-ocean-400'
                : 'text-sand-500 dark:text-sand-400',
            )}
          >
            <Icon icon={Home} size="lg" />
            <span className="text-xs mt-1 font-medium">Discover</span>
          </Link>

          <motion.button
            type="button"
            onClick={() => setIsBeachesOpen(!isBeachesOpen)}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full transition-colors',
              isBeachesOpen || currentBeachId
                ? 'text-ocean-600 dark:text-ocean-400'
                : 'text-sand-500 dark:text-sand-400',
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Icon icon={Waves} size="lg" />
            <span className="text-xs mt-1 font-medium">Beaches</span>
          </motion.button>

          <Link
            to="/compare"
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full transition-colors',
              location.pathname === '/compare'
                ? 'text-ocean-600 dark:text-ocean-400'
                : 'text-sand-500 dark:text-sand-400',
            )}
          >
            <Icon icon={BarChart3} size="lg" />
            <span className="text-xs mt-1 font-medium">Compare</span>
          </Link>

          <motion.button
            type="button"
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center w-16 h-full text-sand-500 dark:text-sand-400 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon icon={Sun} size="lg" color="warning" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon icon={Moon} size="lg" />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="text-xs mt-1 font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
}
