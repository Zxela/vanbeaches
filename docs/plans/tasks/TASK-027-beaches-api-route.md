# Task: TASK-027 Beaches API Route (Summary Endpoint)

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-009 (IWLS Service), TASK-014 (Weather Service), TASK-019 (Water Quality Service)
- Provides: REST endpoint for aggregated beach summaries at `/api/beaches`
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Beaches API Route that aggregates summary data from all services and returns an ApiResponse<BeachSummary[]>. This endpoint provides the data needed for the dashboard to display all 9 beaches with their current conditions.

## Target Files

- [ ] `/home/zxela/workspace/server/src/routes/beachesRoute.ts`
- [ ] `/home/zxela/workspace/server/src/routes/__tests__/beachesRoute.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-009: IWLSService for tide data
  - TASK-014: WeatherService for weather data
  - TASK-019: WaterQualityService for water quality data
- [ ] Write failing tests for Beaches Route:
  ```typescript
  import request from 'supertest'
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { app } from '../index'
  import { iwlsService } from '../services/iwlsService'
  import { weatherService } from '../services/weatherService'
  import { waterQualityService } from '../services/waterQualityService'

  vi.mock('../services/iwlsService')
  vi.mock('../services/weatherService')
  vi.mock('../services/waterQualityService')

  describe('GET /api/beaches', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('returns 9 beach summaries', async () => {
      // Mock all services to return data
      vi.mocked(weatherService.getWeatherForecast).mockResolvedValue({
        current: { temperature: 15, condition: 'sunny' }
      })
      vi.mocked(iwlsService.getTidePredictions).mockResolvedValue([
        { time: '2026-01-17T14:00:00Z', height: 3.0, type: 'high' }
      ])
      vi.mocked(waterQualityService.getWaterQuality).mockResolvedValue({
        level: 'good'
      })

      const response = await request(app).get('/api/beaches')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(9)
    })

    it('returns ApiResponse format', async () => {
      const response = await request(app).get('/api/beaches')

      expect(response.body).toHaveProperty('success')
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('cached')
    })

    it('each summary includes id and name', async () => {
      const response = await request(app).get('/api/beaches')

      response.body.data.forEach((beach: any) => {
        expect(beach).toHaveProperty('id')
        expect(beach).toHaveProperty('name')
      })
    })

    it('each summary includes current weather', async () => {
      vi.mocked(weatherService.getWeatherForecast).mockResolvedValue({
        current: { temperature: 15, condition: 'sunny' }
      })

      const response = await request(app).get('/api/beaches')

      const englishBay = response.body.data.find(
        (b: any) => b.id === 'english-bay'
      )
      expect(englishBay.currentWeather).toHaveProperty('temperature')
      expect(englishBay.currentWeather).toHaveProperty('condition')
    })

    it('each summary includes next tide', async () => {
      vi.mocked(iwlsService.getTidePredictions).mockResolvedValue([
        { time: '2026-01-17T14:00:00Z', height: 3.0, type: 'high' }
      ])

      const response = await request(app).get('/api/beaches')

      const englishBay = response.body.data.find(
        (b: any) => b.id === 'english-bay'
      )
      expect(englishBay.nextTide).toHaveProperty('type')
      expect(englishBay.nextTide).toHaveProperty('time')
      expect(englishBay.nextTide).toHaveProperty('height')
    })

    it('each summary includes water quality', async () => {
      vi.mocked(waterQualityService.getWaterQuality).mockResolvedValue({
        level: 'good'
      })

      const response = await request(app).get('/api/beaches')

      const englishBay = response.body.data.find(
        (b: any) => b.id === 'english-bay'
      )
      expect(englishBay).toHaveProperty('waterQuality')
    })

    it('handles partial service failures gracefully', async () => {
      vi.mocked(weatherService.getWeatherForecast).mockRejectedValue(
        new Error('Weather API failed')
      )
      vi.mocked(iwlsService.getTidePredictions).mockResolvedValue([])
      vi.mocked(waterQualityService.getWaterQuality).mockResolvedValue({
        level: 'good'
      })

      const response = await request(app).get('/api/beaches')

      // Should still return 9 beaches with partial data
      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(9)

      const englishBay = response.body.data.find(
        (b: any) => b.id === 'english-bay'
      )
      expect(englishBay.currentWeather).toBeNull()
    })

    it('Trout Lake has null nextTide', async () => {
      const response = await request(app).get('/api/beaches')

      const troutLake = response.body.data.find(
        (b: any) => b.id === 'trout-lake'
      )
      expect(troutLake.nextTide).toBeNull()
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create the beaches route:
  ```typescript
  import { Router } from 'express'
  import { beaches } from '@van-beaches/shared/data'
  import { iwlsService } from '../services/iwlsService'
  import { weatherService } from '../services/weatherService'
  import { waterQualityService } from '../services/waterQualityService'
  import type { ApiResponse, BeachSummary } from '@van-beaches/shared'

  const router = Router()

  router.get('/beaches', async (req, res) => {
    try {
      const summaries: BeachSummary[] = await Promise.all(
        beaches.map(async (beach) => {
          const [weatherResult, tideResult, waterQualityResult] = await Promise.allSettled([
            beach.location
              ? weatherService.getWeatherForecast(
                  beach.location.latitude,
                  beach.location.longitude
                )
              : Promise.resolve(null),
            beach.tideStationId
              ? iwlsService.getTidePredictions(
                  beach.tideStationId,
                  new Date(),
                  new Date(Date.now() + 24 * 60 * 60 * 1000)
                )
              : Promise.resolve([]),
            waterQualityService.getWaterQuality(beach.name)
          ])

          // Extract current weather
          const currentWeather = weatherResult.status === 'fulfilled' && weatherResult.value
            ? {
                temperature: weatherResult.value.current.temperature,
                condition: weatherResult.value.current.condition,
                icon: weatherResult.value.current.condition
              }
            : null

          // Extract next tide
          const predictions = tideResult.status === 'fulfilled' ? tideResult.value : []
          const nextTide = predictions.length > 0
            ? {
                type: predictions[0].type,
                time: predictions[0].time,
                height: predictions[0].height
              }
            : null

          // Extract water quality
          const waterQuality = waterQualityResult.status === 'fulfilled'
            ? waterQualityResult.value.level
            : 'unknown'

          return {
            id: beach.id,
            name: beach.name,
            currentWeather,
            nextTide: beach.tideStationId ? nextTide : null,
            waterQuality,
            lastUpdated: new Date().toISOString()
          }
        })
      )

      const response: ApiResponse<BeachSummary[]> = {
        success: true,
        data: summaries,
        error: null,
        cached: false,
        cachedAt: null
      }

      res.json(response)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'API_ERROR', message: 'Failed to fetch beach summaries' },
        data: [],
        cached: false,
        cachedAt: null
      })
    }
  })

  export { router as beachesRouter }
  ```
- [ ] Mount route in Express server
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify returns 9 beach summaries
- [ ] Verify each summary includes weather, tide, water quality
- [ ] Verify partial failures handled gracefully
- [ ] Verify Trout Lake has null nextTide
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Returns 9 beach summaries (property: `beaches.length === 9`)
- [ ] Each summary includes current weather, next tide, water quality
- [ ] Handles partial failures gracefully (returns data for successful services)
- [ ] Trout Lake has null nextTide
- [ ] ApiResponse format followed
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display all 9 Vancouver beaches" (property: `beaches.length === 9`)
- Data Contract: "Beach count is always 9"
- Data Contract: "Beach IDs are stable across requests"
- Data Contract: "Always returns array (empty if all sources fail)"

## Notes

- Impact scope: useBeaches Hook and Dashboard Page depend on this endpoint
- Constraints: Must aggregate data from all three services
- Use Promise.allSettled to handle partial failures
- Trout Lake is a lake (no tides)
