import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useFavorites } from './useFavorites';

describe('useFavorites', () => {
  beforeEach(() => localStorage.clear());

  it('synchronizes all mounted consumers immediately', () => {
    const first = renderHook(() => useFavorites());
    const second = renderHook(() => useFavorites());

    act(() => first.result.current.toggleFavorite('kitsilano'));

    expect(first.result.current.isFavorite('kitsilano')).toBe(true);
    expect(second.result.current.isFavorite('kitsilano')).toBe(true);
  });

  it('recovers from corrupt or incorrectly shaped storage', () => {
    localStorage.setItem('favoriteBeaches', '{broken');
    const corrupt = renderHook(() => useFavorites());
    expect(corrupt.result.current.favorites).toEqual([]);
    corrupt.unmount();

    localStorage.setItem('favoriteBeaches', JSON.stringify({ beach: 'kitsilano' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'favoriteBeaches' }));
    const wrongShape = renderHook(() => useFavorites());
    expect(wrongShape.result.current.favorites).toEqual([]);
  });
});
