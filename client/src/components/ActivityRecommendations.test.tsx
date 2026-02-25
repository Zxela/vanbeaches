import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityRecommendations } from './ActivityRecommendations';

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
  hourly: [],
  fetchedAt: new Date().toISOString(),
};

describe('ActivityRecommendations', () => {
  it('wraps content in a Card component instead of raw div', () => {
    const { container } = render(
      <ActivityRecommendations weather={mockWeather} />,
    );
    // Card component means no bg-white raw class at root level
    const html = container.innerHTML;
    expect(html).not.toContain('bg-white dark:bg-gray-800');
  });

  it('replaces gray-* color classes with sand-* equivalents for poor rating', () => {
    const poorWeather = {
      ...mockWeather,
      current: {
        ...mockWeather.current,
        condition: 'rainy' as const,
        temperature: 10,
        windSpeed: 30,
      },
    };
    const { container } = render(
      <ActivityRecommendations weather={poorWeather} />,
    );
    const html = container.innerHTML;
    // Poor rating should use sand-* not gray-*
    expect(html).not.toContain('bg-gray-100');
    expect(html).not.toContain('text-gray-500');
  });

  it('replaces gray-* color classes in heading', () => {
    const { container } = render(
      <ActivityRecommendations weather={mockWeather} />,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('text-gray-900');
    expect(html).not.toContain('dark:text-white');
  });

  it('renders activity recommendations with beach walk always present', () => {
    render(<ActivityRecommendations weather={mockWeather} />);
    expect(screen.getByText('Beach Walking')).toBeInTheDocument();
  });

  it('renders nothing when weather is null', () => {
    const { container } = render(
      <ActivityRecommendations weather={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
