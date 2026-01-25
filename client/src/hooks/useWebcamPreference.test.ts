import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebcamPreference } from './useWebcamPreference';

const STORAGE_KEY = 'van-beaches:webcam-hidden';

describe('useWebcamPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('returns false when localStorage is empty', () => {
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(false);
    });

    it('returns true when localStorage has "true"', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(true);
    });

    it('returns false when localStorage has "false"', () => {
      localStorage.setItem(STORAGE_KEY, 'false');
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(false);
    });

    it('returns false when localStorage has invalid value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid');
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(false);
    });
  });

  describe('hide()', () => {
    it('updates state to true', () => {
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(false);

      act(() => {
        result.current.hide();
      });

      expect(result.current.isHidden).toBe(true);
    });

    it('sets localStorage to "true"', () => {
      const { result } = renderHook(() => useWebcamPreference());

      act(() => {
        result.current.hide();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });
  });

  describe('show()', () => {
    it('updates state to false', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(true);

      act(() => {
        result.current.show();
      });

      expect(result.current.isHidden).toBe(false);
    });

    it('sets localStorage to "false"', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useWebcamPreference());

      act(() => {
        result.current.show();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });
  });

  describe('toggle()', () => {
    it('switches from false to true', () => {
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isHidden).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    });

    it('switches from true to false', () => {
      localStorage.setItem(STORAGE_KEY, 'true');
      const { result } = renderHook(() => useWebcamPreference());
      expect(result.current.isHidden).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isHidden).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
    });

    it('toggles multiple times correctly', () => {
      const { result } = renderHook(() => useWebcamPreference());

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isHidden).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isHidden).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isHidden).toBe(true);
    });
  });

  describe('localStorage unavailable', () => {
    it('handles localStorage errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      const originalSetItem = localStorage.setItem;

      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useWebcamPreference());

      // Should default to false when localStorage throws
      expect(result.current.isHidden).toBe(false);

      // Should still update state even if localStorage fails
      act(() => {
        result.current.hide();
      });
      expect(result.current.isHidden).toBe(true);

      act(() => {
        result.current.show();
      });
      expect(result.current.isHidden).toBe(false);

      localStorage.getItem = originalGetItem;
      localStorage.setItem = originalSetItem;
    });
  });
});
