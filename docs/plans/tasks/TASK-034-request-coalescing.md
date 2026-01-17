# Task: TASK-034 Request Coalescing Enhancement

Metadata:
- Phase: 6 - Optimization
- Dependencies: TASK-003 (Cache Manager)
- Provides: Enhanced request coalescing to prevent duplicate concurrent API calls
- Size: Small (1 file update + tests)
- Verification Level: L2 (Tests)

## Implementation Content

Enhance the Cache Manager with improved in-flight request tracking to prevent duplicate concurrent API calls for the same cache key. Multiple requests for the same key should receive the same Promise, ensuring only one external API call is made.

## Target Files

- [ ] `/home/zxela/workspace/server/src/cache/cacheManager.ts` (enhancement)
- [ ] `/home/zxela/workspace/server/src/cache/__tests__/cacheManager.test.ts` (additional tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-003: CacheManager already has basic coalescing
- [ ] Write additional failing tests for enhanced coalescing:
  ```typescript
  describe('CacheManager - Request Coalescing', () => {
    describe('concurrent request scenarios', () => {
      it('makes only one API call for 10 concurrent requests', async () => {
        const fetcher = vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve('data'), 100))
        )

        // Fire 10 concurrent requests
        const promises = Array(10).fill(null).map(() =>
          cache.getOrFetch('key', fetcher, 10000)
        )

        const results = await Promise.all(promises)

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(results).toEqual(Array(10).fill('data'))
      })

      it('handles concurrent requests with slow API response', async () => {
        let resolveApi: (value: string) => void
        const fetcher = vi.fn().mockImplementation(() =>
          new Promise(resolve => { resolveApi = resolve })
        )

        const promise1 = cache.getOrFetch('slow-key', fetcher, 10000)
        const promise2 = cache.getOrFetch('slow-key', fetcher, 10000)
        const promise3 = cache.getOrFetch('slow-key', fetcher, 10000)

        // Simulate slow API response
        await new Promise(r => setTimeout(r, 50))
        resolveApi!('slow-data')

        const results = await Promise.all([promise1, promise2, promise3])

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(results).toEqual(['slow-data', 'slow-data', 'slow-data'])
      })

      it('handles fetcher rejection for all waiting requests', async () => {
        const fetcher = vi.fn().mockRejectedValue(new Error('API Error'))

        const promises = Array(5).fill(null).map(() =>
          cache.getOrFetch('error-key', fetcher, 10000).catch(e => e.message)
        )

        const results = await Promise.all(promises)

        expect(fetcher).toHaveBeenCalledTimes(1)
        expect(results).toEqual(Array(5).fill('API Error'))
      })

      it('cleans up in-flight tracking after completion', async () => {
        const fetcher = vi.fn().mockResolvedValue('data')

        await cache.getOrFetch('cleanup-key', fetcher, 10000)

        // Second call after first completes should make new API call
        await cache.getOrFetch('cleanup-key', fetcher, 10000)

        // But since it's cached, fetcher shouldn't be called again
        expect(fetcher).toHaveBeenCalledTimes(1)
      })

      it('makes new API call after cache expires', async () => {
        const fetcher = vi.fn()
          .mockResolvedValueOnce('data1')
          .mockResolvedValueOnce('data2')

        await cache.getOrFetch('expire-key', fetcher, 50) // 50ms TTL

        await new Promise(r => setTimeout(r, 100)) // Wait for expiry

        const result = await cache.getOrFetch('expire-key', fetcher, 50)

        expect(fetcher).toHaveBeenCalledTimes(2)
        expect(result).toBe('data2')
      })
    })

    describe('different keys', () => {
      it('makes separate API calls for different keys', async () => {
        const fetcher = vi.fn().mockResolvedValue('data')

        await Promise.all([
          cache.getOrFetch('key-a', fetcher, 10000),
          cache.getOrFetch('key-b', fetcher, 10000),
          cache.getOrFetch('key-c', fetcher, 10000)
        ])

        expect(fetcher).toHaveBeenCalledTimes(3)
      })
    })
  })
  ```
- [ ] Run tests and confirm any failures

### 2. Green Phase
- [ ] Enhance Cache Manager if needed:
  ```typescript
  export class CacheManager {
    private cache: Map<string, CacheEntry<unknown>> = new Map()
    private inFlight: Map<string, Promise<unknown>> = new Map()
    private maxSize: number = 1000

    async getOrFetch<T>(
      key: string,
      fetcher: () => Promise<T>,
      ttlMs: number
    ): Promise<T> {
      // Check cache first
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // Check if there's already an in-flight request for this key
      const existing = this.inFlight.get(key)
      if (existing) {
        return existing as Promise<T>
      }

      // Create new fetch promise
      const fetchPromise = (async () => {
        try {
          const value = await fetcher()
          await this.set(key, value, ttlMs)
          return value
        } finally {
          // Clean up in-flight tracking
          this.inFlight.delete(key)
        }
      })()

      // Track in-flight request
      this.inFlight.set(key, fetchPromise)

      return fetchPromise
    }

    // ... rest of implementation
  }
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify concurrent requests for same data coalesced
- [ ] Verify only one external API call made per unique key
- [ ] Verify all waiting requests receive result
- [ ] Verify error propagates to all waiting requests
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Concurrent requests for same data coalesced
- [ ] Only one external API call made per unique key
- [ ] All waiting requests receive same result
- [ ] Errors propagate to all waiting requests
- [ ] In-flight tracking cleaned up properly
- [ ] Unit tests pass for concurrent request scenarios
- [ ] Verification: L2 (Tests)

## AC References from Design Doc

- AC: "Implement request coalescing for concurrent requests"
- Cache State Machine: "Only one fetch operation per cache key at a time"
- Performance: Reduces external API calls under concurrent load

## Notes

- Impact scope: All services using Cache Manager benefit
- Constraints: Must handle both success and error cases
- In-flight requests must be cleaned up to avoid memory leaks
- Enhancement to existing TASK-003 implementation
