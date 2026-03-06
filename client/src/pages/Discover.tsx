import { BEACHES } from '@van-beaches/shared';
import { useMemo } from 'react';
import { DiscoveryView } from '../components/DiscoveryView';
import { useBeaches } from '../hooks/useBeaches';

export function Discover() {
  const { beaches: beachSummaries, loading, error, refetch } = useBeaches();

  const beachConditions = useMemo(
    () => Object.fromEntries(beachSummaries.map((summary) => [summary.id, summary])),
    [beachSummaries],
  );

  const allBeaches = useMemo(() => BEACHES, []);

  return (
    <DiscoveryView
      beaches={allBeaches}
      beachConditions={beachConditions}
      loading={loading}
      error={error ?? undefined}
      onRetry={refetch}
    />
  );
}
