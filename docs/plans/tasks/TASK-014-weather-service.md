# Task: TASK-014 Weather Service with MSC GeoMet Integration

Metadata:
- Phase: 3 - Weather Slice
- Dependencies: TASK-003 (Cache Manager), TASK-007 (Beach Config)
- Provides: Service to fetch weather forecasts from Environment Canada MSC GeoMet API
- Size: Small (2 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Weather Service that fetches weather forecasts from the Environment Canada MSC GeoMet API (OGC API). The service integrates with Cache Manager (30-minute TTL), transforms API responses to WeatherForecast type, maps weather conditions to WeatherCondition enum, and handles API timeouts gracefully.

## Target Files

- [ ] `/home/zxela/workspace/server/src/services/weatherService.ts`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/weatherService.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-003: CacheManager available at `/server/src/cache/cacheManager.ts`
  - TASK-007: Beach config available at `/shared/data/beaches.ts`
- [ ] Write failing tests for Weather Service:
  ```typescript
  describe('WeatherService', () => {
    describe('getWeatherForecast', () => {
      it('returns typed WeatherForecast', async () => {
        const mockResponse = {
          properties: {
            temperature: { value: 15.5 },
            weatherCondition: 'Mostly Cloudy',
            relativeHumidity: { value: 65 },
            windSpeed: { value: 12 },
            windDirection: { value: 'NW' },
            uvIndex: { value: 4 }
          }
        }
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })

        const result = await weatherService.getWeatherForecast(49.2867, -123.1432)

        expect(result.current.temperature).toBe(15.5)
        expect(result.current.condition).toBe('partly-cloudy')
        expect(result.hourly).toHaveLength(24)
      })

      it('integrates with cache manager (30-minute TTL)', async () => {
        const cachedData = { current: { temperature: 20 }, hourly: [] }
        cache.set('weather:49.2867:-123.1432', cachedData, 1800000)

        const result = await weatherService.getWeatherForecast(49.2867, -123.1432)

        expect(fetch).not.toHaveBeenCalled()
        expect(result.current.temperature).toBe(20)
      })

      it('handles API timeout (>5s) gracefully', async () => {
        vi.mocked(fetch).mockImplementation(() =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 6000)
          )
        )
        cache.set('weather:49.2867:-123.1432', { cached: true }, 1800000)

        const result = await weatherService.getWeatherForecast(49.2867, -123.1432)

        expect(result.cached).toBe(true) // Served from cache
      })

      it('maps weather conditions correctly', () => {
        expect(mapWeatherCondition('Sunny')).toBe('sunny')
        expect(mapWeatherCondition('Partly Cloudy')).toBe('partly-cloudy')
        expect(mapWeatherCondition('Cloudy')).toBe('cloudy')
        expect(mapWeatherCondition('Rain')).toBe('rainy')
        expect(mapWeatherCondition('Thunderstorm')).toBe('stormy')
        expect(mapWeatherCondition('Fog')).toBe('foggy')
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Weather Service:
  ```typescript
  import type { WeatherForecast, WeatherCondition } from '@van-beaches/shared'
  import { cacheManager } from '../cache/cacheManager'

  const MSC_GEOMET_URL = 'https://api.weather.gc.ca'
  const WEATHER_CACHE_TTL = 1800000 // 30 minutes

  export class WeatherService {
    async getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast> {
      const cacheKey = `weather:${lat}:${lon}`

      return cacheManager.getOrFetch(
        cacheKey,
        async () => {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 5000)

          try {
            const response = await fetch(
              `${MSC_GEOMET_URL}/collections/weather-forecast/items?` +
              `f=json&lat=${lat}&lon=${lon}`,
              { signal: controller.signal }
            )

            if (!response.ok) {
              throw new Error(`Weather API error: ${response.status}`)
            }

            const data = await response.json()
            return this.transformResponse(data, lat, lon)
          } finally {
            clearTimeout(timeout)
          }
        },
        WEATHER_CACHE_TTL
      )
    }

    private transformResponse(apiResponse: unknown, lat: number, lon: number): WeatherForecast {
      // Transform MSC GeoMet response to WeatherForecast type
      // Map conditions to WeatherCondition enum
    }
  }

  export function mapWeatherCondition(apiCondition: string): WeatherCondition {
    const conditionMap: Record<string, WeatherCondition> = {
      'sunny': 'sunny',
      'clear': 'sunny',
      'partly cloudy': 'partly-cloudy',
      'mostly cloudy': 'partly-cloudy',
      'cloudy': 'cloudy',
      'overcast': 'cloudy',
      'rain': 'rainy',
      'showers': 'rainy',
      'thunderstorm': 'stormy',
      'fog': 'foggy',
      'mist': 'foggy'
    }
    return conditionMap[apiCondition.toLowerCase()] || 'cloudy'
  }

  export const weatherService = new WeatherService()
  ```
- [ ] Implement response transformation
- [ ] Implement condition mapping
- [ ] Handle 5-second timeout
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify service returns typed WeatherForecast
- [ ] Verify temperature in Celsius with proper precision
- [ ] Verify 24-hour forecast with hourly entries
- [ ] Verify cached data served on API failure
- [ ] Confirm added tests pass

## MSC GeoMet API Reference

```
Base URL: https://api.weather.gc.ca
Documentation: https://eccc-msc.github.io/open-data/msc-geomet/readme_en/

Endpoint: GET /collections/weather-forecast/items
Query Params:
  - f: json (format)
  - lat: latitude
  - lon: longitude

Note: No guaranteed SLA, handle timeouts gracefully
```

## Completion Criteria

- [ ] Service returns typed WeatherForecast
- [ ] Temperature in Celsius with proper precision
- [ ] 24-hour forecast with hourly entries
- [ ] Cached data served on API failure/timeout
- [ ] Weather conditions mapped to WeatherCondition enum
- [ ] 30-minute cache TTL enforced
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "When user views beach detail, display 24-hour weather forecast"
- AC: "Weather data refresh every 30 minutes" (property: `weatherCache.ttl === 1800000`)
- AC: "If Environment Canada API returns error, display cached data"
- Error Handling: "Weather API Timeout -> >5s response -> Serve cached data -> Warn level"

## Notes

- Impact scope: Weather API Route (TASK-015) depends on this service
- Constraints: No guaranteed SLA from Environment Canada - must handle failures
- Cache TTL: 30 minutes (1800000 ms)
- Timeout: 5 seconds max for API calls
