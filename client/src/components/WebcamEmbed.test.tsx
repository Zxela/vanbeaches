import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebcamEmbed } from './WebcamEmbed';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('WebcamEmbed', () => {
  const defaultProps = {
    url: 'https://example.com/webcam.jpg',
    beachName: 'Test Beach',
    onHide: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset touch device detection - delete ontouchstart to simulate non-touch device
    if ('ontouchstart' in window) {
      delete (window as { ontouchstart?: unknown }).ontouchstart;
    }
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it('renders webcam image with given URL', async () => {
    // Simulate intersection observer triggering visibility
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', defaultProps.url);
    expect(image).toHaveAttribute('alt', defaultProps.beachName);
  });

  it('shows loading placeholder before image loads', () => {
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Loading placeholder should be visible (has animate-pulse class)
    const placeholder = document.querySelector('.animate-pulse');
    expect(placeholder).toBeInTheDocument();
  });

  it('hide button appears on hover', async () => {
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Simulate image load
    const image = screen.getByRole('img');
    fireEvent.load(image);

    // Get the container div
    const container = image.closest('.relative');
    expect(container).toBeInTheDocument();

    // Initially, hide button should be hidden (opacity-0)
    const hideButton = screen.getByRole('button', { name: 'Hide webcam' });
    expect(hideButton).toHaveClass('opacity-0');

    // Hover over the container
    fireEvent.mouseEnter(container!);

    // Now hide button should be visible (opacity-100)
    await waitFor(() => {
      expect(hideButton).toHaveClass('opacity-100');
    });

    // Mouse leave should hide the button again
    fireEvent.mouseLeave(container!);
    expect(hideButton).toHaveClass('opacity-0');
  });

  it('hide button calls onHide when clicked', async () => {
    const onHide = vi.fn();
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} onHide={onHide} />);

    // Simulate image load
    const image = screen.getByRole('img');
    fireEvent.load(image);

    // Click hide button
    const hideButton = screen.getByRole('button', { name: 'Hide webcam' });
    fireEvent.click(hideButton);

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('hide button is always visible on touch devices', async () => {
    // Simulate touch device
    Object.defineProperty(window, 'ontouchstart', {
      value: true,
      writable: true,
      configurable: true,
    });

    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Simulate image load
    const image = screen.getByRole('img');
    fireEvent.load(image);

    // On touch devices, button should be visible without hover
    const hideButton = screen.getByRole('button', { name: 'Hide webcam' });
    await waitFor(() => {
      expect(hideButton).toHaveClass('opacity-100');
    });
  });

  it('does not render photo-related elements', () => {
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Should not have photo credit link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    // Should not have "Photo coming soon" text
    expect(screen.queryByText('Photo coming soon')).not.toBeInTheDocument();
  });

  it('hide button has correct styling', async () => {
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Simulate image load
    const image = screen.getByRole('img');
    fireEvent.load(image);

    const hideButton = screen.getByRole('button', { name: 'Hide webcam' });

    // Check positioning and styling classes
    expect(hideButton).toHaveClass('absolute');
    expect(hideButton).toHaveClass('top-3');
    expect(hideButton).toHaveClass('right-12');
    expect(hideButton).toHaveClass('bg-black/50');
    expect(hideButton).toHaveClass('rounded-lg');
    expect(hideButton).toHaveClass('p-2');
  });

  it('hide button contains EyeOff icon and Hide text', async () => {
    mockIntersectionObserver.mockImplementation((callback) => {
      callback([{ isIntersecting: true }]);
      return {
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null,
      };
    });

    render(<WebcamEmbed {...defaultProps} />);

    // Simulate image load
    const image = screen.getByRole('img');
    fireEvent.load(image);

    const hideButton = screen.getByRole('button', { name: 'Hide webcam' });

    // Check for icon (SVG)
    const svg = hideButton.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Check for "Hide" text
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });
});
