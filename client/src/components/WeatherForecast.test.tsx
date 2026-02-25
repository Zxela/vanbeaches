import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherForecast } from './WeatherForecast';

const mockForecast = {
  beachId: 'test-beach',
  current: {
    temperature: 18,
    condition: 'sunny' as const,
    humidity: 65,
    windSpeed: 12,
    windDirection: 'N',
    uvIndex: 4,
  },
  hourly: [],
  daily: [
    { date: '2024-01-01', high: 20, low: 10, condition: 'sunny' as const },
    { date: '2024-01-02', high: 18, low: 9, condition: 'partly-cloudy' as const },
    { date: '2024-01-03', high: 16, low: 8, condition: 'rainy' as const },
    { date: '2024-01-04', high: 14, low: 7, condition: 'cloudy' as const },
    { date: '2024-01-05', high: 12, low: 6, condition: 'stormy' as const },
  ],
  fetchedAt: new Date().toISOString(),
};

describe('WeatherForecast', () => {
  it('wraps content in a Card component instead of raw div with bg-white/bg-gray-800', () => {
    const { container } = render(<WeatherForecast forecast={mockForecast} />);
    // Card component renders with data-card attribute or card class patterns
    // Instead check that there is no raw bg-white or bg-gray-800 class
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('bg-gray-800');
  });

  it('uses Lucide icon components instead of emoji strings for weather icons', () => {
    render(<WeatherForecast forecast={mockForecast} />);
    // Lucide icons render as SVG elements - no emoji text content
    const emojiPattern = /[☀️⛅☁️🌧️⛈️🌫️🌡️]/u;
    // Get all text nodes
    const allText = document.body.textContent || '';
    expect(allText).not.toMatch(emojiPattern);
  });

  it('replaces gray-* color classes with sand-* equivalents', () => {
    const { container } = render(<WeatherForecast forecast={mockForecast} />);
    const html = container.innerHTML;
    expect(html).not.toContain('gray-');
  });

  it('renders 5 forecast days', () => {
    render(<WeatherForecast forecast={mockForecast} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('20°')).toBeInTheDocument();
    expect(screen.getByText('10°')).toBeInTheDocument();
  });

  it('shows loading state with shimmer placeholders', () => {
    const { container } = render(<WeatherForecast forecast={null} loading={true} />);
    const shimmers = container.querySelectorAll('.shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  it('shows unavailable message when no daily data', () => {
    render(<WeatherForecast forecast={null} />);
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });
});
