# Task: TASK-021 useWaterQuality Custom Hook

Metadata:
- Phase: 4 - Water Quality Slice
- Dependencies: TASK-006 (React Client), TASK-020 (Water Quality API Route)
- Provides: React hook for fetching water quality data with loading/error states
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the useWaterQuality custom React hook that fetches water quality data from the `/api/water-quality/:beachId` endpoint. The hook manages loading and error states.

## Target Files

- [ ] `/home/zxela/workspace/client/src/hooks/useWaterQuality.ts`
- [ ] `/home/zxela/workspace/client/src/hooks/__tests__/useWaterQuality.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-006: React client available at `/client/src/`
  - TASK-020: Water Quality API available at `/api/water-quality/:beachId`
- [ ] Write failing tests for useWaterQuality hook:
  ```typescript
  import { renderHook, waitFor } from '@testing-library/react'
  import { vi, describe, it, expect, beforeEach } from 'vitest'
  import { useWaterQuality } from '../useWaterQuality'

  describe('useWaterQuality', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('returns loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useWaterQuality('english-bay'))

      expect(result.current.loading).toBe(true)
      expect(result.current.waterQuality).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('returns water quality data on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          beachId: 'english-bay',
          level: 'good',
          ecoliCount: 50,
          sampleDate: '2026-01-15T00:00:00Z'
        }
      }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { result } = renderHook(() => useWaterQuality('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.waterQuality).toEqual(mockResponse.data)
      expect(result.current.error).toBeNull()
    })

    it('returns error state on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useWaterQuality('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.waterQuality).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('refetches when beachId changes', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { beachId: 'english-bay', level: 'good' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { beachId: 'kitsilano-beach', level: 'advisory' }
          })
        })

      const { result, rerender } = renderHook(
        ({ beachId }) => useWaterQuality(beachId),
        { initialProps: { beachId: 'english-bay' } }
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.waterQuality?.level).toBe('good')

      rerender({ beachId: 'kitsilano-beach' })

      await waitFor(() => expect(result.current.waterQuality?.level).toBe('advisory'))
    })

    it('provides refetch function', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { level: 'good' } })
      })

      const { result } = renderHook(() => useWaterQuality('english-bay'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(typeof result.current.refetch).toBe('function')
      await result.current.refetch()

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement useWaterQuality hook:
  ```typescript
  import { useState, useEffect, useCallback } from 'react'
  import type { WaterQualityStatus, ApiResponse } from '@shared/types'

  interface UseWaterQualityResult {
    waterQuality: WaterQualityStatus | null
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
  }

  export function useWaterQuality(beachId: string): UseWaterQualityResult {
    const [waterQuality, setWaterQuality] = useState<WaterQualityStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWaterQuality = useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/water-quality/${beachId}`)
        const result: ApiResponse<WaterQualityStatus> = await response.json()

        if (result.success && result.data) {
          setWaterQuality(result.data)
        } else {
          setError(result.error || 'Failed to fetch water quality data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }, [beachId])

    useEffect(() => {
      fetchWaterQuality()
    }, [fetchWaterQuality])

    return {
      waterQuality,
      loading,
      error,
      refetch: fetchWaterQuality
    }
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify hook returns `{ waterQuality, loading, error, refetch }`
- [ ] Verify proper state management during fetch cycle
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Hook returns `{ waterQuality, loading, error, refetch }`
- [ ] Loading state during fetch
- [ ] Error state on failure
- [ ] Refetch on beachId change
- [ ] Unit tests pass with mocked fetch
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Component: useWaterQuality hook for data fetching
- Responsibility: Fetch water quality data, manage loading/error states

## Notes

- Impact scope: WaterQuality Component (TASK-022) depends on this hook
- Constraints: Must handle beachId changes correctly
- Pattern follows same structure as useTides and useWeather hooks
