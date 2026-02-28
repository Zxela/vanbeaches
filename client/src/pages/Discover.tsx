import { BEACHES } from '@van-beaches/shared';
import { useMemo } from 'react';
import { DiscoveryView } from '../components/DiscoveryView';
import { FavoritesView } from '../components/FavoritesView';
import { useBeaches } from '../hooks/useBeaches';
import { useFavorites } from '../hooks/useFavorites';

export function Discover() {
  const { beaches: beachSummaries, loading } = useBeaches();
  const { favorites: favoriteIds } = useFavorites();

  // Build a record of BeachSummary conditions keyed by beach ID
  const beachConditions = useMemo(
    () =>
      Object.fromEntries(beachSummaries.map((summary) => [summary.id, summary])),
    [beachSummaries],
  );

  // Build Beach[] from the static BEACHES registry
  const allBeaches = useMemo(() => BEACHES, []);

  // Get full Beach objects for the user's favorites
  const favoriteBeaches = useMemo(
    () => allBeaches.filter((beach) => favoriteIds.includes(beach.id)),
    [allBeaches, favoriteIds],
  );

  if (favoriteIds.length > 0) {
    return (
      <FavoritesView
        favorites={favoriteBeaches}
        beachData={{}}
        loading={loading}
      />
    );
  }

  return (
    <DiscoveryView
      beaches={allBeaches}
      beachConditions={beachConditions}
      loading={loading}
    />
  );
}
