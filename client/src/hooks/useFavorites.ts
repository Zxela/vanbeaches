import { useCallback, useEffect, useState } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteBeaches');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('favoriteBeaches', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((beachId: string) => {
    setFavorites((prev) =>
      prev.includes(beachId) ? prev.filter((id) => id !== beachId) : [...prev, beachId],
    );
  }, []);

  const isFavorite = useCallback((beachId: string) => favorites.includes(beachId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
