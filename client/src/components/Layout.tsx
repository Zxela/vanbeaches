import { BEACHES } from '@van-beaches/shared';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../hooks/useFavorites';
import { MobileBottomNav } from './MobileBottomNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
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
      if (e.key === 'd') toggleTheme();
      if (e.key === 'h') navigate('/');
      if (e.key === 'c') navigate('/compare');
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [toggleTheme, navigate]);

  const currentBeachId = location.pathname.startsWith('/beach/')
    ? location.pathname.split('/')[2]
    : null;
  const currentBeach = currentBeachId ? BEACHES.find((b) => b.id === currentBeachId) : null;

  const favoriteBeaches = BEACHES.filter((b) => favorites.includes(b.id));
  const otherBeaches = BEACHES.filter((b) => !favorites.includes(b.id));

  return (
    <div className="min-h-screen relative bg-sand-100 dark:bg-sand-900">
      {/* Vancouver background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1609825488888-3a766db05542?w=1920&q=80)',
        }}
      >
        {/* Overlay for readability - cool tones */}
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/30 via-ocean-800/20 to-shore-900/50 dark:from-ocean-900/60 dark:via-sand-900/40 dark:to-sand-900/80" />
      </div>

      {/* App container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="bg-white/90 dark:bg-sand-900/95 backdrop-blur-md text-sand-900 dark:text-sand-100 shadow-xl border-b border-ocean-200/30 dark:border-ocean-800/30">
          <div className="container mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <span className="text-3xl">🏖️</span>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-ocean-600 to-shore-500 bg-clip-text text-transparent">
                    Van Beaches
                  </h1>
                  <p className="text-sand-500 dark:text-sand-400 text-sm">
                    Vancouver Beach Conditions
                  </p>
                </div>
              </Link>
              <nav className="hidden sm:flex items-center gap-3">
                <Link
                  to="/compare"
                  className="px-3 py-2 bg-ocean-50 dark:bg-ocean-900/30 hover:bg-ocean-100 dark:hover:bg-ocean-800/40 rounded-lg transition-colors text-sm text-ocean-700 dark:text-ocean-300"
                >
                  Compare
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium shadow-md"
                  >
                    <span>{currentBeach?.name || 'Select Beach'}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-sand-800 rounded-xl shadow-2xl overflow-hidden border border-sand-200 dark:border-sand-700 max-h-96 overflow-y-auto"
                      style={{ zIndex: 9999 }}
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
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                currentBeachId === beach.id
                                  ? 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 font-medium'
                                  : 'text-sand-700 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700'
                              }`}
                            >
                              ⭐ {beach.name}
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
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              currentBeachId === beach.id
                                ? 'bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 font-medium'
                                : 'text-sand-700 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700'
                            }`}
                          >
                            {beach.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 bg-ocean-50 dark:bg-ocean-900/30 hover:bg-ocean-100 dark:hover:bg-ocean-800/40 rounded-lg transition-colors"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content with frosted glass effect */}
        <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 pb-24 sm:pb-6">
          <div className="bg-white/95 dark:bg-sand-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-ocean-100/50 dark:border-ocean-900/30">
            {children}
          </div>
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
