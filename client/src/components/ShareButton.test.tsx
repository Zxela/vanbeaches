import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareButton } from './ShareButton';

describe('ShareButton', () => {
  beforeEach(() => {
    // Mock clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
    });
    // Mock navigator.share as undefined (fallback to clipboard)
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
    });
    vi.useFakeTimers();
  });

  it('uses Lucide Share2 icon instead of inline SVG', () => {
    const { container } = render(<ShareButton beachName="Kitsilano Beach" beachId="kitsilano" />);
    // Inline SVG would have explicit path data; Lucide SVG is rendered differently
    const html = container.innerHTML;
    // The old component had a specific path with share icon path data
    expect(html).not.toContain('M8.684 13.342');
  });

  it('uses Lucide Check icon for copied state instead of inline SVG', async () => {
    vi.useRealTimers();
    const { container } = render(<ShareButton beachName="Kitsilano Beach" beachId="kitsilano" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Old component had specific SVG path for check mark
    const html = container.innerHTML;
    expect(html).not.toContain('M5 13l4 4L19 7');
  });

  it('replaces gray-* color classes with sand-* equivalents', () => {
    const { container } = render(<ShareButton beachName="Kitsilano Beach" beachId="kitsilano" />);
    const html = container.innerHTML;
    expect(html).not.toContain('bg-gray-100');
    expect(html).not.toContain('bg-gray-700');
    expect(html).not.toContain('text-gray-700');
  });

  it('renders Share text initially', () => {
    render(<ShareButton beachName="Kitsilano Beach" beachId="kitsilano" />);
    expect(screen.getByText('Share')).toBeInTheDocument();
  });
});
