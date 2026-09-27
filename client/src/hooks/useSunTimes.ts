import { useMemo } from 'react';
import { solarTimes } from '../world/solar';

export function useSunTimes(latitude: number, longitude: number) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // Choose local midday: a midnight input can resolve to the preceding solar cycle.
  return useMemo(
    () => solarTimes(new Date(`${day}T20:00:00Z`), latitude, longitude),
    [day, latitude, longitude],
  );
}

export function formatSunTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('en-US', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
