# Task: TASK-016 useWeather Custom Hook

Metadata:
- Phase: 3 - Weather Slice
- Dependencies: TASK-006 (React Client), TASK-015 (Weather API Route)
- Provides: React hook for fetching weather data with loading/error states
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the useWeather custom React hook that fetches weather data from the `/api/weather/:beachId` endpoint. The hook manages loading and error states and handles refetch on beachId change.

## Target Files

- [ ] `/home/zxela/workspace/client/src/hooks/useWeather.ts`
- [ ] `/home/zxela/workspace/client/src/hooks/__tests__/useWeather.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-006: React client available at `/client/src/`
  - TASK-015: Weather API available at `/api/weather/:beachId`
- [ ] Write failing tests for useWeather hook:
  ```typescript
  import { renderHook, waitFor } from '@testing-library/react'
  import { vi, describe, it, expect } from 'vitest'
  import { useWeather } from '../useWeather'

  describe('useWeather', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('returns loading state initially', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useWeather('english-bay'))

      expect(result.current.loading).toBe(true)
      expect(result.current.weather).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('returns weather data on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          beachId: 'english-bay',
          current: { temperature: 15.5, condition: 'partly-cloudy' },
          hourly: []
        }
      }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const { result } = renderHook(() => useWeather('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.weather).toEqual(mockResponse.data)
      expect(result.current.error).toBeNull()
    })

    it('returns error state on failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useWeather('english-bay'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.weather).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('refetches when beachId changes', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { beachId: 'english-bay', current: { temperature: 15 } }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { beachId: 'kitsilano-beach', current: { temperature: 17 } }
          })
        })

      const { result, rerender } = renderHook(
        ({ beachId }) => useWeather(beachId),
        { initialProps: { beachId: 'english-bay' } }
      )

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.weather?.current.temperature).toBe(15)

      rerender({ beachId: 'kitsilano-beach' })

      await waitFor(() => expect(result.current.weather?.current.temperature).toBe(17))
    })

    it('provides refetch function', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { current: {} } })
      })

      const { result } = renderHook(() => useWeather('english-bay'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(typeof result.current.refetch).toBe('function')
      await result.current.refetch()

      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement useWeather hook:
  ```typescript
  import { useState, useEffect, useCallback } from 'react'
  import type { WeatherForecast, ApiResponse } from '@shared/types'

  interface UseWeatherResult {
    weather: WeatherForecast | null
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
  }

  export function useWeather(beachId: string): UseWeatherResult {
    const [weather, setWeather] = useState<WeatherForecast | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchWeather = useCallback(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/weather/${beachId}`)
        const result: ApiResponse<WeatherForecast> = await response.json()

        if (result.success && result.data) {
          setWeather(result.data)
        } else {
          setError(result.error || 'Failed to fetch weather data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }, [beachId])

    useEffect(() => {
      fetchWeather()
    }, [fetchWeather])

    return {
      weather,
      loading,
      error,
      refetch: fetchWeather
    }
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify hook returns `{ weather, loading, error, refetch }`
- [ ] Verify proper state management during fetch cycle
- [ ] Verify refetch on beachId change
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Hook returns `{ weather, loading, error, refetch }`
- [ ] Proper state management during fetch cycle
- [ ] Refetch triggered on beachId change
- [ ] Unit tests pass with mocked fetch
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Component: useWeather hook for data fetching
- Responsibility: Fetch weather data, manage loading/error states

## Notes

- Impact scope: WeatherWidget Component (TASK-017) depends on this hook
- Constraints: Must handle beachId changes correctly
- Pattern follows same structure as useTides hook
