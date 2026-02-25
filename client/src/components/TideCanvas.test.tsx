import { render } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

describe('TideCanvas - stale now marker fix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the now marker every 60 seconds', async () => {
    // Dynamically import to test with mocked timers
    const { TideCanvas } = await import('./TideCanvas');
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(
      <TideCanvas
        predictions={[]}
        loading={false}
      />,
    );

    // Check that setInterval was called with 60000ms interval
    const wasCalledWith60s = setIntervalSpy.mock.calls.some(
      (call) => call[1] === 60000,
    );
    expect(wasCalledWith60s).toBe(true);

    setIntervalSpy.mockRestore();
  });

  it('clears the interval on unmount', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <TideCanvas
        predictions={[]}
        loading={false}
      />,
    );

    unmount();

    // clearInterval should have been called on unmount
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
