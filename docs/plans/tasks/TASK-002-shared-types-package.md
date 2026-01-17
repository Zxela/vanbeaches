# Task: TASK-002 Shared Types Package

Metadata:
- Phase: 1 - Foundation
- Dependencies: TASK-001 (Monorepo Setup)
- Provides: Type definitions for Beach, Weather, Tide, WaterQuality, API types
- Size: Small (6 files)
- Verification Level: L3 (Build Success)

## Implementation Content

Create the `/shared` package with all TypeScript type definitions from the Design Doc. This includes Beach, Weather, Tide, WaterQuality, and API response types. These types will be shared between server and client packages.

## Target Files

- [ ] `/home/zxela/workspace/shared/package.json`
- [ ] `/home/zxela/workspace/shared/tsconfig.json`
- [ ] `/home/zxela/workspace/shared/types/beach.ts`
- [ ] `/home/zxela/workspace/shared/types/weather.ts`
- [ ] `/home/zxela/workspace/shared/types/tide.ts`
- [ ] `/home/zxela/workspace/shared/types/waterQuality.ts`
- [ ] `/home/zxela/workspace/shared/types/api.ts`
- [ ] `/home/zxela/workspace/shared/types/index.ts` (barrel export)
- [ ] `/home/zxela/workspace/shared/types/__tests__/typeGuards.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review TASK-001 deliverables (monorepo structure exists)
- [ ] Write failing tests for type guards:
  ```typescript
  // typeGuards.test.ts
  describe('Type Guards', () => {
    it('isBeach validates Beach object', () => {
      expect(isBeach({ id: '1', name: 'Test' })).toBe(true)
      expect(isBeach(null)).toBe(false)
    })
    it('isTidePrediction validates TidePrediction', () => {
      expect(isTidePrediction({ time: '2026-01-01', height: 1.5, type: 'high' })).toBe(true)
    })
  })
  ```
- [ ] Run tests and confirm failure (type guards not implemented)

### 2. Green Phase
- [ ] Create `/shared/package.json`:
  ```json
  {
    "name": "@van-beaches/shared",
    "version": "0.0.1",
    "main": "types/index.ts",
    "types": "types/index.ts"
  }
  ```
- [ ] Create `/shared/tsconfig.json` with composite: true
- [ ] Create `beach.ts` with Beach and BeachSummary interfaces (from Design Doc)
- [ ] Create `weather.ts` with WeatherCondition enum and WeatherForecast interface
- [ ] Create `tide.ts` with TidePrediction and TideData interfaces
- [ ] Create `waterQuality.ts` with WaterQualityLevel and WaterQualityStatus
- [ ] Create `api.ts` with ApiResponse and ApiError interfaces
- [ ] Create barrel export `index.ts`
- [ ] Implement type guards for runtime validation
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Ensure all type definitions match Design Doc exactly
- [ ] Verify package builds: `pnpm --filter @van-beaches/shared build`
- [ ] Verify exports work from other packages
- [ ] Confirm added tests pass

## Type Definitions to Implement

```typescript
// beach.ts
export interface Beach {
  id: string;
  name: string;
  slug: string;
  location: { latitude: number; longitude: number };
  tideStationId: string | null;
  hasWebcam: boolean;
  webcamUrl: string | null;
}

export interface BeachSummary {
  id: string;
  name: string;
  currentWeather: { temperature: number; condition: WeatherCondition; icon: string } | null;
  nextTide: { type: 'high' | 'low'; time: string; height: number } | null;
  waterQuality: WaterQualityLevel;
  lastUpdated: string;
}

// weather.ts
export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';

export interface WeatherForecast {
  beachId: string;
  current: {
    temperature: number;
    condition: WeatherCondition;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    uvIndex: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    condition: WeatherCondition;
    precipitationProbability: number;
  }>;
  fetchedAt: string;
}

// tide.ts
export interface TidePrediction {
  time: string;
  height: number;
  type: 'high' | 'low';
}

export interface TideData {
  beachId: string;
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  fetchedAt: string;
}

// waterQuality.ts
export type WaterQualityLevel = 'good' | 'advisory' | 'closed' | 'unknown' | 'off-season';

export interface WaterQualityStatus {
  beachId: string;
  level: WaterQualityLevel;
  ecoliCount: number | null;
  advisoryReason: string | null;
  sampleDate: string | null;
  fetchedAt: string;
}

// api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  cached: boolean;
  cachedAt: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  retryAfter: number | null;
}
```

## Completion Criteria

- [ ] All types from Design Doc "Type Definitions" section implemented
- [ ] Type guards pass unit tests
- [ ] Package builds and exports correctly
- [ ] Can import types from server and client packages
- [ ] Verification: L3 (Build passes, types compile)

## AC References from Design Doc

- AC Support: All AC properties referencing types (5 items)
- Property: Type definitions enable `beaches.length === 9` validation
- Property: Type definitions enable `waterQualityCache.ttl === 21600000` validation

## Notes

- Impact scope: All server services and client components depend on these types
- Constraints: Types must match Design Doc exactly for contract compliance
- Type guards enable runtime validation of external API responses
