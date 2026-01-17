import type { ApiResponse, WaterQualityStatus } from '@van-beaches/shared';
import { useCallback, useEffect, useState } from 'react';

export function useWaterQuality(beachId: string | undefined) {
  const [waterQuality, setWaterQuality] = useState<WaterQualityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!beachId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/water-quality/${beachId}`);
      const data: ApiResponse<WaterQualityStatus> = await response.json();
      if (data.success && data.data) setWaterQuality(data.data);
      else setError(data.error || 'Failed to fetch water quality');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [beachId]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);
  return { waterQuality, loading, error, refetch: fetch_ };
}
