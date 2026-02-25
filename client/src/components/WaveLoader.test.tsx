import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaveLoader } from './WaveLoader';

describe('WaveLoader', () => {
  it('uses ocean-* gradient colors instead of blue-500/cyan-400', () => {
    const { container } = render(<WaveLoader />);
    const html = container.innerHTML;
    expect(html).not.toContain('from-blue-500');
    expect(html).not.toContain('to-cyan-400');
    // Should use ocean colors
    expect(html).toContain('ocean');
  });

  it('removes inline style tag with @keyframes wave', () => {
    const { container } = render(<WaveLoader />);
    // No inline <style> tag
    const styleTags = container.querySelectorAll('style');
    expect(styleTags.length).toBe(0);
  });

  it('uses sand-* text color instead of gray-500/gray-400', () => {
    const { container } = render(<WaveLoader text="Loading..." />);
    const html = container.innerHTML;
    expect(html).not.toContain('text-gray-500');
    expect(html).not.toContain('text-gray-400');
  });

  it('renders the loader text', () => {
    render(<WaveLoader text="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('renders default loading text', () => {
    render(<WaveLoader />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
