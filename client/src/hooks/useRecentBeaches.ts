import { useCallback, useEffect, useState } from 'react';

const MAX_RECENT = 5;

export function useRecentBeaches() {
  const [recent, setRecent] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentBeaches');
    return saved ? JSON.parse(saved) : [];
  });

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
