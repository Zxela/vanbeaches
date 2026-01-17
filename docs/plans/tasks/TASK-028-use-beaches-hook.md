# Task: TASK-028 useBeaches Custom Hook

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-006 (React Client), TASK-027 (Beaches API Route)
- Provides: React hook for fetching all beach summaries for dashboard
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the useBeaches custom React hook that fetches all beach summaries from the `/api/beaches` endpoint for the dashboard display. The hook manages loading and error states.

## Target Files

- [ ] `/home/zxela/workspace/client/src/hooks/useBeaches.ts`
- [ ] `/home/zxela/workspace/client/src/hooks/__tests__/useBeaches.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-006: React client available at `/client/src/`
  - TASK-027: Beaches API available at `/api/beaches`
- [ ] Write failing tests for useBeaches hook:
  ```typescript
  import { renderHook, waitFor } from '@testing-library/react'
  import { vi, describe, it, expect, beforeEach } from 'vitest'
  import { useBeaches } from '../useBeaches'

  describe('useBeaches', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('returns loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useBeaches())

      expect(result.current.loading).toBe(true)
      expect(result.current.beaches).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns array of 9 BeachSummary objects on success', async () => {
      const mockBeaches = Array(9).fill(null).map((_, i) => ({
        id: `beach-${i}`,
        name: `Beach ${i}`,
        currentWeather: { temperature: 15, condition: 'sunny' },
        nextTide: { type: 'high', time: '2026-01-17T14:00:00Z', height: 3.0 },
        waterQuality: 'good',
        lastUpdated: '2026-01-17T12:00:00Z'
      }))

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockBeaches })
      })

      const { result } = renderHook(() => useBeaches())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.beaches).toHaveLength(9)
      expect(result.current.error).toBeNull()
    })

    it('returns error state on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBeaches())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.beaches).toEqual([])
      expect(result.current.error).toBe('Network error')
    })

    it('provides refetch function', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })

      const { result } = renderHook(() => useBeaches())

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(typeof result.current.refetch).toBe('function')
      await result.current.refetch()

      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('handles empty response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })

      const { result } = renderHook(() => useBeaches())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.beaches).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement useBeaches hook:
  ```typescript
  import { useState, useEffect, useCallback } from 'react'
  import type { BeachSummary, ApiResponse } from '@shared/types'

  interface UseBeachesResult {
    beaches: BeachSummary[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
  }

  export function useBeaches(): UseBeachesResult {
    const [beaches, setBeaches] = useState<BeachSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBeaches = useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/beaches')
        const result: ApiResponse<BeachSummary[]> = await response.json()

        if (result.success && result.data) {
          setBeaches(result.data)
        } else {
          setError(result.error || 'Failed to fetch beaches')
          setBeaches([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setBeaches([])
      } finally {
        setLoading(false)
      }
    }, [])

    useEffect(() => {
      fetchBeaches()
    }, [fetchBeaches])

    return {
      beaches,
      loading,
      error,
      refetch: fetchBeaches
    }
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify hook returns `{ beaches, loading, error, refetch }`
- [ ] Verify returns array of 9 BeachSummary objects
- [ ] Verify error handling works correctly
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Hook returns `{ beaches, loading, error, refetch }`
- [ ] Returns array of 9 BeachSummary objects on success
- [ ] Loading state during fetch
- [ ] Error state on failure
- [ ] Unit tests pass with mocked fetch
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display all 9 Vancouver beaches" -> beaches array has 9 items
- Component: useBeaches hook for data fetching
- Responsibility: Fetch dashboard summary, manage loading/error states

## Notes

- Impact scope: Dashboard Page (TASK-029) depends on this hook
- Constraints: Must return exactly 9 beach summaries
- Pattern follows same structure as other data hooks
