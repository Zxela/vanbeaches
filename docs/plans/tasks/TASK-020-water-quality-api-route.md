# Task: TASK-020 Water Quality API Route

Metadata:
- Phase: 4 - Water Quality Slice
- Dependencies: TASK-019 (Water Quality Service), TASK-005 (Express Server)
- Provides: REST endpoint for water quality data at `/api/water-quality/:beachId`
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Water Quality API Route that exposes water quality data at `GET /api/water-quality/:beachId`. The route validates the beachId against known beaches and returns an ApiResponse<WaterQualityStatus> format.

## Target Files

- [ ] `/home/zxela/workspace/server/src/routes/waterQualityRoute.ts`
- [ ] `/home/zxela/workspace/server/src/routes/__tests__/waterQualityRoute.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-019: WaterQualityService available at `/server/src/services/waterQualityService.ts`
  - TASK-005: Express server available at `/server/src/index.ts`
- [ ] Write failing tests for Water Quality Route:
  ```typescript
  import request from 'supertest'
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { app } from '../index'
  import { waterQualityService } from '../services/waterQualityService'

  vi.mock('../services/waterQualityService')

  describe('GET /api/water-quality/:beachId', () => {
    describe('valid beach', () => {
      it('returns water quality data in ApiResponse format', async () => {
        vi.mocked(waterQualityService.getWaterQuality).mockResolvedValueOnce({
          beachId: 'english-bay',
          level: 'good',
          ecoliCount: 50,
          advisoryReason: null,
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        })

        const response = await request(app)
          .get('/api/water-quality/english-bay')

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            beachId: 'english-bay',
            level: 'good',
            ecoliCount: 50,
            sampleDate: expect.any(String)
          },
          cached: expect.any(Boolean)
        })
      })

      it('includes advisory reason when status is advisory', async () => {
        vi.mocked(waterQualityService.getWaterQuality).mockResolvedValueOnce({
          beachId: 'english-bay',
          level: 'advisory',
          ecoliCount: 250,
          advisoryReason: 'E.coli levels elevated due to recent rainfall',
          sampleDate: '2026-01-15T00:00:00Z',
          fetchedAt: '2026-01-17T12:00:00Z'
        })

        const response = await request(app)
          .get('/api/water-quality/english-bay')

        expect(response.body.data.level).toBe('advisory')
        expect(response.body.data.advisoryReason).toBe(
          'E.coli levels elevated due to recent rainfall'
        )
      })
    })

    describe('invalid beach', () => {
      it('returns 404 for invalid beachId', async () => {
        const response = await request(app)
          .get('/api/water-quality/invalid-beach')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          success: false,
          error: { code: 'NOT_FOUND' }
        })
      })
    })

    describe('off-season', () => {
      it('returns off-season status during October-April', async () => {
        vi.mocked(waterQualityService.getWaterQuality).mockResolvedValueOnce({
          beachId: 'english-bay',
          level: 'off-season',
          ecoliCount: null,
          advisoryReason: null,
          sampleDate: null,
          fetchedAt: '2026-01-17T12:00:00Z'
        })

        const response = await request(app)
          .get('/api/water-quality/english-bay')

        expect(response.body.data.level).toBe('off-season')
      })
    })

    describe('cached response', () => {
      it('includes cached metadata in response', async () => {
        vi.mocked(waterQualityService.getWaterQuality).mockResolvedValueOnce({
          beachId: 'english-bay',
          level: 'good',
          fetchedAt: '2026-01-17T06:00:00Z' // Earlier fetch
        })

        const response = await request(app)
          .get('/api/water-quality/english-bay')

        expect(response.body).toHaveProperty('cached')
        expect(response.body).toHaveProperty('cachedAt')
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create the water quality route:
  ```typescript
  import { Router } from 'express'
  import { waterQualityService } from '../services/waterQualityService'
  import { getBeachById } from '@van-beaches/shared/data'
  import type { ApiResponse, WaterQualityStatus } from '@van-beaches/shared'

  const router = Router()

  router.get('/water-quality/:beachId', async (req, res) => {
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

    try {
      const status = await waterQualityService.getWaterQuality(beach.name)

      const response: ApiResponse<WaterQualityStatus> = {
        success: true,
        data: {
          ...status,
          beachId
        },
        error: null,
        cached: false, // CacheManager tracks this
        cachedAt: status.fetchedAt
      }

      res.json(response)
    } catch (error) {
      // Handle errors - return unknown status
      res.status(500).json({
        success: false,
        error: { code: 'API_ERROR', message: 'Failed to fetch water quality data' },
        data: { beachId, level: 'unknown' },
        cached: false,
        cachedAt: null
      })
    }
  })

  export { router as waterQualityRouter }
  ```
- [ ] Mount route in Express server
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify endpoint returns properly formatted water quality data
- [ ] Verify invalid beachId returns 404
- [ ] Verify response includes cached metadata
- [ ] Verify off-season handling works
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Endpoint returns properly formatted water quality data
- [ ] Invalid beachId returns 404 with ApiError format
- [ ] Response includes cached metadata
- [ ] Advisory reason present when level is 'advisory' or 'closed'
- [ ] Off-season status returned during October-April
- [ ] Integration tests pass with supertest
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Data Contract: "Level is one of defined enum values"
- Data Contract: "sampleDate is valid date string or null"
- Data Contract: "Advisory reason present when level is 'advisory' or 'closed'"
- Data Contract: "ecoliCount null during off-season"
- Error Handling: "Return { level: 'unknown' } with error flag"

## Notes

- Impact scope: useWaterQuality Hook (TASK-021) depends on this endpoint
- Constraints: Beach name must be mapped from beachId for scraper
- Beach names used in VCH website may differ slightly from our IDs
