# Task: TASK-012 TideChart Component

Metadata:
- Phase: 2 - Tides Slice
- Dependencies: TASK-011 (useTides Hook)
- Provides: Visual tide timeline component with high/low markers
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the TideChart React component that displays a tide timeline with high/low markers. Times are formatted in 12-hour Pacific Time (h:mm A) and heights in meters with 2 decimal precision. The component shows a loading skeleton during fetch and handles error states.

## Target Files

- [ ] `/home/zxela/workspace/client/src/components/TideChart.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/TideChart.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-011: useTides hook available at `/client/src/hooks/useTides.ts`
- [ ] Write failing tests for TideChart:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi } from 'vitest'
  import { TideChart } from '../TideChart'
  import type { TideData } from '@shared/types'

  describe('TideChart', () => {
    const mockTideData: TideData = {
      beachId: 'english-bay',
      stationId: '7735',
      stationName: 'Vancouver',
      predictions: [
        { time: '2026-01-17T14:30:00-08:00', height: 3.45, type: 'high' },
        { time: '2026-01-17T20:45:00-08:00', height: 1.23, type: 'low' }
      ],
      fetchedAt: '2026-01-17T12:00:00Z'
    }

    describe('time formatting', () => {
      it('displays times in 12-hour Pacific Time format', () => {
        render(<TideChart tides={mockTideData} loading={false} />)

        expect(screen.getByText('2:30 PM')).toBeInTheDocument()
        expect(screen.getByText('8:45 PM')).toBeInTheDocument()
      })
    })

    describe('height formatting', () => {
      it('displays heights in meters with 2 decimal precision', () => {
        render(<TideChart tides={mockTideData} loading={false} />)

        expect(screen.getByText('3.45 m')).toBeInTheDocument()
        expect(screen.getByText('1.23 m')).toBeInTheDocument()
      })
    })

    describe('loading state', () => {
      it('shows loading skeleton when loading', () => {
        render(<TideChart tides={null} loading={true} />)

        expect(screen.getByTestId('tide-chart-skeleton')).toBeInTheDocument()
      })
    })

    describe('error state', () => {
      it('displays error message', () => {
        render(<TideChart tides={null} loading={false} error="Failed to load" />)

        expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
      })
    })

    describe('high/low tide markers', () => {
      it('displays high tide indicator', () => {
        render(<TideChart tides={mockTideData} loading={false} />)

        expect(screen.getByText('High')).toBeInTheDocument()
        expect(screen.getByText('Low')).toBeInTheDocument()
      })
    })

    describe('accessibility', () => {
      it('has proper ARIA labels', () => {
        render(<TideChart tides={mockTideData} loading={false} />)

        expect(screen.getByRole('region', { name: /tide/i })).toBeInTheDocument()
      })
    })

    describe('not applicable state', () => {
      it('shows message when tide info not applicable', () => {
        const noTideData: TideData = {
          beachId: 'trout-lake',
          stationId: null,
          stationName: null,
          message: 'Tide information not applicable',
          predictions: [],
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<TideChart tides={noTideData} loading={false} />)

        expect(screen.getByText('Tide information not applicable')).toBeInTheDocument()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement TideChart component:
  ```typescript
  import type { TideData } from '@shared/types'
  import { formatTideTime, formatTideHeight } from '../utils/formatters'

  interface TideChartProps {
    tides: TideData | null
    loading: boolean
    error?: string | null
  }

  export function TideChart({ tides, loading, error }: TideChartProps) {
    if (loading) {
      return (
        <div data-testid="tide-chart-skeleton" className="animate-pulse">
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

    if (!tides || tides.predictions.length === 0) {
      return (
        <div className="text-gray-500">
          {tides?.message || 'No tide data available'}
        </div>
      )
    }

    return (
      <div
        role="region"
        aria-label="Tide predictions"
        className="tide-chart"
      >
        <h3 className="text-lg font-semibold mb-4">Tides</h3>
        <div className="space-y-2">
          {tides.predictions.map((prediction, index) => (
            <div
              key={index}
              className={`flex justify-between items-center p-2 rounded ${
                prediction.type === 'high' ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <span className="font-medium">
                {prediction.type === 'high' ? 'High' : 'Low'}
              </span>
              <span>{formatTideTime(prediction.time)}</span>
              <span>{formatTideHeight(prediction.height)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Utility functions
  export function formatTideTime(isoTime: string): string {
    const date = new Date(isoTime)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Vancouver'
    })
  }

  export function formatTideHeight(height: number): string {
    return `${height.toFixed(2)} m`
  }
  ```
- [ ] Implement loading skeleton with Tailwind
- [ ] Implement visual tide timeline (optional enhancement)
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify times display as "2:30 PM" format
- [ ] Verify heights display as "3.45 m" format
- [ ] Verify accessible with proper ARIA labels
- [ ] Verify loading skeleton shows during fetch
- [ ] Verify error state displays correctly
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Component renders tide predictions visually
- [ ] Times display as "2:30 PM" format (12-hour Pacific Time)
- [ ] Heights display as "3.45 m" format (2 decimal precision)
- [ ] Accessible with proper ARIA labels
- [ ] Loading skeleton during fetch
- [ ] Error state handled
- [ ] "Not applicable" message for Trout Lake
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Tide times in Pacific Time 12-hour format" (property: `tideTime.format === 'h:mm A'`)
- AC: "Tide heights in meters with two decimal precision"
- AC: "If beach has no associated tide station, display 'Tide information not applicable'"
- Component: TideChart (`/client/src/components/TideChart.tsx`)
- Props: `tides: TidePrediction[], timezone: string`

## Notes

- Impact scope: BeachDetail Page (TASK-025) will use this component
- Constraints: Time format must be 12-hour with AM/PM
- Timezone: America/Vancouver (Pacific Time)
- Consider visual timeline with chart library (optional enhancement)
