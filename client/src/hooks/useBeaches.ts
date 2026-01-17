import { useState, useEffect, useCallback } from 'react';
import type { BeachSummary, ApiResponse } from '@van-beaches/shared';

export function useBeaches() {
  const [beaches, setBeaches] = useState<BeachSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBeaches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beaches');
      const data: ApiResponse<BeachSummary[]> = await response.json();
      if (data.success && data.data) setBeaches(data.data);
      else setError(data.error || 'Failed to fetch beaches');
    } catch (err) { setError(err instanceof Error ? err.message : 'Network error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBeaches(); }, [fetchBeaches]);
  return { beaches, loading, error, refetch: fetchBeaches };
}
