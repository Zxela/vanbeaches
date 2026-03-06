import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const STORAGE_KEY = 'vanbeaches-theme';

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('AC-013: initial theme from localStorage', () => {
    it('defaults to light mode when no preference is stored', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');
    });

    it('does not add dark class to document root when defaulting to light', () => {
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('reads dark preference from localStorage on load', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('dark');
    });

    it('applies dark class to document root when localStorage has dark preference', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      renderHook(() => useTheme(), { wrapper });
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('reads light preference from localStorage on load', () => {
      localStorage.setItem(STORAGE_KEY, 'light');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');
    });
  });

  describe('AC-012: toggleTheme persists and applies dark class', () => {
    it('toggles from light to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('applies dark class to document root when toggling to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('persists dark preference to localStorage when toggling to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('toggles from dark back to light', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });

    it('removes dark class from document root when toggling back to light', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('persists light preference to localStorage when toggling back to light', () => {
      localStorage.setItem(STORAGE_KEY, 'dark');
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });
  });

  describe('useTheme outside provider', () => {
    it('throws an error when used outside ThemeProvider', () => {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used within ThemeProvider',
      );
    });
  });
});
