import { render, screen } from '@testing-library/react';

import type { WeatherForecast } from '@van-beaches/shared';
import { describe, expect, it } from 'vitest';
import { HourlyForecast } from './HourlyForecast';

function makeForecast(hourly: WeatherForecast['hourly']): WeatherForecast {
  return {
    beachId: 'kits',
    current: {
      temperature: 18,
      condition: 'partly-cloudy',
      humidity: 65,
      windSpeed: 12,
      windDirection: 'SW',
      uvIndex: 4,
    },
    hourly,
    fetchedAt: '2099-06-01T12:00:00.000Z',
  };
}

describe('HourlyForecast', () => {
  it('renders the hourly strip from a payload containing richer optional fields', () => {
    render(
      <HourlyForecast
        forecast={makeForecast([
          {
            time: '2099-06-01T12:00:00',
            temperature: 18.4,
            condition: 'partly-cloudy',
            precipitationProbability: 35,
            windSpeed: 14.4,
            windDirection: 'E',
            uvIndex: 3.5,
            humidity: 68,
            precipitation: 0.2,
          },
          {
            time: '2099-06-01T13:00:00',
            temperature: 19.1,
            condition: 'sunny',
            precipitationProbability: 0,
          },
        ])}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Hourly Forecast' })).toBeInTheDocument();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('18°')).toBeInTheDocument();
    expect(screen.getByText('19°')).toBeInTheDocument();
  });

  it('continues to render legacy hourly entries without optional detail fields', () => {
    render(
      <HourlyForecast
        forecast={makeForecast([
          {
            time: '2099-06-01T12:00:00',
            temperature: 16,
            condition: 'rainy',
            precipitationProbability: 80,
          },
        ])}
      />,
    );

    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('16°')).toBeInTheDocument();
  });

  it('renders nothing when there are no hourly entries', () => {
    const { container } = render(<HourlyForecast forecast={makeForecast([])} />);

    expect(container).toBeEmptyDOMElement();
  });
});
