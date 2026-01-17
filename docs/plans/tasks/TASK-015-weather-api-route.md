# Task: TASK-015 Weather API Route

Metadata:
- Phase: 3 - Weather Slice
- Dependencies: TASK-014 (Weather Service), TASK-005 (Express Server)
- Provides: REST endpoint for weather data at `/api/weather/:beachId`
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Weather API Route that exposes weather data at `GET /api/weather/:beachId`. The route validates the beachId, looks up beach coordinates from config, calls the Weather Service, and returns an ApiResponse<WeatherForecast> format.

## Target Files

- [ ] `/home/zxela/workspace/server/src/routes/weatherRoute.ts`
- [ ] `/home/zxela/workspace/server/src/routes/__tests__/weatherRoute.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-014: WeatherService available at `/server/src/services/weatherService.ts`
  - TASK-005: Express server available at `/server/src/index.ts`
- [ ] Write failing tests for Weather Route:
  ```typescript
  describe('GET /api/weather/:beachId', () => {
    describe('valid beach', () => {
      it('returns weather data in ApiResponse format', async () => {
        vi.mocked(weatherService.getWeatherForecast).mockResolvedValueOnce({
          beachId: 'english-bay',
          current: {
            temperature: 15.5,
            condition: 'partly-cloudy',
            humidity: 65,
            windSpeed: 12,
            windDirection: 'NW',
            uvIndex: 4
          },
          hourly: Array(24).fill({
            time: '2026-01-17T13:00:00Z',
            temperature: 15.5,
            condition: 'partly-cloudy',
            precipitationProbability: 10
          }),
          fetchedAt: '2026-01-17T12:00:00Z'
        })

        const response = await request(app)
          .get('/api/weather/english-bay')

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
          success: true,
          data: {
            beachId: 'english-bay',
            current: expect.objectContaining({
              temperature: 15.5
            }),
            hourly: expect.any(Array)
          },
          cached: expect.any(Boolean)
        })
      })

      it('returns 24 hourly entries', async () => {
        vi.mocked(weatherService.getWeatherForecast).mockResolvedValueOnce({
          hourly: Array(24).fill({ time: '...', temperature: 15 })
        })

        const response = await request(app)
          .get('/api/weather/english-bay')

        expect(response.body.data.hourly).toHaveLength(24)
      })
    })

    describe('invalid beach', () => {
      it('returns 404 for invalid beachId', async () => {
        const response = await request(app)
          .get('/api/weather/invalid-beach')

        expect(response.status).toBe(404)
        expect(response.body).toMatchObject({
          success: false,
          error: { code: 'NOT_FOUND' }
        })
      })
    })

    describe('cached response', () => {
      it('includes cached metadata in response', async () => {
        vi.mocked(weatherService.getWeatherForecast).mockResolvedValueOnce({
          current: { temperature: 15 },
          hourly: [],
          fetchedAt: '2026-01-17T11:30:00Z'
        })

        const response = await request(app)
          .get('/api/weather/english-bay')

        expect(response.body).toHaveProperty('cached')
        expect(response.body).toHaveProperty('cachedAt')
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create the weather route:
  ```typescript
  import { Router } from 'express'
  import { weatherService } from '../services/weatherService'
  import { getBeachById } from '@van-beaches/shared/data'
  import type { ApiResponse, WeatherForecast } from '@van-beaches/shared'

  const router = Router()

  router.get('/weather/:beachId', async (req, res) => {
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
      const forecast = await weatherService.getWeatherForecast(
        beach.location.latitude,
        beach.location.longitude
      )

      const response: ApiResponse<WeatherForecast> = {
        success: true,
        data: {
          ...forecast,
          beachId
        },
        error: null,
        cached: false, // CacheManager tracks this
        cachedAt: forecast.fetchedAt
      }

      res.json(response)
    } catch (error) {
      // Handle errors
      res.status(500).json({
        success: false,
        error: { code: 'API_ERROR', message: 'Failed to fetch weather data' },
        data: null,
        cached: false,
        cachedAt: null
      })
    }
  })

  export { router as weatherRouter }
  ```
- [ ] Mount route in Express server
- [ ] Implement error handling
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify endpoint returns properly formatted weather data
- [ ] Verify invalid beachId returns 404
- [ ] Verify response includes cached metadata
- [ ] Verify hourly forecast contains 24 entries
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Endpoint returns properly formatted weather data
- [ ] Invalid beachId returns 404 with ApiError format
- [ ] Response includes cached metadata
- [ ] Hourly forecast contains 24 entries
- [ ] Integration tests pass with supertest
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Data Contract: "Hourly forecast contains 24 entries"
- Data Contract: "All temperatures are realistic (-40 to +50 range)"
- Error Handling: "Invalid Beach ID -> 404 response"
- Data Contract: Return cached data if available on error

## Notes

- Impact scope: useWeather Hook (TASK-016) depends on this endpoint
- Constraints: Beach coordinates looked up from config
- Weather data tied to beach coordinates (lat/lon)
