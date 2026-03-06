import type { Beach, BeachSummary } from '@van-beaches/shared';
import { useState } from 'react';
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
    <div className="space-y-4 px-4 pb-8">
      {/* Tagline */}
      <p className="font-display text-lg font-semibold text-sand-900">
        Live conditions for Vancouver's 9 best beaches
      </p>

      {/* List/Map toggle */}
      <fieldset className="flex gap-2" aria-label="View mode">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
          className={
            viewMode === 'list'
              ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-ocean-600 text-white'
              : 'px-4 py-1.5 rounded-full text-sm font-medium bg-white text-sand-700 border border-sand-200'
          }
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          aria-pressed={viewMode === 'map'}
          className={
            viewMode === 'map'
              ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-ocean-600 text-white'
              : 'px-4 py-1.5 rounded-full text-sm font-medium bg-white text-sand-700 border border-sand-200'
          }
        >
          Map
        </button>
      </fieldset>

      {/* Content: beach list or map */}
      {viewMode === 'list' ? (
        <section aria-label="Beach list" data-testid="discovery-beach-list">
          <div className="divide-y divide-sand-100">
            {beaches.map((beach) => (
              <BeachCard key={beach.id} beach={beach} conditions={beachConditions[beach.id]} />
            ))}
          </div>
        </section>
      ) : (
        <BeachMap />
      )}
    </div>
  );
}
