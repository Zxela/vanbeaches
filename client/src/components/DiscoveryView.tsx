import type { Beach, BeachSummary } from '@van-beaches/shared';
import { List, Map as MapIcon, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { BeachCard } from './BeachCard';
import { BeachMap } from './BeachMap';
import { ErrorState } from './ErrorState';

interface DiscoveryViewProps {
  beaches: Beach[];
  beachConditions: Record<string, BeachSummary>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

type ViewMode = 'list' | 'map';

export function DiscoveryView({
  beaches,
  beachConditions,
  loading = false,
  error,
  onRetry,
}: DiscoveryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const { favorites } = useFavorites();

  const visibleBeaches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return beaches
      .filter((beach) =>
        normalizedQuery
          ? [beach.name, beach.tagline, beach.description].some((value) =>
              value?.toLocaleLowerCase().includes(normalizedQuery),
            )
          : true,
      )
      .sort((a, b) => {
        const aFavorite = favorites.includes(a.id);
        const bFavorite = favorites.includes(b.id);
        if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
        return beaches.indexOf(a) - beaches.indexOf(b);
      });
  }, [beaches, favorites, query]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 px-4 pb-8">
        <div className="h-6 bg-sand-200 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-full bg-sand-200" />
          <div className="h-8 w-20 rounded-full bg-sand-200" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-sand-200 rounded w-2/3" />
              <div className="h-3 bg-sand-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pb-8">
        <ErrorState message="Couldn't load beaches" onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 sm:px-6">
      <header className="space-y-4 pt-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Discover
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Vancouver beaches
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Live conditions for Vancouver's 9 best beaches
          </p>
        </div>

        <label className="relative block">
          <span className="sr-only">Search beaches</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-sand-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search beaches"
            className="app-surface h-12 w-full rounded-2xl pl-11 pr-11 text-base text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-300/40 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-sand-500 hover:bg-sand-100 hover:text-sand-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </header>

      <fieldset className="app-surface grid grid-cols-2 rounded-xl p-1" aria-label="View mode">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
          className={
            viewMode === 'list'
              ? 'flex items-center justify-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm dark:bg-slate-700/80 dark:text-blue-200'
              : 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300'
          }
        >
          <List className="h-4 w-4" aria-hidden="true" />
          List
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          aria-pressed={viewMode === 'map'}
          className={
            viewMode === 'map'
              ? 'flex items-center justify-center gap-2 rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm dark:bg-slate-700/80 dark:text-blue-200'
              : 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300'
          }
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          Map
        </button>
      </fieldset>

      {/* Content: beach list or map */}
      {viewMode === 'list' ? (
        <section aria-label="Beach list" data-testid="discovery-beach-list">
          <div className="space-y-3">
            {visibleBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                conditions={beachConditions[beach.id]}
                isFavorite={favorites.includes(beach.id)}
              />
            ))}
            {visibleBeaches.length === 0 && (
              <div className="app-surface rounded-2xl px-5 py-10 text-center">
                <p className="font-semibold text-slate-900 dark:text-white">No beaches found</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Try another name or clear your search.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <BeachMap beaches={visibleBeaches} />
      )}
    </div>
  );
}
