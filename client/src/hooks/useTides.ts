import { useState, useEffect, useCallback } from 'react';
import type { TideData, ApiResponse } from '@van-beaches/shared';

interface UseTidesResult {
  tides: TideData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTides(beachId: string | undefined): UseTidesResult {
  const [tides, setTides] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTides = useCallback(async () => {
    if (!beachId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tides/' + beachId);
      const data: ApiResponse<TideData> = await response.json();
      if (data.success && data.data) {
        setTides(data.data);
      } else {
        setError(data.error || 'Failed to fetch tide data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [beachId]);

  useEffect(() => { fetchTides(); }, [fetchTides]);
  return { tides, loading, error, refetch: fetchTides };
}
