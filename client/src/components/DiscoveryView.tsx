import type { Beach, BeachSummary } from '@van-beaches/shared';
import { List, Map as MapIcon, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [params, setParams] = useSearchParams();
  const viewMode: ViewMode = params.get('view') === 'map' ? 'map' : 'list';
  const query = params.get('q') ?? '';
  const favoritesOnly = params.get('favorites') === '1';
  function updateParam(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  const setQuery = (value: string) => updateParam('q', value);
  const setViewMode = (value: ViewMode) => updateParam('view', value);
  const { favorites } = useFavorites();
  const current = beaches[0] ? beachConditions[beaches[0].id]?.currentWeather : null;

  const visibleBeaches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return beaches
      .filter((beach) => !favoritesOnly || favorites.includes(beach.id))
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
  }, [beaches, favorites, query, favoritesOnly]);

  return (
    <div className="mx-auto max-w-3xl lg:max-w-6xl space-y-5 px-4 pb-10 sm:px-6">
      <header className="space-y-4 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            Discover
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-primary">
            Vancouver beaches
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live conditions for {beaches.length} Vancouver beaches
          </p>
        </div>

        <label className="relative block">
          <span className="sr-only">Search beaches</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search beaches"
            className="app-surface h-12 w-full rounded-2xl pl-11 pr-11 text-base outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-300/40 text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </header>

      <fieldset
        className="app-surface inline-grid grid-cols-2 rounded-xl p-1"
        aria-label="View mode"
      >
        <button
          type="button"
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
          className={
            viewMode === 'list'
              ? 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm bg-slate-700/80 text-blue-200'
              : 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted'
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
              ? 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm bg-slate-700/80 text-blue-200'
              : 'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted'
          }
        >
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          Map
        </button>
      </fieldset>

      <button
        type="button"
        aria-pressed={favoritesOnly}
        onClick={() => updateParam('favorites', favoritesOnly ? '' : '1')}
        className="ml-3 rounded-lg border border-divider px-3 text-sm text-primary"
      >
        Favorites
      </button>
      {!loading && !error && !query && !favoritesOnly && beaches[0] && current && (
        <section aria-label="Vancouver now" className="border-y border-divider py-4">
          <p className="text-sm text-muted">Vancouver now · {beaches[0].name}</p>
          <p className="mt-1 text-3xl font-semibold">
            {Math.round(current.temperature)}°
            <span className="ml-3 text-base font-normal capitalize">
              {current.condition.replaceAll('-', ' ')}
            </span>
          </p>
        </section>
      )}
      {/* Only results are replaced while fetching. */}
      {loading ? (
        <output className="block min-h-64 animate-pulse rounded-2xl bg-raised p-5">
          Loading beaches…
        </output>
      ) : error ? (
        <ErrorState message="Couldn't load beaches" onRetry={onRetry} />
      ) : viewMode === 'list' ? (
        <section aria-label="Beach list" data-testid="discovery-beach-list">
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                conditions={beachConditions[beach.id]}
                isFavorite={favorites.includes(beach.id)}
              />
            ))}
            {visibleBeaches.length === 0 && (
              <div className="app-surface rounded-2xl px-5 py-10 lg:col-span-2 text-center">
                <p className="font-semibold text-primary">No beaches found</p>
                <p className="mt-1 text-sm text-muted">Try another name or clear your search.</p>
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
