# Task: TASK-026 BeachCard Component

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-002 (Shared Types)
- Provides: Summary card component for dashboard display
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the BeachCard React component that displays beach name, current weather summary, next tide indicator, water quality status badge, and a link to the beach detail page. Also displays "Data unavailable" with timestamp on failure.

## Target Files

- [ ] `/home/zxela/workspace/client/src/components/BeachCard.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/BeachCard.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-002: BeachSummary type available at `/shared/types/beach.ts`
- [ ] Write failing tests for BeachCard component:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'
  import { describe, it, expect } from 'vitest'
  import { BeachCard } from '../BeachCard'
  import type { BeachSummary } from '@shared/types'

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
  }

  describe('BeachCard', () => {
    const mockBeachSummary: BeachSummary = {
      id: 'english-bay',
      name: 'English Bay',
      currentWeather: {
        temperature: 15.5,
        condition: 'partly-cloudy',
        icon: 'partly-cloudy'
      },
      nextTide: {
        type: 'high',
        time: '2026-01-17T14:30:00Z',
        height: 3.45
      },
      waterQuality: 'good',
      lastUpdated: '2026-01-17T12:00:00Z'
    }

    describe('beach information', () => {
      it('displays beach name', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        expect(screen.getByText('English Bay')).toBeInTheDocument()
      })

      it('links to beach detail page', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/beach/english-bay')
      })
    })

    describe('weather summary', () => {
      it('displays current temperature', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        expect(screen.getByText(/15\.5/)).toBeInTheDocument()
      })

      it('displays weather icon', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        expect(screen.getByTestId('weather-icon')).toBeInTheDocument()
      })
    })

    describe('tide indicator', () => {
      it('displays next tide type', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        expect(screen.getByText(/high/i)).toBeInTheDocument()
      })

      it('displays next tide time', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        // Time should be formatted
        expect(screen.getByText(/2:30 PM/)).toBeInTheDocument()
      })
    })

    describe('water quality status', () => {
      it('displays water quality badge', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toBeInTheDocument()
        expect(badge).toHaveTextContent(/good/i)
      })

      it('shows correct color for good status', () => {
        renderWithRouter(<BeachCard beach={mockBeachSummary} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toHaveClass('bg-green')
      })

      it('shows correct color for advisory status', () => {
        const advisoryBeach = {
          ...mockBeachSummary,
          waterQuality: 'advisory' as const
        }
        renderWithRouter(<BeachCard beach={advisoryBeach} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toHaveClass('bg-yellow')
      })
    })

    describe('data unavailable state', () => {
      it('shows "Data unavailable" when weather is null', () => {
        const noWeatherBeach: BeachSummary = {
          ...mockBeachSummary,
          currentWeather: null
        }
        renderWithRouter(<BeachCard beach={noWeatherBeach} />)

        expect(screen.getByText(/Data unavailable/i)).toBeInTheDocument()
      })

      it('shows last updated timestamp', () => {
        const noWeatherBeach: BeachSummary = {
          ...mockBeachSummary,
          currentWeather: null
        }
        renderWithRouter(<BeachCard beach={noWeatherBeach} />)

        expect(screen.getByText(/Last updated/i)).toBeInTheDocument()
      })
    })

    describe('loading state', () => {
      it('shows skeleton when loading', () => {
        renderWithRouter(<BeachCard beach={null} loading={true} />)

        expect(screen.getByTestId('beach-card-skeleton')).toBeInTheDocument()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement BeachCard component:
  ```typescript
  import { Link } from 'react-router-dom'
  import type { BeachSummary, WaterQualityLevel } from '@shared/types'

  interface BeachCardProps {
    beach: BeachSummary | null
    loading?: boolean
  }

  const qualityColors: Record<WaterQualityLevel, string> = {
    'good': 'bg-green-500',
    'advisory': 'bg-yellow-500',
    'closed': 'bg-red-500',
    'unknown': 'bg-gray-400',
    'off-season': 'bg-blue-300'
  }

  const weatherIcons: Record<string, string> = {
    'sunny': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'stormy': '⛈️',
    'foggy': '🌫️'
  }

  export function BeachCard({ beach, loading = false }: BeachCardProps) {
    if (loading || !beach) {
      return (
        <div
          data-testid="beach-card-skeleton"
          className="animate-pulse bg-white rounded-lg shadow p-4"
        >
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      )
    }

    const { id, name, currentWeather, nextTide, waterQuality, lastUpdated } = beach
    const hasData = currentWeather !== null

    return (
      <Link
        to={`/beach/${id}`}
        className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
      >
        <h3 className="text-lg font-semibold mb-2">{name}</h3>

        {hasData ? (
          <>
            {/* Weather Summary */}
            <div className="flex items-center gap-2 mb-2">
              <span data-testid="weather-icon" className="text-xl">
                {weatherIcons[currentWeather.condition] || '🌡️'}
              </span>
              <span className="font-medium">
                {currentWeather.temperature.toFixed(1)}°C
              </span>
            </div>

            {/* Next Tide */}
            {nextTide && (
              <div className="text-sm text-gray-600 mb-2">
                Next {nextTide.type} tide:{' '}
                {new Date(nextTide.time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/Vancouver'
                })}
              </div>
            )}

            {/* Water Quality Badge */}
            <div
              data-testid="water-quality-badge"
              className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${qualityColors[waterQuality]}`}
            >
              {waterQuality}
            </div>
          </>
        ) : (
          <div className="text-gray-500">
            <p>Data unavailable</p>
            <p className="text-xs">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        )}
      </Link>
    )
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify card shows all summary information
- [ ] Verify card links to `/beach/:slug`
- [ ] Verify data unavailable state handled
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Card shows beach name, weather summary, tide indicator, water quality badge
- [ ] Card links to `/beach/:slug`
- [ ] Data unavailable state handled with timestamp
- [ ] Loading skeleton displayed when loading
- [ ] Water quality badge colors correct
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display each beach with name, conditions summary, status indicators"
- AC: "If any data source is unavailable, display 'Data unavailable' with timestamp"
- Component: BeachCard (`/client/src/components/BeachCard.tsx`)
- Props: `beach: BeachSummary`

## Notes

- Impact scope: Dashboard Page (TASK-028) will use this component
- Constraints: Must be clickable/tappable to navigate to detail page
- Summary data comes from BeachSummary type
- Weather icon should match condition
