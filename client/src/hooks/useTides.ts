import type { TideData } from '@van-beaches/shared';
import { useApiQuery } from './useApiQuery';

export function useTides(beachId: string | undefined) {
  const { data: tides, ...rest } = useApiQuery<TideData>(
    beachId ? `/api/tides/${beachId}` : null,
  );
  return { tides, ...rest };
}
