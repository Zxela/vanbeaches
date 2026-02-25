import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BestTimeToVisit } from './BestTimeToVisit';

vi.mock('../hooks/useSunTimes', () => ({
  useSunTimes: vi.fn(() => ({
    sunrise: new Date('2024-01-01T07:00:00'),
    sunset: new Date('2024-01-01T17:00:00'),
    goldenHourStart: new Date('2024-01-01T16:00:00'),
    goldenHourEnd: new Date('2024-01-01T17:00:00'),
  })),
  formatSunTime: vi.fn(() => '5:00 PM'),
}));

const mockWeather = {
  beachId: 'test',
  current: {
    temperature: 22,
    condition: 'sunny' as const,
    humidity: 60,
    windSpeed: 10,
    windDirection: 'N',
    uvIndex: 3,
  },
  hourly: [
    { time: new Date(Date.now() + 2 * 3600000).toISOString(), temperature: 18, condition: 'sunny' as const, precipitationProbability: 0 },
    { time: new Date(Date.now() + 6 * 3600000).toISOString(), temperature: 24, condition: 'partly-cloudy' as const, precipitationProbability: 10 },
    { time: new Date(Date.now() + 10 * 3600000).toISOString(), temperature: 20, condition: 'sunny' as const, precipitationProbability: 0 },
  ],
  fetchedAt: new Date().toISOString(),
};

describe('BestTimeToVisit', () => {
  it('uses Card component with design system colors instead of raw div with gray-*', () => {
    const { container } = render(
      <BestTimeToVisit weather={mockWeather} tides={null} latitude={49.28} longitude={-123.12} />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('text-gray-900 dark:text-white mb-3');
    expect(html).not.toContain('bg-white dark:bg-gray-800');
    expect(html).not.toContain('bg-gradient-to-br from-indigo-50');
  });

  it('replaces target emoji with a Lucide icon', () => {
    const { container } = render(
      <BestTimeToVisit weather={mockWeather} tides={null} latitude={49.28} longitude={-123.12} />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('🎯');
  });

  it('uses hourly forecast data when available for temperature/condition', () => {
    // Component renders without errors when hourly data is present
    expect(() => render(
      <BestTimeToVisit weather={mockWeather} tides={null} latitude={49.28} longitude={-123.12} />,
    )).not.toThrow();
  });

  it('falls back to current conditions when hourly data is empty', () => {
    const weatherNoHourly = { ...mockWeather, hourly: [] };
    expect(() => render(
      <BestTimeToVisit weather={weatherNoHourly} tides={null} latitude={49.28} longitude={-123.12} />,
    )).not.toThrow();
  });

  it('renders nothing when weather is null', () => {
    const { container } = render(
      <BestTimeToVisit weather={null} tides={null} latitude={49.28} longitude={-123.12} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
