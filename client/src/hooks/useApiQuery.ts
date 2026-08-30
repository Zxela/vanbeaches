import type { ApiResponse } from '@van-beaches/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiQuery<T>(url: string | null): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    controller.current?.abort();
    const id = ++requestId.current;

    if (!url) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const nextController = new AbortController();
    controller.current = nextController;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url, { signal: nextController.signal });
      const result: ApiResponse<T> = await response.json();
      if (id !== requestId.current) return;
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setData(null);
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      if (nextController.signal.aborted || id !== requestId.current) return;
      setData(null);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Never show one beach's conditions while another beach is loading.
    setData(null);
    setError(null);
    fetchData();
    return () => controller.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
