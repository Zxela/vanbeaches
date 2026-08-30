import { useCallback, useEffect, useState } from 'react';

const MAX_RECENT = 5;

function readRecentBeaches(): string[] {
  try {
    const saved = localStorage.getItem('recentBeaches');
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

export function useRecentBeaches() {
  const [recent, setRecent] = useState<string[]>(readRecentBeaches);

  useEffect(() => {
    localStorage.setItem('recentBeaches', JSON.stringify(recent));
  }, [recent]);

  const addRecent = useCallback((beachId: string) => {
    setRecent((prev) => {
      const filtered = prev.filter((id) => id !== beachId);
      return [beachId, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  return { recent, addRecent };
}
