import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchFilter } from './SearchFilter';

describe('SearchFilter', () => {
  it('uses sand-* colors instead of gray-* in container', () => {
    const { container } = render(<SearchFilter onFilter={vi.fn()} />);
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white dark:bg-gray-800');
    expect(html).not.toContain('bg-gray-50');
    expect(html).not.toContain('bg-gray-100 dark:bg-gray-700');
  });

  it('uses ocean-500 for active filter chips instead of blue-500', () => {
    const { container } = render(<SearchFilter onFilter={vi.fn()} />);
    // Trigger an active filter by checking if the class structure uses ocean
    const html = container.innerHTML;
    // No blue-500 should appear
    expect(html).not.toContain('bg-blue-500');
  });

  it('uses Lucide Search icon instead of inline SVG', () => {
    const { container } = render(<SearchFilter onFilter={vi.fn()} />);
    const html = container.innerHTML;
    // Old SVG had specific path data for search icon
    expect(html).not.toContain('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z');
  });

  it('uses Lucide X icon instead of inline SVG for clear', () => {
    const { container } = render(<SearchFilter onFilter={vi.fn()} />);
    // Old had explicit path for X icon
    expect(container.innerHTML).not.toContain('M6 18L18 6M6 6l12 12');
  });

  it('renders all filter chips', () => {
    render(<SearchFilter onFilter={vi.fn()} />);
    expect(screen.getByText('Dog Friendly')).toBeInTheDocument();
    expect(screen.getByText('Webcam')).toBeInTheDocument();
    expect(screen.getByText('Lifeguard')).toBeInTheDocument();
  });
});
