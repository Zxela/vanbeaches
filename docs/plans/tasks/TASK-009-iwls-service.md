# Task: TASK-009 IWLS Service with API Integration

Metadata:
- Phase: 2 - Tides Slice
- Dependencies: TASK-003 (Cache Manager), TASK-004 (Rate Limiter), TASK-007 (Beach Config)
- Provides: Service to fetch tide predictions from Canadian Hydrographic Service IWLS API
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the IWLS Service that communicates with the Canadian Hydrographic Service IWLS API to fetch tide predictions. The service integrates with the Rate Limiter (3 req/sec) and Cache Manager, handles HTTP 429 responses gracefully, and transforms API responses to typed TidePrediction arrays.

## Target Files

- [ ] `/home/zxela/workspace/server/src/services/iwlsService.ts`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/iwlsService.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-003: CacheManager available at `/server/src/cache/cacheManager.ts`
  - TASK-004: RateLimiter available at `/server/src/cache/rateLimiter.ts`
  - TASK-007: Beach config available at `/shared/data/beaches.ts`
- [ ] Write failing tests for IWLS Service:
  ```typescript
  describe('IWLSService', () => {
    describe('getTidePredictions', () => {
      it('returns typed TidePrediction array', async () => {
        const mockResponse = {
          data: [
            { eventDate: '2026-01-17T06:30:00Z', value: 3.45, qcFlagCode: 'P' },
            { eventDate: '2026-01-17T12:45:00Z', value: 1.23, qcFlagCode: 'P' }
          ]
        }
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

        const result = await iwlsService.getTidePredictions('7735', from, to)

        expect(result).toHaveLength(2)
        expect(result[0]).toMatchObject({
          time: expect.any(String),
          height: 3.45,
          type: 'high' // or 'low' based on algorithm
        })
      })

      it('integrates with rate limiter', async () => {
        // ... test rate limiter integration
      })

      it('returns cached data on HTTP 429', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 429
        })
        cache.set('tide:7735', cachedData, 100000)

        const result = await iwlsService.getTidePredictions('7735', from, to)

        expect(result).toEqual(cachedData)
      })

      it('integrates with cache manager', async () => {
        const mockData = [{ time: '...', height: 3.0, type: 'high' }]
        cache.set('tide:7735', mockData, 100000)

        const result = await iwlsService.getTidePredictions('7735', from, to)

        expect(fetch).not.toHaveBeenCalled() // Served from cache
        expect(result).toEqual(mockData)
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement IWLS Service:
  ```typescript
  import { TidePrediction, TideData } from '@van-beaches/shared'
  import { cacheManager } from '../cache/cacheManager'
  import { rateLimiter } from '../cache/rateLimiter'

  const IWLS_BASE_URL = 'https://api-iwls.dfo-mpo.gc.ca/api/v1'
  const TIDE_CACHE_TTL = 3600000 // 1 hour

  export class IWLSService {
    async getTidePredictions(
      stationId: string,
      from: Date,
      to: Date
    ): Promise<TidePrediction[]> {
      const cacheKey = `tide:${stationId}:${from.toISOString()}:${to.toISOString()}`

      return cacheManager.getOrFetch(
        cacheKey,
        async () => {
          // Acquire rate limit slot
          const canProceed = await rateLimiter.acquireSlot('iwls')
          if (!canProceed) {
            throw new Error('RATE_LIMITED')
          }

          try {
            const response = await fetch(
              `${IWLS_BASE_URL}/stations/${stationId}/data?` +
              `time-series-code=wlp&from=${from.toISOString()}&to=${to.toISOString()}`
            )

            if (response.status === 429) {
              throw new Error('RATE_LIMITED')
            }

            if (!response.ok) {
              throw new Error(`IWLS API error: ${response.status}`)
            }

            const data = await response.json()
            return this.transformResponse(data)
          } finally {
            rateLimiter.release('iwls')
          }
        },
        TIDE_CACHE_TTL
      )
    }

    private transformResponse(apiResponse: unknown): TidePrediction[] {
      // Transform IWLS API response to TidePrediction[]
      // Identify high/low tides based on local maxima/minima
    }
  }

  export const iwlsService = new IWLSService()
  ```
- [ ] Implement response transformation (identify high/low tides)
- [ ] Implement error handling for HTTP 429
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Ensure service returns typed TidePrediction array
- [ ] Verify rate limiting prevents API abuse
- [ ] Verify cached data served when rate limited
- [ ] Verify error handling follows Design Doc patterns
- [ ] Confirm added tests pass

## IWLS API Reference

```
Base URL: https://api-iwls.dfo-mpo.gc.ca/api/v1
Endpoint: GET /stations/{stationId}/data
Query Params:
  - time-series-code: wlp (water level predictions)
  - from: ISO 8601 date
  - to: ISO 8601 date

Response Format:
{
  "data": [
    {
      "eventDate": "2026-01-17T06:30:00Z",
      "value": 3.45,
      "qcFlagCode": "P"
    }
  ]
}
```

## Completion Criteria

- [ ] Service returns typed TidePrediction array
- [ ] Rate limiting prevents API abuse (3 req/sec)
- [ ] Cached data served when rate limited (HTTP 429)
- [ ] Error handling follows Design Doc patterns
- [ ] Unit tests pass with mocked HTTP client
- [ ] Integration test passes with sandbox/live API
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "When a user views a beach, display next 3 high and low tides"
- AC: "If IWLS API rate limit exceeded, serve cached data"
- Integration Boundary: "On Error: Return cached data or error object with retry timestamp"
- Error Handling: "IWLS Rate Limit -> HTTP 429 -> Serve cached data -> Warn level log"

## Notes

- Impact scope: Tides API Route (TASK-010) depends on this service
- Constraints: IWLS API rate limit of 3 req/sec
- Tide station 7735 is used for all 8 coastal beaches
- Trout Lake (no tideStationId) handled at route level, not here
