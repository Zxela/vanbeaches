# Task: TASK-022 WaterQuality Component

Metadata:
- Phase: 4 - Water Quality Slice
- Dependencies: TASK-021 (useWaterQuality Hook)
- Provides: Water quality status display with color-coded badges
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the WaterQuality React component that displays water quality status with color-coded badges (green/yellow/red), advisory reason when applicable, last sample date, and off-season message when applicable.

## Target Files

- [ ] `/home/zxela/workspace/client/src/components/WaterQuality.tsx`
- [ ] `/home/zxela/workspace/client/src/components/__tests__/WaterQuality.test.tsx`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-021: useWaterQuality hook available at `/client/src/hooks/useWaterQuality.ts`
- [ ] Write failing tests for WaterQuality component:
  ```typescript
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { WaterQuality } from '../WaterQuality'
  import type { WaterQualityStatus } from '@shared/types'

  describe('WaterQuality', () => {
    describe('status badges', () => {
      it('displays green badge for "good" status', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'good',
          ecoliCount: 50,
          advisoryReason: null,
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toHaveClass('bg-green')
        expect(badge).toHaveTextContent(/good/i)
      })

      it('displays yellow badge for "advisory" status', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'advisory',
          ecoliCount: 250,
          advisoryReason: 'Elevated E.coli levels',
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toHaveClass('bg-yellow')
        expect(badge).toHaveTextContent(/advisory/i)
      })

      it('displays red badge for "closed" status', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'closed',
          ecoliCount: 500,
          advisoryReason: 'Beach closed due to contamination',
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        const badge = screen.getByTestId('water-quality-badge')
        expect(badge).toHaveClass('bg-red')
        expect(badge).toHaveTextContent(/closed/i)
      })
    })

    describe('advisory reason', () => {
      it('displays advisory reason when status is advisory', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'advisory',
          ecoliCount: 250,
          advisoryReason: 'Elevated E.coli levels due to recent rainfall',
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.getByText(/Elevated E\.coli levels/)).toBeInTheDocument()
      })

      it('displays advisory reason when status is closed', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'closed',
          ecoliCount: 500,
          advisoryReason: 'Beach closed due to sewage overflow',
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.getByText(/sewage overflow/)).toBeInTheDocument()
      })

      it('does not display advisory reason for good status', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'good',
          ecoliCount: 50,
          advisoryReason: null,
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.queryByTestId('advisory-reason')).not.toBeInTheDocument()
      })
    })

    describe('sample date', () => {
      it('displays last sample date', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'good',
          ecoliCount: 50,
          advisoryReason: null,
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.getByText(/Jan 15/i)).toBeInTheDocument()
      })
    })

    describe('off-season', () => {
      it('displays off-season message during October-April', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'off-season',
          ecoliCount: null,
          advisoryReason: null,
          sampleDate: null,
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.getByText(/Monitoring resumes in May/i)).toBeInTheDocument()
      })
    })

    describe('loading state', () => {
      it('shows loading skeleton when loading', () => {
        render(<WaterQuality status={null} loading={true} />)

        expect(screen.getByTestId('water-quality-skeleton')).toBeInTheDocument()
      })
    })

    describe('error state', () => {
      it('displays error message', () => {
        render(<WaterQuality status={null} loading={false} error="Failed to load" />)

        expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
      })
    })

    describe('unknown status', () => {
      it('displays unknown status appropriately', () => {
        const status: WaterQualityStatus = {
          beachId: 'english-bay',
          level: 'unknown',
          ecoliCount: null,
          advisoryReason: null,
          sampleDate: null,
          fetchedAt: '2026-01-17T12:00:00Z'
        }

        render(<WaterQuality status={status} loading={false} />)

        expect(screen.getByText(/unknown/i)).toBeInTheDocument()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement WaterQuality component:
  ```typescript
  import type { WaterQualityStatus, WaterQualityLevel } from '@shared/types'

  interface WaterQualityProps {
    status: WaterQualityStatus | null
    loading: boolean
    error?: string | null
  }

  const statusColors: Record<WaterQualityLevel, string> = {
    'good': 'bg-green-500 text-white',
    'advisory': 'bg-yellow-500 text-black',
    'closed': 'bg-red-500 text-white',
    'unknown': 'bg-gray-400 text-white',
    'off-season': 'bg-blue-300 text-gray-700'
  }

  const statusLabels: Record<WaterQualityLevel, string> = {
    'good': 'Good - Safe for Swimming',
    'advisory': 'Advisory',
    'closed': 'Closed',
    'unknown': 'Unknown',
    'off-season': 'Off-Season'
  }

  export function WaterQuality({ status, loading, error }: WaterQualityProps) {
    if (loading) {
      return (
        <div data-testid="water-quality-skeleton" className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48" />
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

    if (!status) {
      return <div className="text-gray-500">No water quality data available</div>
    }

    const { level, advisoryReason, sampleDate } = status

    return (
      <div className="water-quality" role="region" aria-label="Water quality status">
        <h3 className="text-lg font-semibold mb-2">Water Quality</h3>

        {/* Status Badge */}
        <div
          data-testid="water-quality-badge"
          className={`inline-block px-3 py-1 rounded-full font-medium ${statusColors[level]}`}
        >
          {statusLabels[level]}
        </div>

        {/* Advisory Reason */}
        {(level === 'advisory' || level === 'closed') && advisoryReason && (
          <div data-testid="advisory-reason" className="mt-2 text-sm text-gray-700">
            <strong>Reason:</strong> {advisoryReason}
          </div>
        )}

        {/* Off-Season Message */}
        {level === 'off-season' && (
          <div className="mt-2 text-sm text-gray-600">
            Monitoring resumes in May
          </div>
        )}

        {/* Sample Date */}
        {sampleDate && (
          <div className="mt-2 text-xs text-gray-500">
            Last sampled: {new Date(sampleDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        )}
      </div>
    )
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify status badge colors match status (green/yellow/red)
- [ ] Verify advisory reason visible for Advisory/Closed
- [ ] Verify sample date displayed
- [ ] Verify off-season message shown October-April
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Component renders status with appropriate colors
- [ ] Green badge for "good", yellow for "advisory", red for "closed"
- [ ] Advisory reason visible for Advisory/Closed
- [ ] Sample date displayed
- [ ] Off-season message shown ("Monitoring resumes in May")
- [ ] Loading skeleton during fetch
- [ ] Error state handled
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display water quality status as Good/Advisory/Closed/Unknown/Off-Season"
- AC: "When Advisory or Closed, display advisory reason"
- AC: "Display date of last water quality sample"
- AC: "If off-season, display 'Monitoring resumes in May'"
- Property: `lastSampleDate instanceof Date`
- Component: WaterQuality Indicator (`/client/src/components/WaterQuality.tsx`)

## Notes

- Impact scope: BeachDetail Page (TASK-025) will use this component
- Constraints: Color coding must be accessible (contrast ratios)
- Off-season: October through April
- Sample date format should be user-friendly (e.g., "Jan 15, 2026")
