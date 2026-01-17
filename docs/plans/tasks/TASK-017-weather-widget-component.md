# Task: TASK-017 WeatherWidget Component

Metadata:
- Phase: 3 - Weather Slice
- Dependencies: TASK-016 (useWeather Hook)
- Provides: Weather display component with current conditions and 24-hour forecast
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the WeatherWidget React component that displays current weather conditions with temperature and icon, plus a 24-hour forecast timeline. Temperature is shown with one decimal precision (15.5C), weather condition icons match each condition type, and a "Last updated" timestamp is shown when cached.

## Target Files

- [ ] `/home/zxela/workspace/client/src/components/WeatherWidget.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/WeatherWidget.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-016: useWeather hook available at `/client/src/hooks/useWeather.ts`
- [ ] Write failing tests for WeatherWidget:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { WeatherWidget } from '../WeatherWidget'
  import type { WeatherForecast } from '@shared/types'

  describe('WeatherWidget', () => {
    const mockWeatherData: WeatherForecast = {
      beachId: 'english-bay',
      current: {
        temperature: 15.5,
        condition: 'partly-cloudy',
        humidity: 65,
        windSpeed: 12,
        windDirection: 'NW',
        uvIndex: 4
      },
      hourly: Array(24).fill({
        time: '2026-01-17T13:00:00Z',
        temperature: 15.5,
        condition: 'partly-cloudy',
        precipitationProbability: 10
      }).map((h, i) => ({
        ...h,
        time: `2026-01-17T${String(i).padStart(2, '0')}:00:00Z`,
        temperature: 15 + Math.sin(i / 4) * 3
      })),
      fetchedAt: '2026-01-17T12:00:00Z'
    }

    describe('temperature display', () => {
      it('displays temperature with one decimal precision', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/15\.5/)).toBeInTheDocument()
      })

      it('displays temperature in Celsius format', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/15\.5.*C/i)).toBeInTheDocument()
      })
    })

    describe('weather icons', () => {
      it('displays appropriate icon for partly-cloudy', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByTestId('weather-icon-partly-cloudy')).toBeInTheDocument()
      })

      it.each([
        ['sunny', 'sun'],
        ['cloudy', 'cloud'],
        ['rainy', 'rain'],
        ['stormy', 'storm'],
        ['foggy', 'fog']
      ])('displays %s icon for %s condition', (condition, iconName) => {
        const weatherData = {
          ...mockWeatherData,
          current: { ...mockWeatherData.current, condition }
        }
        render(<WeatherWidget weather={weatherData} loading={false} />)

        expect(screen.getByTestId(`weather-icon-${condition}`)).toBeInTheDocument()
      })
    })

    describe('24-hour forecast', () => {
      it('displays 24-hour forecast timeline', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/24-hour forecast/i)).toBeInTheDocument()
      })

      it('displays hourly entries', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        // Should show some hourly entries (may be scrollable)
        expect(screen.getAllByTestId(/hourly-entry/).length).toBeGreaterThan(0)
      })
    })

    describe('cached indicator', () => {
      it('shows "Last updated" when cached', () => {
        render(
          <WeatherWidget
            weather={mockWeatherData}
            loading={false}
            cached={true}
            cachedAt="2026-01-17T12:00:00Z"
          />
        )

        expect(screen.getByText(/Last updated/i)).toBeInTheDocument()
      })
    })

    describe('loading state', () => {
      it('shows loading skeleton when loading', () => {
        render(<WeatherWidget weather={null} loading={true} />)

        expect(screen.getByTestId('weather-widget-skeleton')).toBeInTheDocument()
      })
    })

    describe('error state', () => {
      it('displays error message', () => {
        render(<WeatherWidget weather={null} loading={false} error="Failed to load" />)

        expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
      })
    })

    describe('additional info', () => {
      it('displays humidity', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/65%/)).toBeInTheDocument()
      })

      it('displays wind speed and direction', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/12.*km\/h/i)).toBeInTheDocument()
        expect(screen.getByText(/NW/)).toBeInTheDocument()
      })

      it('displays UV index', () => {
        render(<WeatherWidget weather={mockWeatherData} loading={false} />)

        expect(screen.getByText(/UV.*4/i)).toBeInTheDocument()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement WeatherWidget component:
  ```typescript
  import type { WeatherForecast, WeatherCondition } from '@shared/types'

  interface WeatherWidgetProps {
    weather: WeatherForecast | null
    loading: boolean
    error?: string | null
    cached?: boolean
    cachedAt?: string | null
  }

  const weatherIcons: Record<WeatherCondition, string> = {
    'sunny': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'stormy': '⛈️',
    'foggy': '🌫️'
  }

  export function WeatherWidget({
    weather,
    loading,
    error,
    cached,
    cachedAt
  }: WeatherWidgetProps) {
    if (loading) {
      return (
        <div data-testid="weather-widget-skeleton" className="animate-pulse">
          {/* Skeleton UI */}
        </div>
      )
    }

    if (error) {
      return (
        <div role="alert" className="text-red-500">
          {error}
        </div>
      )
    }

    if (!weather) {
      return <div className="text-gray-500">No weather data available</div>
    }

    const { current, hourly, fetchedAt } = weather

    return (
      <div className="weather-widget" role="region" aria-label="Weather conditions">
        {/* Current conditions */}
        <div className="flex items-center gap-4 mb-4">
          <span
            data-testid={`weather-icon-${current.condition}`}
            className="text-4xl"
          >
            {weatherIcons[current.condition]}
          </span>
          <div>
            <div className="text-3xl font-bold">
              {current.temperature.toFixed(1)}°C
            </div>
            <div className="text-gray-600 capitalize">
              {current.condition.replace('-', ' ')}
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="grid grid-cols-3 gap-2 text-sm mb-4">
          <div>Humidity: {current.humidity}%</div>
          <div>Wind: {current.windSpeed} km/h {current.windDirection}</div>
          <div>UV Index: {current.uvIndex}</div>
        </div>

        {/* 24-hour forecast */}
        <div>
          <h4 className="font-semibold mb-2">24-hour Forecast</h4>
          <div className="flex overflow-x-auto gap-2">
            {hourly.map((hour, index) => (
              <div
                key={index}
                data-testid="hourly-entry"
                className="flex-shrink-0 text-center p-2"
              >
                <div className="text-xs">
                  {new Date(hour.time).getHours()}:00
                </div>
                <div>{weatherIcons[hour.condition]}</div>
                <div className="text-sm">{hour.temperature.toFixed(1)}°</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cached indicator */}
        {cached && cachedAt && (
          <div className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(cachedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    )
  }
  ```
- [ ] Implement weather icons for each condition
- [ ] Implement loading skeleton
- [ ] Implement error state
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify temperature displays as "15.5C" format
- [ ] Verify weather icons match conditions
- [ ] Verify cached indicator visible when applicable
- [ ] Verify 24-hour forecast displays
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Component renders current and forecast weather
- [ ] Temperature displays as "15.5C" format (one decimal precision)
- [ ] Weather icons match conditions (sunny, cloudy, rainy, etc.)
- [ ] Cached indicator visible when applicable
- [ ] 24-hour forecast timeline displayed
- [ ] Loading skeleton during fetch
- [ ] Error state handled
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Temperature in Celsius with one decimal precision"
- AC: "Weather conditions with appropriate icons"
- AC: "If API error, display cached data with timestamp"
- Component: WeatherWidget (`/client/src/components/WeatherWidget.tsx`)
- Props: `forecast: WeatherForecast, loading: boolean`

## Notes

- Impact scope: BeachDetail Page (TASK-025) will use this component
- Constraints: Temperature format with one decimal (not rounded)
- Weather icons can be emoji or SVG icons
- 24-hour forecast may need horizontal scrolling on mobile
