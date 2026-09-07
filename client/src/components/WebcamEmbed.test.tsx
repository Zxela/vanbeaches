import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebcamEmbed } from './WebcamEmbed';

const props = { url: 'https://example.com/webcam.jpg', beachName: 'Test Beach', onHide: vi.fn() };
let intersect: (entries: { isIntersecting: boolean }[]) => void;

class MockIntersectionObserver {
  disconnect = vi.fn();
  private readonly callback: (entries: { isIntersecting: boolean }[]) => void;

  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = callback;
    intersect = callback;
  }

  observe() {
    this.callback([{ isIntersecting: true }]);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

describe('WebcamEmbed', () => {
  it('loads only after entering the viewport', () => {
    const observe = vi
      .spyOn(MockIntersectionObserver.prototype, 'observe')
      .mockImplementation(() => {});
    render(<WebcamEmbed {...props} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    act(() => intersect([{ isIntersecting: true }]));
    expect(screen.getByRole('img')).toBeInTheDocument();
    observe.mockRestore();
  });

  it('shows loading, then the loaded image and an accessible hide action', () => {
    render(<WebcamEmbed {...props} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading webcam');
    fireEvent.load(screen.getByRole('img'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', props.url);
    fireEvent.click(screen.getByRole('button', { name: 'Hide webcam' }));
    expect(props.onHide).toHaveBeenCalledOnce();
  });

  it('shows failure with source access and retries successfully', () => {
    render(<WebcamEmbed {...props} />);
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('alert')).toHaveTextContent('Webcam unavailable');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open source' })).toHaveAttribute('href', props.url);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeVisible();
    fireEvent.load(screen.getByRole('img'));
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
