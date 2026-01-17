import { BEACHES } from '@van-beaches/shared';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../hooks/useFavorites';

export function MobileBottomNav() {
  const [isBeachesOpen, setIsBeachesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { theme, toggleTheme } = useTheme();

  const isHome = location.pathname === '/';
  const currentBeachId = location.pathname.startsWith('/beach/')
    ? location.pathname.split('/')[2]
    : null;

  const favoriteBeaches = BEACHES.filter((b) => favorites.includes(b.id));
  const otherBeaches = BEACHES.filter((b) => !favorites.includes(b.id));

  return (
    <>
      {/* Beach selector overlay */}
      {isBeachesOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setIsBeachesOpen(false)}
            aria-label="Close beach selector"
          />
          <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[70vh] overflow-y-auto z-40 sm:hidden">
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                Select Beach
              </h3>
            </div>

            {favoriteBeaches.length > 0 && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Favorites</p>
                {favoriteBeaches.map((beach) => (
                  <button
                    type="button"
                    key={beach.id}
                    onClick={() => {
                      navigate(`/beach/${beach.id}`);
                      setIsBeachesOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      currentBeachId === beach.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-2">⭐</span> {beach.name}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">All Beaches</p>
              {otherBeaches.map((beach) => (
                <button
                  type="button"
                  key={beach.id}
                  onClick={() => {
                    navigate(`/beach/${beach.id}`);
                    setIsBeachesOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    currentBeachId === beach.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {beach.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:hidden z-50">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center w-16 h-full ${
              isHome ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsBeachesOpen(!isBeachesOpen)}
            className={`flex flex-col items-center justify-center w-16 h-full ${
              isBeachesOpen || currentBeachId
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className="text-xl">🏖️</span>
            <span className="text-xs mt-1">Beaches</span>
          </button>

          <Link
            to="/compare"
            className={`flex flex-col items-center justify-center w-16 h-full ${
              location.pathname === '/compare'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-xs mt-1">Compare</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center w-16 h-full text-gray-500 dark:text-gray-400"
          >
            <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="text-xs mt-1">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
