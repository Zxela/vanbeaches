# Task: TASK-011 useTides Custom Hook

Metadata:
- Phase: 2 - Tides Slice
- Dependencies: TASK-006 (React Client), TASK-010 (Tides API Route)
- Provides: React hook for fetching tide data with loading/error states
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the useTides custom React hook that fetches tide data from the `/api/tides/:beachId` endpoint. The hook manages loading and error states, handles refetch on beachId change, and implements a stale-while-revalidate pattern for optimal UX.

## Target Files

- [ ] `/home/zxela/workspace/client/src/hooks/useTides.ts`
- [ ] `/home/zxela/workspace/client/src/hooks/__tests__/useTides.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-006: React client available at `/client/src/`
  - TASK-010: Tides API available at `/api/tides/:beachId`
- [ ] Write failing tests for useTides hook:
  ```typescript
  import { renderHook, waitFor } from '@testing-library/react'
  import { vi, describe, it, expect } from 'vitest'
  import { useTides } from '../useTides'

  describe('useTides', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('returns loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useTides('english-bay'))

      expect(result.current.loading).toBe(true)
      expect(result.current.tides).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('returns tide data on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          beachId: 'english-bay',
          predictions: [
            { time: '2026-01-17T06:30:00Z', height: 3.45, type: 'high' }
          ]
        }
      }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { result } = renderHook(() => useTides('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.tides).toEqual(mockResponse.data)
      expect(result.current.error).toBeNull()
    })

    it('returns error state on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTides('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.tides).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('refetches when beachId changes', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { beachId: 'english-bay' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { beachId: 'kitsilano-beach' } })
        })

      const { result, rerender } = renderHook(
        ({ beachId }) => useTides(beachId),
        { initialProps: { beachId: 'english-bay' } }
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.tides?.beachId).toBe('english-bay')

      rerender({ beachId: 'kitsilano-beach' })

      await waitFor(() => expect(result.current.tides?.beachId).toBe('kitsilano-beach'))
    })

    it('provides refetch function', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      })

      const { result } = renderHook(() => useTides('english-bay'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(typeof result.current.refetch).toBe('function')
      await result.current.refetch()

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement useTides hook:
  ```typescript
  import { useState, useEffect, useCallback } from 'react'
  import type { TideData, ApiResponse } from '@shared/types'

  interface UseTidesResult {
    tides: TideData | null
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
  }

  export function useTides(beachId: string): UseTidesResult {
    const [tides, setTides] = useState<TideData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTides = useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/tides/${beachId}`)
        const result: ApiResponse<TideData> = await response.json()

        if (result.success && result.data) {
          setTides(result.data)
        } else {
          setError(result.error || 'Failed to fetch tide data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }, [beachId])

    useEffect(() => {
      fetchTides()
    }, [fetchTides])

    return {
      tides,
      loading,
      error,
      refetch: fetchTides
    }
  }
  ```
- [ ] Implement stale-while-revalidate pattern (optional enhancement)
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify hook returns `{ tides, loading, error, refetch }`
- [ ] Verify loading state shown during fetch
- [ ] Verify error state populated on failure
- [ ] Verify refetch available for manual refresh
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Hook returns `{ tides, loading, error, refetch }`
- [ ] Loading state shown during fetch
- [ ] Error state populated on failure
- [ ] Refetch available for manual refresh
- [ ] Refetch triggered on beachId change
- [ ] Unit tests pass with mocked fetch
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Component: useTides hook for data fetching
- Responsibility: Fetch tide data, manage loading/error states
- UI Behavior: "While loading, display loading skeleton"

## Notes

- Impact scope: TideChart Component (TASK-012) depends on this hook
- Constraints: Must handle beachId changes correctly
- Consider implementing SWR or React Query pattern for stale-while-revalidate
- Error handling should be user-friendly (not technical error messages)
