import { type EnvironmentData, isEnvironmentData } from '@van-beaches/shared';
import { useEffect, useState } from 'react';

// This cache survives beach navigation; localStorage preserves last-good data across reloads.
const memory = new Map<string, EnvironmentData>();
function saved(id: string): EnvironmentData | null {
  if (memory.has(id)) return memory.get(id) ?? null;
  try {
    const value = JSON.parse(localStorage.getItem(`coast-environment:${id}`) ?? 'null');
    if (isEnvironmentData(value) && value.beachId === id) return value;
  } catch {
    /* Storage may be disabled. */
  }
  return null;
}

export function useEnvironment(beachId: string) {
  const [result, setResult] = useState<{ data: EnvironmentData | null; offline: boolean }>({
    data: saved(beachId),
    offline: false,
  });
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    setResult({ data: saved(beachId), offline: false });
    const refresh = async () => {
      if (document.hidden) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 15000);
      try {
        const response = await fetch(`/api/environment/${beachId}`, { signal: controller.signal });
        const body = await response.json();
        if (
          !response.ok ||
          !body.success ||
          !isEnvironmentData(body.data) ||
          body.data.beachId !== beachId
        )
          throw new Error('Environment unavailable');
        if (disposed || controller !== request) return;
        const incoming: EnvironmentData = body.data;
        const previous = saved(beachId);
        // A partial provider outage must not erase last-good browser samples.
        const data: EnvironmentData = {
          ...incoming,
          tide: {
            ...incoming.tide,
            predictions: incoming.tide.predictions.length
              ? incoming.tide.predictions
              : (previous?.tide.predictions ?? []),
            observations: incoming.tide.observations.length
              ? incoming.tide.observations
              : (previous?.tide.observations ?? []),
            extremes: incoming.tide.extremes.length
              ? incoming.tide.extremes
              : (previous?.tide.extremes ?? []),
            predictionsFetchedAt:
              incoming.tide.predictionsFetchedAt ?? previous?.tide.predictionsFetchedAt ?? null,
            observationsFetchedAt:
              incoming.tide.observationsFetchedAt ?? previous?.tide.observationsFetchedAt ?? null,
          },
          weather: incoming.weather.hourly.length
            ? incoming.weather
            : (previous?.weather ?? incoming.weather),
        };
        memory.set(beachId, data);
        try {
          localStorage.setItem(`coast-environment:${beachId}`, JSON.stringify(data));
        } catch {
          /* Best effort. */
        }
        setResult({ data, offline: false });
      } catch {
        if (!disposed && controller === request) setResult({ data: saved(beachId), offline: true });
      } finally {
        clearTimeout(timeout);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 5 * 60000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [beachId]);
  return { ...result, data: result.data?.beachId === beachId ? result.data : null };
}
