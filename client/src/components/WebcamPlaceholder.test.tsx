import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebcamPlaceholder } from './WebcamPlaceholder';

describe('WebcamPlaceholder', () => {
  it('renders with correct text "Show webcam"', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    expect(screen.getByText('Show webcam')).toBeInTheDocument();
  });

  it('renders video icon', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    // The Video icon from Lucide renders as an SVG element
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onShow when clicked', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility attributes', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    const button = screen.getByRole('button', { name: 'Show webcam' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('applies custom className when provided', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('has rounded corners (rounded-xl)', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-xl');
  });

  it('has correct height (h-10)', () => {
    const onShow = vi.fn();
    render(<WebcamPlaceholder onShow={onShow} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');
  });
});
