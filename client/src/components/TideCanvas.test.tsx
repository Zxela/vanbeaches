import { render, screen } from '@testing-library/react';
import type { TidePrediction } from '@van-beaches/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Sample tide predictions for today
function makeTodayTides(): TidePrediction[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [
    {
      time: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      height: 0.3,
      type: 'low',
    },
    {
      time: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      height: 3.2,
      type: 'high',
    },
    {
      time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
      height: 0.5,
      type: 'low',
    },
    {
      time: new Date(today.getTime() + 20 * 60 * 60 * 1000).toISOString(),
      height: 3.0,
      type: 'high',
    },
  ];
}

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

    render(<TideCanvas predictions={[]} loading={false} />);

    // Check that setInterval was called with 60000ms interval
    const wasCalledWith60s = setIntervalSpy.mock.calls.some((call) => call[1] === 60000);
    expect(wasCalledWith60s).toBe(true);

    setIntervalSpy.mockRestore();
  });

  it('clears the interval on unmount', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = render(<TideCanvas predictions={[]} loading={false} />);

    unmount();

    // clearInterval should have been called on unmount
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});

describe('TideCanvas - redesigned layout', () => {
  it('summarizes the estimated current direction and emphasizes the next tide', async () => {
    vi.useFakeTimers();
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    vi.setSystemTime(today);
    const { TideCanvas } = await import('./TideCanvas');

    render(<TideCanvas predictions={makeTodayTides()} loading={false} />);

    expect(screen.getByText('Right now · estimated')).toBeInTheDocument();
    expect(screen.getByText('falling')).toBeInTheDocument();
    expect(screen.getByText('Next tide')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /estimated tide.*falling.*next low tide/i }),
    ).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders title row with only "Today\'s Tides" and wave icon, no inline high/low values', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Should contain the title text
    expect(html).toContain("Today's Tides");

    // Should NOT have the inline high/low values in the title row
    // The old code had justify-between with high/low tide spans in the CardTitle
    // New code: title row should only have the wave icon + title text
    // We check that there is NO flex items-center justify-between inside the header area
    // by checking the CardTitle does NOT contain TrendingUp/TrendingDown inline text
    // (the Key Tides grid is below the chart, not in the title)
    const titleSection = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/);
    expect(titleSection).not.toBeNull();
    if (titleSection) {
      // The h3 title should not contain TrendingUp or TrendingDown icon spans
      expect(titleSection[0]).not.toContain('justify-between');
    }
  });

  it('renders the chart container with h-[220px] class', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Chart container should have 220px height
    expect(html).toContain('h-[220px]');
  });

  it('renders Key Tides grid section below chart', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Should have a grid with the tide values
    expect(html).toContain('Key Tides');
  });

  it('renders tide heights in Key Tides grid', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Should show the tide height values from todayTides
    expect(html).toContain('3.2m');
    expect(html).toContain('0.3m');
  });

  it('renders Key Tides grid with grid-cols-2 class', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Should use grid layout with grid-cols-2
    expect(html).toContain('grid-cols-2');
  });

  it('renders Key Tides items with rounded-lg bg styling', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={makeTodayTides()} loading={false} />);
    const html = container.innerHTML;

    // Key Tides items should have rounded-lg styling
    expect(html).toContain('rounded-lg');
    // Should have the ocean-50 background
    expect(html).toContain('ocean-50');
  });

  it('renders loading state with h-[220px] shimmer', async () => {
    const { TideCanvas } = await import('./TideCanvas');
    const { container } = render(<TideCanvas predictions={[]} loading={true} />);
    const html = container.innerHTML;

    // Loading shimmer should also use 220px height
    expect(html).toContain('h-[220px]');
  });
});
