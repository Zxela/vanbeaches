import type { BeachSummary } from '@van-beaches/shared';
import { useApiQuery } from './useApiQuery';

export function useBeaches() {
  const { data, ...rest } = useApiQuery<BeachSummary[]>('/api/beaches');
  return { beaches: data ?? [], ...rest };
}
