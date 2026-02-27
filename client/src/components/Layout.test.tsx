import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { Layout } from './Layout';

// Helper to render Layout with all required providers
function renderLayout(children = <div>content</div>) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Layout>{children}</Layout>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('ThemeContext - light-only', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('always returns theme: light regardless of localStorage', () => {
    localStorage.setItem('theme', 'dark');

    let capturedTheme: string | undefined;
    function Inspector() {
      const { theme } = useTheme();
      capturedTheme = theme;
      return null;
    }

    render(
      <ThemeProvider>
        <Inspector />
      </ThemeProvider>,
    );

    expect(capturedTheme).toBe('light');
  });

  it('does not write to localStorage', () => {
    render(<ThemeProvider>{null}</ThemeProvider>);
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('does not read localStorage for theme', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    render(<ThemeProvider>{null}</ThemeProvider>);

    const themeReads = getItemSpy.mock.calls.filter(([key]) => key === 'theme');
    expect(themeReads.length).toBe(0);

    getItemSpy.mockRestore();
  });

  it('removes the dark class from document.documentElement', () => {
    document.documentElement.classList.add('dark');

    render(<ThemeProvider>{null}</ThemeProvider>);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('Layout - no theme toggle button', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('does not render a Moon icon toggle button', () => {
    renderLayout();
    // Moon icon renders as SVG with aria-hidden; no title for dark/light switch should be present
    const moonButton = screen.queryByTitle('Switch to dark mode');
    expect(moonButton).toBeNull();
  });

  it('does not render a Sun icon toggle button', () => {
    renderLayout();
    const sunButton = screen.queryByTitle('Switch to light mode');
    expect(sunButton).toBeNull();
  });

  it('does not have any button with Moon or Sun title attributes', () => {
    const { container } = renderLayout();
    const buttons = container.querySelectorAll('button[title]');
    const toggleButtons = Array.from(buttons).filter(
      (btn) =>
        btn.getAttribute('title')?.toLowerCase().includes('dark') ||
        btn.getAttribute('title')?.toLowerCase().includes('light mode'),
    );
    expect(toggleButtons.length).toBe(0);
  });
});

describe('Layout - d keyboard shortcut removed', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('pressing d key does not add dark class to documentElement', () => {
    renderLayout();
    fireEvent.keyDown(document, { key: 'd' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('pressing d key multiple times does not toggle dark class', () => {
    renderLayout();
    fireEvent.keyDown(document, { key: 'd' });
    fireEvent.keyDown(document, { key: 'd' });
    fireEvent.keyDown(document, { key: 'd' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
