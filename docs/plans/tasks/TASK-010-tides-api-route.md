# Task: TASK-010 Tides API Route

Metadata:
- Phase: 2 - Tides Slice
- Dependencies: TASK-009 (IWLS Service), TASK-005 (Express Server)
- Provides: REST endpoint for tide data at `/api/tides/:beachId`
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Tides API Route that exposes tide data at `GET /api/tides/:beachId`. The route validates the beachId, maps it to the tide station using beach config, calls the IWLS Service, and returns an ApiResponse<TideData> format. Special handling for Trout Lake (returns "not applicable" message).

## Target Files

- [ ] `/home/zxela/workspace/server/src/routes/tidesRoute.ts`
- [ ] `/home/zxela/workspace/server/src/routes/__tests__/tidesRoute.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-009: IWLSService available at `/server/src/services/iwlsService.ts`
  - TASK-005: Express server available at `/server/src/index.ts`
- [ ] Write failing tests for Tides Route:
  ```typescript
  describe('GET /api/tides/:beachId', () => {
    describe('valid beach', () => {
      it('returns tide data in ApiResponse format', async () => {
        vi.mocked(iwlsService.getTidePredictions).mockResolvedValueOnce([
          { time: '2026-01-17T06:30:00Z', height: 3.45, type: 'high' },
          { time: '2026-01-17T12:45:00Z', height: 1.23, type: 'low' }
        ])

        const response = await request(app)
          .get('/api/tides/english-bay')

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            beachId: 'english-bay',
            stationId: '7735',
            predictions: expect.any(Array)
          },
          cached: expect.any(Boolean),
          cachedAt: expect.any(String)
        })
      })

      it('returns 6 predictions (3 high, 3 low)', async () => {
        // ... test prediction count
      })
    })

    describe('invalid beach', () => {
      it('returns 404 for invalid beachId', async () => {
        const response = await request(app)
          .get('/api/tides/invalid-beach')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          success: false,
          error: { code: 'NOT_FOUND' }
        })
      })
    })

    describe('Trout Lake (no tide station)', () => {
      it('returns appropriate message for Trout Lake', async () => {
        const response = await request(app)
          .get('/api/tides/trout-lake')

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            beachId: 'trout-lake',
            stationId: null,
            message: 'Tide information not applicable'
          }
        })
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create the tides route:
  ```typescript
  import { Router } from 'express'
  import { iwlsService } from '../services/iwlsService'
  import { getBeachById } from '@van-beaches/shared/data'
  import type { ApiResponse, TideData } from '@van-beaches/shared'

  const router = Router()

  router.get('/tides/:beachId', async (req, res) => {
    const { beachId } = req.params
    const beach = getBeachById(beachId)

    if (!beach) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Beach not found: ${beachId}` },
        data: null,
        cached: false,
        cachedAt: null
      })
    }

    // Handle Trout Lake (no tide station)
    if (!beach.tideStationId) {
      return res.json({
        success: true,
        data: {
          beachId,
          stationId: null,
          stationName: null,
          message: 'Tide information not applicable',
          predictions: []
        },
        error: null,
        cached: false,
        cachedAt: null
      })
    }

    try {
      const from = new Date()
      const to = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

      const predictions = await iwlsService.getTidePredictions(
        beach.tideStationId,
        from,
        to
      )

      // Filter to next 3 high and 3 low tides
      const highTides = predictions.filter(p => p.type === 'high').slice(0, 3)
      const lowTides = predictions.filter(p => p.type === 'low').slice(0, 3)

      const response: ApiResponse<TideData> = {
        success: true,
        data: {
          beachId,
          stationId: beach.tideStationId,
          stationName: 'Vancouver',
          predictions: [...highTides, ...lowTides].sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          ),
          fetchedAt: new Date().toISOString()
        },
        error: null,
        cached: false, // CacheManager tracks this
        cachedAt: null
      }

      res.json(response)
    } catch (error) {
      // Handle errors (rate limit, API failure)
    }
  })

  export { router as tidesRouter }
  ```
- [ ] Mount route in Express server
- [ ] Implement error handling for rate limits and API failures
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify endpoint returns properly formatted tide data
- [ ] Verify invalid beachId returns 404 with ApiError
- [ ] Verify Trout Lake returns appropriate message
- [ ] Verify response includes cached/cachedAt metadata
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Endpoint returns properly formatted tide data
- [ ] Invalid beachId returns 404 with ApiError format
- [ ] Trout Lake returns "Tide information not applicable"
- [ ] Response includes cached/cachedAt metadata
- [ ] Integration tests pass with supertest
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "If a beach has no associated tide station (e.g., Trout Lake), then display 'Tide information not applicable'"
- Data Contract: "Predictions sorted by time ascending"
- Data Contract: "At least 6 predictions (3 high, 3 low)"
- Error Handling: "Invalid Beach ID -> 404 response -> Info level log"

## Notes

- Impact scope: useTides Hook (TASK-011) depends on this endpoint
- Constraints: Beach validation against known beach list
- Trout Lake special case: tideStationId is null
- Tide data sorted by time in response
