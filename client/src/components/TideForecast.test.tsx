import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TideForecast } from './TideForecast';

const mockPredictions = [
  { time: '2026-02-27T06:00:00', height: 1.8, type: 'high' as const },
  { time: '2026-02-27T12:00:00', height: 0.4, type: 'low' as const },
  { time: '2026-02-27T18:00:00', height: 1.6, type: 'high' as const },
  { time: '2026-02-28T00:00:00', height: 0.3, type: 'low' as const },
  { time: '2026-02-28T07:00:00', height: 1.9, type: 'high' as const },
  { time: '2026-02-28T13:00:00', height: 0.5, type: 'low' as const },
];

describe('TideForecast', () => {
  it('renders day cards with w-40 width class (160px)', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    const html = container.innerHTML;
    expect(html).toContain('w-40');
    expect(html).not.toContain('w-36');
  });

  it('renders MiniTideCurve SVG with width 140 and height 60', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    // The MiniTideCurve SVG has width > 60 (unlike icon SVGs which are 24px)
    const svgs = Array.from(container.querySelectorAll('svg[aria-hidden="true"]'));
    const tideCurveSvg = svgs.find((svg) => Number(svg.getAttribute('width')) > 60);
    expect(tideCurveSvg).toBeDefined();
    expect(tideCurveSvg?.getAttribute('width')).toBe('140');
    expect(tideCurveSvg?.getAttribute('height')).toBe('60');
  });

  it('uses text-sm instead of text-xs for tide values', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    const html = container.innerHTML;
    // The tide value rows should use text-sm
    expect(html).toContain('text-sm');
    // text-xs should not appear in tide value rows (it may still appear in labels)
    // Check that the tide value flex rows use text-sm
    const tideValueDivs = container.querySelectorAll('.flex.items-center.justify-between.text-sm');
    expect(tideValueDivs.length).toBeGreaterThan(0);
  });

  it('applies snap-x and snap-mandatory classes to scroll container', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    const html = container.innerHTML;
    expect(html).toContain('snap-x');
    expect(html).toContain('snap-mandatory');
  });

  it('applies today card styling with bg-ocean-100 border-ocean-300 ring-2 ring-ocean-200', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    const html = container.innerHTML;
    expect(html).toContain('bg-ocean-100');
    expect(html).toContain('border-ocean-300');
    expect(html).toContain('ring-2');
    expect(html).toContain('ring-ocean-200');
  });

  it('applies non-today card styling with bg-white border-sand-200 hover:border-ocean-200', () => {
    const { container } = render(<TideForecast predictions={mockPredictions} />);
    const html = container.innerHTML;
    expect(html).toContain('bg-white');
    expect(html).toContain('border-sand-200');
    expect(html).toContain('hover:border-ocean-200');
  });
});
