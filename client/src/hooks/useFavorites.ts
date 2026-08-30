import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'favoriteBeaches';
const EMPTY_FAVORITES: string[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedFavorites: string[] = [];

function readFavorites(): string[] {
  if (typeof window === 'undefined') return EMPTY_FAVORITES;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedFavorites;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedFavorites = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    cachedFavorites = [];
  }
  return cachedFavorites;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = undefined;
      listener();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function writeFavorites(favorites: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  cachedRaw = undefined;
  for (const listener of listeners) listener();
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readFavorites, () => EMPTY_FAVORITES);

  const toggleFavorite = useCallback((beachId: string) => {
    const current = readFavorites();
    writeFavorites(
      current.includes(beachId) ? current.filter((id) => id !== beachId) : [...current, beachId],
    );
  }, []);

  const isFavorite = useCallback((beachId: string) => favorites.includes(beachId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
