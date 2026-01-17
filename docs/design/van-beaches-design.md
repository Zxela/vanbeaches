# Van Beaches Design Document

## Overview

Van Beaches is a web dashboard application providing comprehensive beach conditions for Vancouver's 9 public beaches. The system aggregates weather forecasts, tide information, water quality reports, and live webcam feeds into a responsive, mobile-friendly interface for beachgoers and local residents.

## Design Summary (Meta)

```yaml
design_type: "new_feature"
risk_level: "medium"
main_constraints:
  - "IWLS API rate limit: 3 requests/second"
  - "VCH water quality data requires web scraping (no official API)"
  - "Webcam availability varies by beach"
  - "Environment Canada API has no guaranteed SLA"
biggest_risks:
  - "External API unavailability affecting user experience"
  - "VCH website structure changes breaking scraper"
  - "Rate limiting causing data staleness during high traffic"
unknowns:
  - "Exact webcam embed URLs for all 9 beaches"
  - "VCH website scraping reliability long-term"
  - "Optimal cache duration for each data type"
```

## Background and Context

### Prerequisite ADRs

- No existing ADRs (greenfield project)
- Common technical decisions to be documented:
  - ADR-0001: Technology Stack - Node.js + Express over Bun/Cloudflare Workers (simpler monorepo, real-time updates, flexible deployment)
  - ADR-0002: Caching Strategy for External APIs
  - ADR-0003: Error Handling and Fallback Patterns

### Agreement Checklist

#### Scope
- [x] Beach overview dashboard displaying all 9 Vancouver beaches
- [x] Weather forecasts per beach from Environment Canada MSC GeoMet API
- [x] Tide information from Canadian Hydrographic Service IWLS API
- [x] Water quality status from Vancouver Coastal Health (scraped/cached)
- [x] Live webcam embeds where available
- [x] Server-side caching for API responses
- [x] Scheduled jobs for data refresh
- [x] Responsive design for mobile/desktop

#### Non-Scope (Explicitly not changing)
- [x] User authentication/accounts
- [x] User-generated content or reviews
- [x] Beach booking or reservation systems
- [x] Historical data analysis or trends
- [x] Push notifications or alerts
- [x] Beach amenity information (parking, facilities)

#### Constraints
- [x] Parallel operation: No (greenfield)
- [x] Backward compatibility: Not required (new project)
- [x] Performance measurement: Required (fast load times goal)
- [x] API rate limits: 3 req/sec for IWLS API
- [x] VCH data: Weekly updates only (seasonal May-September)

### Problem to Solve

Vancouver residents and visitors need a centralized, easy-to-use dashboard to check beach conditions before visiting. Currently, this information is scattered across multiple government websites and sources, making trip planning time-consuming and inconvenient.

### Current Challenges

1. **Fragmented Information**: Tide, weather, and water quality data exist on separate websites
2. **Poor Mobile Experience**: Government websites are not optimized for mobile devices
3. **No Real-time Overview**: No single view showing conditions at all beaches
4. **Accessibility**: Technical APIs require knowledge to interpret

### Requirements

#### Functional Requirements

1. Display overview of all 9 Vancouver beaches with current conditions
2. Show weather forecast (temperature, conditions, UV index) per beach
3. Display tide times and heights for nearest tide station
4. Show water quality status (safe/advisory/closed) with last update date
5. Embed live webcam feeds where available
6. Auto-refresh data at appropriate intervals
7. Mobile-responsive layout with touch-friendly navigation

#### Non-Functional Requirements

- **Performance**: Initial page load < 3 seconds, data refresh < 1 second
- **Scalability**: Support 1000+ concurrent users without API rate limit issues
- **Reliability**: 99% uptime, graceful degradation when external APIs fail
- **Maintainability**: Clear separation of concerns, typed interfaces, comprehensive error handling

## Acceptance Criteria (AC) - EARS Format

### Beach Dashboard Display

- [ ] The system shall display all 9 Vancouver beaches on the main dashboard
  - **Property**: `beaches.length === 9`
- [ ] **When** the dashboard loads, the system shall display each beach with name, current conditions summary, and quick status indicators
- [ ] **If** any data source is unavailable, **then** the system shall display "Data unavailable" with timestamp of last successful fetch
- [ ] The system shall support viewport widths from 320px to 2560px with appropriate layouts
  - **Property**: `responsive.breakpoints.includes(['mobile', 'tablet', 'desktop'])`

### Weather Forecast Feature

- [ ] **When** a user views a beach detail, the system shall display a 24-hour weather forecast
- [ ] The system shall display temperature in Celsius with one decimal precision
  - **Property**: `typeof temperature === 'number' && temperature.toFixed(1)`
- [ ] The system shall display weather conditions (sunny, cloudy, rainy, etc.) with appropriate icons
- [ ] **If** the Environment Canada API returns an error, **then** the system shall display cached data with "Last updated: [timestamp]" indicator
- [ ] The system shall refresh weather data every 30 minutes
  - **Property**: `weatherCache.ttl === 1800000` (milliseconds)

### Tide Information Feature

- [ ] **When** a user views a beach, the system shall display the next 3 high and low tides
- [ ] Tide times shall be displayed in Pacific Time with 12-hour format
  - **Property**: `tideTime.format === 'h:mm A'`
- [ ] Tide heights shall be displayed in meters with two decimal precision
  - **Property**: `typeof height === 'number' && height.toFixed(2)`
- [ ] **If** the IWLS API rate limit is exceeded, **then** the system shall serve cached data
- [ ] The system shall map each beach to its nearest tide station (or null for non-tidal locations)
  - **Property**: `beachTideStationMap.size === 9` (includes null entries for lakes)
- [ ] **If** a beach has no associated tide station (e.g., Trout Lake), **then** the system shall display "Tide information not applicable"

### Water Quality Feature

- [ ] The system shall display water quality status as one of: "Good", "Advisory", "Closed", "Unknown", or "Off-Season"
- [ ] **When** water quality is "Advisory" or "Closed", the system shall display the advisory reason
- [ ] The system shall display the date of last water quality sample
  - **Property**: `lastSampleDate instanceof Date`
- [ ] **If** it is off-season (October-April), **then** the system shall display "Monitoring resumes in May"
- [ ] The system shall refresh water quality data every 6 hours
  - **Property**: `waterQualityCache.ttl === 21600000`

### Webcam Feature

- [ ] **When** a webcam is available for a beach, the system shall embed the live feed
- [ ] **If** a webcam fails to load, **then** the system shall display a placeholder image with "Webcam unavailable" message
- [ ] Webcam embeds shall be lazy-loaded to improve initial page performance
- [ ] **While** the webcam is loading, the system shall display a loading skeleton

### Caching and Performance

- [ ] The server shall cache all external API responses to respect rate limits
- [ ] **When** cached data is served, the system shall include "Last updated" timestamp
- [ ] **If** cache is empty and API is unavailable, **then** the system shall return appropriate error message
- [ ] The system shall implement request coalescing for concurrent requests to same endpoint

## Existing Codebase Analysis

### Implementation Path Mapping

| Type | Path | Description |
|------|------|-------------|
| New | /server | Express.js backend with API routes and caching |
| New | /server/src/services | External API integration services |
| New | /server/src/routes | REST API endpoint handlers |
| New | /server/src/cache | Caching layer implementation |
| New | /server/src/jobs | Scheduled data refresh jobs |
| New | /client | React + Vite frontend application |
| New | /client/src/components | React UI components |
| New | /client/src/hooks | Custom React hooks for data fetching |
| New | /client/src/pages | Page-level components |
| New | /shared | Shared TypeScript types and constants |

### Integration Points (Greenfield - External Only)

- **IWLS API**: REST JSON integration for tide data
- **Environment Canada MSC GeoMet**: OGC API for weather data
- **VCH Website**: HTML scraping for water quality
- **Webcam Providers**: iframe/embed integration

## Design

### Change Impact Map

```yaml
Change Target: New Application (No existing code)
Direct Impact:
  - All new file creation
  - No existing files affected
Indirect Impact:
  - Deployment configuration
  - CI/CD pipeline setup
No Ripple Effect:
  - No existing systems
```

### Architecture Overview

```
+------------------------------------------------------------------+
|                         Van Beaches System                        |
+------------------------------------------------------------------+
|                                                                   |
|  +-----------------------+      +-----------------------------+   |
|  |       CLIENT          |      |          SERVER             |   |
|  |    (React + Vite)     |      |    (Node.js + Express)      |   |
|  +-----------------------+      +-----------------------------+   |
|  |                       |      |                             |   |
|  |  /pages               |      |  /routes                    |   |
|  |    - Dashboard.tsx    | HTTP |    - /api/beaches           |   |
|  |    - BeachDetail.tsx  |<---->|    - /api/weather/:id       |   |
|  |                       |      |    - /api/tides/:id         |   |
|  |  /components          |      |    - /api/water-quality/:id |   |
|  |    - BeachCard.tsx    |      |    - /api/webcams/:id       |   |
|  |    - WeatherWidget.tsx|      |                             |   |
|  |    - TideChart.tsx    |      |  /services                  |   |
|  |    - WaterQuality.tsx |      |    - iwlsService.ts         |   |
|  |    - WebcamEmbed.tsx  |      |    - weatherService.ts      |   |
|  |                       |      |    - waterQualityService.ts |   |
|  |  /hooks               |      |    - webcamService.ts       |   |
|  |    - useBeaches.ts    |      |                             |   |
|  |    - useWeather.ts    |      |  /cache                     |   |
|  |    - useTides.ts      |      |    - cacheManager.ts        |   |
|  |                       |      |    - rateLimiter.ts         |   |
|  +-----------------------+      |                             |   |
|                                 |  /jobs                      |   |
|                                 |    - scheduler.ts           |   |
|                                 |    - dataRefreshJob.ts      |   |
|                                 +-----------------------------+   |
|                                           |                       |
|                                           v                       |
|                         +------------------------------------+    |
|                         |        EXTERNAL APIS               |    |
|                         +------------------------------------+    |
|                         |                                    |    |
|                         |  +----------+  +--------------+    |    |
|                         |  | IWLS API |  | MSC GeoMet   |    |    |
|                         |  | (Tides)  |  | (Weather)    |    |    |
|                         |  +----------+  +--------------+    |    |
|                         |                                    |    |
|                         |  +----------+  +--------------+    |    |
|                         |  | VCH Web  |  | Webcam       |    |    |
|                         |  | (Scrape) |  | Providers    |    |    |
|                         |  +----------+  +--------------+    |    |
|                         +------------------------------------+    |
+------------------------------------------------------------------+
```

### Data Flow

```
User Request Flow:
==================

[Browser] --> [React App] --> [API Request] --> [Express Server]
                                                      |
                                                      v
                                              [Cache Manager]
                                                      |
                              +-------+---------------+---------------+
                              |       |               |               |
                              v       v               v               v
                          [IWLS]  [Weather]    [VCH Scraper]   [Webcam URLs]
                              |       |               |               |
                              +-------+---------------+---------------+
                                              |
                                              v
                                      [Normalize Data]
                                              |
                                              v
                                      [Store in Cache]
                                              |
                                              v
                                      [Return to Client]

Background Refresh Flow:
========================

[Scheduler] --> [Cron Job] --> [Refresh All Data]
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
                    v                 v                 v
            [Weather Job]      [Tide Job]      [Water Quality Job]
                    |                 |                 |
                    +-----------------+-----------------+
                                      |
                                      v
                              [Update Cache]
```

### Integration Points List

| Integration Point | Location | Implementation | Rate Limit | Fallback |
|-------------------|----------|----------------|------------|----------|
| IWLS Tide API | iwlsService.ts | REST GET with station ID | 3 req/sec | Serve cached data |
| MSC GeoMet Weather | weatherService.ts | OGC API Features | None specified | Serve cached data |
| VCH Water Quality | waterQualityService.ts | HTML scraping + parsing | N/A | Serve cached data |
| Webcam Embeds | webcamService.ts | Static URL configuration | N/A | Placeholder image |

### Integration Boundary Contracts

```yaml
IWLS API Boundary:
  Input: Station ID, time range
  Output: Array of tide predictions (sync HTTP response)
  On Error: Return cached data or error object with retry timestamp

Weather API Boundary:
  Input: Latitude, longitude coordinates
  Output: Weather forecast object (sync HTTP response)
  On Error: Return cached data or degraded response

VCH Scraper Boundary:
  Input: Beach name/ID
  Output: Water quality status object (async scraping)
  On Error: Return cached data, log scraping failure

Webcam Service Boundary:
  Input: Beach ID
  Output: Embed URL or null (sync lookup)
  On Error: Return null, client displays placeholder
```

### Main Components

#### Backend Components

##### Express Server (`/server/src/index.ts`)
- **Responsibility**: HTTP server setup, middleware configuration, route mounting
- **Interface**: `startServer(port: number): Promise<void>`
- **Dependencies**: Express, cors, helmet

##### API Routes (`/server/src/routes/`)
- **Responsibility**: HTTP endpoint handling, request validation, response formatting
- **Interfaces**:
  - `GET /api/beaches` - List all beaches with summary
  - `GET /api/beaches/:id` - Beach detail with all data
  - `GET /api/weather/:beachId` - Weather for specific beach
  - `GET /api/tides/:beachId` - Tide data for specific beach
  - `GET /api/water-quality/:beachId` - Water quality status
- **Dependencies**: Services, Cache Manager

##### IWLS Service (`/server/src/services/iwlsService.ts`)
- **Responsibility**: Communicate with Canadian Hydrographic Service IWLS API
- **Interface**:
  ```typescript
  getTidePredictions(stationId: string, from: Date, to: Date): Promise<TidePrediction[]>
  ```
- **Dependencies**: HTTP client, Rate Limiter

##### Weather Service (`/server/src/services/weatherService.ts`)
- **Responsibility**: Fetch weather data from Environment Canada MSC GeoMet API
- **Interface**:
  ```typescript
  getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast>
  ```
- **Dependencies**: HTTP client

##### Water Quality Service (`/server/src/services/waterQualityService.ts`)
- **Responsibility**: Scrape and parse VCH water quality reports
- **Interface**:
  ```typescript
  getWaterQuality(beachName: string): Promise<WaterQualityStatus>
  ```
- **Dependencies**: HTML parser (cheerio), HTTP client

##### Cache Manager (`/server/src/cache/cacheManager.ts`)
- **Responsibility**: In-memory caching with TTL, request coalescing, LRU eviction
- **Interface**:
  ```typescript
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs: number): Promise<void>
  getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T>
  clear(key: string): void
  getStats(): { size: number, hitRate: number }
  ```
- **Dependencies**: None (in-memory Map with LRU eviction when max size reached)
- **Configuration**: Max cache size of 1000 entries with LRU eviction policy

##### Rate Limiter (`/server/src/cache/rateLimiter.ts`)
- **Responsibility**: Enforce rate limits for external API calls
- **Interface**:
  ```typescript
  acquireSlot(apiName: string): Promise<boolean>
  release(apiName: string): void
  ```
- **Dependencies**: None

##### Scheduler (`/server/src/jobs/scheduler.ts`)
- **Responsibility**: Schedule and run periodic data refresh jobs
- **Interface**:
  ```typescript
  scheduleJob(name: string, cronExpression: string, handler: () => Promise<void>): void
  start(): void
  stop(): void
  ```
- **Dependencies**: node-cron or similar

#### Frontend Components

##### Dashboard Page (`/client/src/pages/Dashboard.tsx`)
- **Responsibility**: Main view showing all 9 beaches overview
- **Interface**: React component
- **Dependencies**: BeachCard, useBeaches hook

##### Beach Detail Page (`/client/src/pages/BeachDetail.tsx`)
- **Responsibility**: Detailed view for single beach with all data
- **Interface**: React component with `beachId` route param
- **Dependencies**: WeatherWidget, TideChart, WaterQuality, WebcamEmbed

##### Beach Card (`/client/src/components/BeachCard.tsx`)
- **Responsibility**: Summary card for beach on dashboard
- **Props**: `beach: BeachSummary`
- **Dependencies**: None

##### Weather Widget (`/client/src/components/WeatherWidget.tsx`)
- **Responsibility**: Display weather forecast with icons
- **Props**: `forecast: WeatherForecast, loading: boolean`
- **Dependencies**: None

##### Tide Chart (`/client/src/components/TideChart.tsx`)
- **Responsibility**: Visual tide timeline with high/low markers
- **Props**: `tides: TidePrediction[], timezone: string`
- **Dependencies**: Chart library (optional)

##### Water Quality Indicator (`/client/src/components/WaterQuality.tsx`)
- **Responsibility**: Display water quality status with color coding
- **Props**: `status: WaterQualityStatus`
- **Dependencies**: None

##### Webcam Embed (`/client/src/components/WebcamEmbed.tsx`)
- **Responsibility**: Lazy-load and display webcam iframe
- **Props**: `embedUrl: string | null, beachName: string`
- **Dependencies**: None

### Type Definitions

```typescript
// /shared/types/beach.ts
export interface Beach {
  id: string;
  name: string;
  slug: string;
  location: {
    latitude: number;
    longitude: number;
  };
  tideStationId: string;
  hasWebcam: boolean;
  webcamUrl: string | null;
}

export interface BeachSummary {
  id: string;
  name: string;
  currentWeather: {
    temperature: number;
    condition: WeatherCondition;
    icon: string;
  } | null;
  nextTide: {
    type: 'high' | 'low';
    time: string;
    height: number;
  } | null;
  waterQuality: WaterQualityLevel;
  lastUpdated: string;
}

// /shared/types/weather.ts
export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'foggy';

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

// /shared/types/tide.ts
export interface TidePrediction {
  time: string; // ISO 8601
  height: number; // meters
  type: 'high' | 'low';
}

export interface TideData {
  beachId: string;
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  fetchedAt: string;
}

// /shared/types/waterQuality.ts
export type WaterQualityLevel = 'good' | 'advisory' | 'closed' | 'unknown' | 'off-season';

export interface WaterQualityStatus {
  beachId: string;
  level: WaterQualityLevel;
  ecoliCount: number | null;
  advisoryReason: string | null;
  sampleDate: string | null;
  fetchedAt: string;
}

// /shared/types/api.ts
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

### Data Contract

#### Beach API Endpoint

```yaml
Endpoint: GET /api/beaches
Input:
  Type: None
  Preconditions: None
  Validation: None

Output:
  Type: ApiResponse<BeachSummary[]>
  Guarantees:
    - Always returns array (empty if all sources fail)
    - Each beach has id, name fields
    - Optional fields may be null
  On Error: { success: false, error: string, data: null }

Invariants:
  - Beach count is always 9
  - Beach IDs are stable across requests
```

#### Weather Endpoint

```yaml
Endpoint: GET /api/weather/:beachId
Input:
  Type: { beachId: string }
  Preconditions: beachId must be valid beach identifier
  Validation: Check beachId against known beach list

Output:
  Type: ApiResponse<WeatherForecast>
  Guarantees:
    - Temperature in Celsius
    - Wind speed in km/h
    - Times in ISO 8601 format
  On Error: Return cached data if available, else error response

Invariants:
  - Hourly forecast contains 24 entries
  - All temperatures are realistic (-40 to +50 range)
```

#### Tide Endpoint

```yaml
Endpoint: GET /api/tides/:beachId
Input:
  Type: { beachId: string }
  Preconditions: beachId must be valid beach identifier
  Validation: Check beachId against known beach list

Output:
  Type: ApiResponse<TideData>
  Guarantees:
    - Predictions sorted by time ascending
    - Heights in meters
    - Times in ISO 8601 with timezone
  On Error: Return cached data if available, else error response

Invariants:
  - Alternating high/low tide types
  - At least 6 predictions (3 high, 3 low)
```

#### Water Quality Endpoint

```yaml
Endpoint: GET /api/water-quality/:beachId
Input:
  Type: { beachId: string }
  Preconditions: beachId must be valid beach identifier
  Validation: Check beachId against known beach list

Output:
  Type: ApiResponse<WaterQualityStatus>
  Guarantees:
    - Level is one of defined enum values
    - sampleDate is valid date string or null
  On Error: Return { level: 'unknown' } with error flag

Invariants:
  - Advisory reason present when level is 'advisory' or 'closed'
  - ecoliCount null during off-season
```

### State Transitions and Invariants

#### Cache State Machine

```
[Empty] ---(first request)---> [Fetching]
[Fetching] ---(success)---> [Fresh]
[Fetching] ---(failure)---> [Error]
[Fresh] ---(TTL expires)---> [Stale]
[Stale] ---(background refresh)---> [Refreshing]
[Refreshing] ---(success)---> [Fresh]
[Refreshing] ---(failure)---> [Stale] (keep old data)
[Error] ---(retry)---> [Fetching]
```

**Invariants**:
- Stale data is always served rather than returning error
- Only one fetch operation per cache key at a time (request coalescing)
- TTL timer starts from successful fetch completion

#### Water Quality Status Transitions

```
[Good] ---(E.coli > 200)---> [Advisory]
[Advisory] ---(E.coli > 400 or health order)---> [Closed]
[Advisory] ---(E.coli < 200)---> [Good]
[Closed] ---(health order lifted)---> [Advisory or Good]
[Any] ---(October 1)---> [Off-Season]
[Off-Season] ---(May 1)---> [Unknown] (awaiting first sample)
```

### Error Handling

| Error Type | Detection | Response | Logging |
|------------|-----------|----------|---------|
| IWLS Rate Limit | HTTP 429 | Serve cached data | Warn level |
| IWLS API Error | HTTP 5xx | Serve cached data | Error level |
| Weather API Timeout | >5s response | Serve cached data | Warn level |
| VCH Scrape Failure | Parse error | Serve cached data | Error level |
| Invalid Beach ID | Route param check | 404 response | Info level |
| Cache Miss + API Fail | Both conditions | 503 with retry hint | Error level |

#### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: 'RATE_LIMITED' | 'API_ERROR' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';
    message: string;
    retryAfter?: number; // seconds
  };
  data: null;
  cached: false;
  cachedAt: null;
}
```

### Logging and Monitoring

#### Log Events

| Event | Level | Data |
|-------|-------|------|
| API Request | INFO | method, path, responseTime, statusCode |
| Cache Hit | DEBUG | key, age |
| Cache Miss | DEBUG | key |
| External API Call | INFO | service, endpoint, responseTime, status |
| Rate Limit | WARN | service, retryAfter |
| Scrape Failure | ERROR | url, parseError |
| Background Job | INFO | jobName, duration, itemsProcessed |

#### Metrics to Track

- Request latency percentiles (p50, p95, p99)
- Cache hit rate per data type
- External API success rate
- Error rate by endpoint

## Implementation Plan

### Implementation Approach

**Selected Approach**: Vertical Slice with Foundation Layer
**Selection Reason**:
- Each beach data type (weather, tides, water quality) can be implemented end-to-end independently
- Foundation layer (cache, rate limiter) must be built first as all slices depend on it
- Allows early user feedback on individual features
- Minimizes integration risk by testing each slice in isolation

### Technical Dependencies and Implementation Order

#### Required Implementation Order

1. **Shared Types Package**
   - Technical Reason: Type definitions required by both client and server
   - Dependent Elements: All other components

2. **Server Foundation (Cache + Rate Limiter)**
   - Technical Reason: All external API calls depend on caching and rate limiting
   - Dependent Elements: All service modules

3. **Express Server Setup**
   - Technical Reason: Route handlers need server infrastructure
   - Prerequisites: Shared types

4. **Beach Configuration Data**
   - Technical Reason: Static mapping of beaches to coordinates, tide stations
   - Dependent Elements: All API endpoints

5. **Vertical Slices (can be parallel after foundation)**
   - 5a. Tide Service + Route + Component
   - 5b. Weather Service + Route + Component
   - 5c. Water Quality Service + Route + Component
   - 5d. Webcam Service + Route + Component

6. **Dashboard Integration**
   - Technical Reason: Requires all individual components
   - Prerequisites: All vertical slices

7. **Background Jobs**
   - Technical Reason: Optimization layer, not critical path
   - Prerequisites: All services implemented

### Implementation Phases

#### Phase 1: Foundation (L3 Verification)
- Create monorepo structure with pnpm workspaces
- Define shared TypeScript types
- Implement Cache Manager
- Implement Rate Limiter
- Set up Express server skeleton
- Set up Vite + React client skeleton

#### Phase 2: First Vertical Slice - Tides (L1 Verification)
- Implement IWLS Service with API integration
- Create /api/tides/:beachId endpoint
- Build TideChart component
- End-to-end: User can see tide data for a beach

#### Phase 3: Weather Slice (L1 Verification)
- Implement Weather Service with MSC GeoMet integration
- Create /api/weather/:beachId endpoint
- Build WeatherWidget component
- End-to-end: User can see weather for a beach

#### Phase 4: Water Quality Slice (L1 Verification)
- Implement VCH scraper service
- Create /api/water-quality/:beachId endpoint
- Build WaterQuality component
- End-to-end: User can see water quality status

#### Phase 5: Webcams + Dashboard (L1 Verification)
- Configure webcam URLs per beach
- Build WebcamEmbed component with lazy loading
- Create Dashboard page with all BeachCards
- Create BeachDetail page
- End-to-end: Complete user experience

#### Phase 6: Optimization (L2 Verification)
- Implement background refresh jobs
- Add request coalescing
- Performance testing and optimization
- Mobile responsiveness polish

#### Phase 7: Quality Assurance (L3 Verification)
- Verify all acceptance criteria achieved
- Confirm all tests passing (80% coverage target, exceeds 70% minimum per technical-spec)
- Complete quality checks (type-check, lint, build)
- Final review and documentation updates

### Integration Points

**Integration Point 1: IWLS API**
- Components: iwlsService -> Cache Manager -> Rate Limiter
- Verification: Unit test with mocked API, integration test with sandbox

**Integration Point 2: MSC GeoMet API**
- Components: weatherService -> Cache Manager
- Verification: Unit test with mocked API, verify data transformation

**Integration Point 3: VCH Scraper**
- Components: waterQualityService -> HTML Parser
- Verification: Snapshot test with saved HTML, integration test with live site

**Integration Point 4: Client-Server**
- Components: React hooks -> Express API -> Services
- Verification: E2E test with Cypress/Playwright

### Migration Strategy

Not applicable (greenfield project).

## Test Strategy

### Unit Tests

- **Coverage Goal**: 80% statement coverage
- **Focus Areas**:
  - Data transformation functions (API response -> typed objects)
  - Cache Manager TTL logic
  - Rate Limiter slot management
  - VCH HTML parsing logic
- **Mocking**: All external HTTP calls mocked
- **Tools**: Vitest

### Integration Tests

- **Focus Areas**:
  - API endpoint request/response validation
  - Cache behavior (hit/miss/stale)
  - Error handling and fallback paths
- **Setup**: In-memory cache, mocked external APIs
- **Tools**: Vitest with supertest

### E2E Tests

- **Focus Areas**:
  - Dashboard loads with all 9 beaches
  - Beach detail page displays all widgets
  - Error states display correctly
  - Mobile responsive behavior
- **Tools**: Playwright
- **Critical Paths**:
  1. User visits dashboard, sees all beaches
  2. User clicks beach, sees detailed conditions
  3. User on mobile can navigate and view data

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API Key Exposure | No API keys required (public APIs), if added use env vars |
| XSS via Scraped Data | Sanitize all HTML-sourced content before rendering |
| Iframe Security | Use sandbox attribute, only allow known webcam domains |
| Rate Limit Abuse | Server-side rate limiting, no direct API proxy |
| CORS | Strict origin whitelist in production |

## Alternative Solutions

### Alternative 1: Static Site with Cloudflare Workers

- **Overview**: Pre-render pages, use Cloudflare Workers for API calls
- **Advantages**: Lower hosting cost, edge caching, no server management
- **Disadvantages**: More complex deployment, less real-time capability
- **Reason for Rejection**: Project scope prefers simpler monorepo, real-time updates valued

### Alternative 2: BFF (Backend for Frontend) with tRPC

- **Overview**: Use tRPC for type-safe client-server communication
- **Advantages**: End-to-end type safety, less boilerplate
- **Disadvantages**: Steeper learning curve, tighter coupling
- **Reason for Rejection**: REST API more familiar, easier for future API consumers

### Alternative 3: GraphQL with Apollo

- **Overview**: Single GraphQL endpoint for flexible data fetching
- **Advantages**: Client specifies exact data needs, reduces over-fetching
- **Disadvantages**: Complexity overhead for simple data requirements
- **Reason for Rejection**: Fixed data requirements don't benefit from GraphQL flexibility

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| IWLS API deprecation | High | Low | Abstract service layer for easy replacement |
| VCH website redesign | Medium | Medium | Isolated scraper module, alerting on parse failures |
| Weather API changes | Medium | Low | Version lock API calls, monitor for deprecation notices |
| Webcam URL changes | Low | Medium | Admin configuration, easy URL updates |
| Rate limit exhaustion | Medium | Medium | Request coalescing, aggressive caching, off-peak refresh |
| High traffic spikes | Medium | Medium | In-memory cache, no DB dependency |

## Vancouver Beaches Configuration

### Beach Data

| Beach | Latitude | Longitude | Tide Station | Webcam |
|-------|----------|-----------|--------------|--------|
| English Bay | 49.2867 | -123.1432 | 7735 (Vancouver) | SkylineWebcams |
| Jericho Beach | 49.2727 | -123.1978 | 7735 (Vancouver) | earthTV |
| Kitsilano Beach | 49.2732 | -123.1536 | 7735 (Vancouver) | Katkam |
| Locarno Beach | 49.2768 | -123.2062 | 7735 (Vancouver) | None |
| Second Beach | 49.2904 | -123.1464 | 7735 (Vancouver) | None |
| Spanish Banks | 49.2766 | -123.2249 | 7735 (Vancouver) | None |
| Sunset Beach | 49.2785 | -123.1352 | 7735 (Vancouver) | None |
| Third Beach | 49.2994 | -123.1585 | 7735 (Vancouver) | None |
| Trout Lake | 49.2554 | -123.0643 | N/A (lake) | None |

*Note: Trout Lake is a freshwater lake, tide data not applicable.*

### Tide Station Reference

- Station ID: 7735
- Station Name: Vancouver
- Source: CHS IWLS API
- Timezone: America/Vancouver

## References

- [Canadian Hydrographic Service IWLS API Documentation](https://tides.gc.ca/en/web-services-offered-canadian-hydrographic-service) - Official tide data API
- [IWLS API Swagger UI](https://api-sine.dfo-mpo.gc.ca/swagger-ui/index.html) - API endpoint documentation
- [MSC GeoMet API](https://api.weather.gc.ca/) - Environment Canada weather data API
- [MSC GeoMet Documentation](https://eccc-msc.github.io/open-data/msc-geomet/readme_en/) - Detailed API usage guide
- [Vancouver Coastal Health Beach Water Quality](https://www.vch.ca/en/service/public-beach-water-quality) - Official water quality reports
- [SkylineWebcams Vancouver English Bay](https://www.skylinewebcams.com/en/webcam/canada/british-columbia/vancouver/vancouver-english-bay.html) - English Bay webcam
- [earthTV Jericho Sailing Centre](https://www.earthtv.com/en/webcam/vancouver-jericho-sailing-centre) - Jericho Beach webcam
- [Katkam](http://www.katkam.ca/) - Kitsilano area webcam
- [React Vite Express Monorepo Best Practices](https://dusanstam.com/posts/react-express-monorepo) - Monorepo setup guide
- [pnpm Workspaces for Monorepos](https://dev.to/lico/react-monorepo-setup-tutorial-with-pnpm-and-vite-react-project-ui-utils-5705) - pnpm workspace configuration

## Update History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-16 | 1.0 | Initial version | Van Beaches Team |
