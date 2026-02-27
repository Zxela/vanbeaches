import type { WaterQualityStatus } from '@van-beaches/shared';
import { useApiQuery } from './useApiQuery';

export function useWaterQuality(beachId: string | undefined) {
  const { data: waterQuality, ...rest } = useApiQuery<WaterQualityStatus>(
    beachId ? `/api/water-quality/${beachId}` : null,
  );
  return { waterQuality, ...rest };
}
