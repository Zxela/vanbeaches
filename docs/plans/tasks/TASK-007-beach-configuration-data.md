# Task: TASK-007 Beach Configuration Data

Metadata:
- Phase: 1 - Foundation
- Dependencies: TASK-002 (Shared Types Package)
- Provides: Static beach data with coordinates, tide stations, webcam URLs
- Size: Small (2 files)
- Verification Level: L3 (Build Success) + L2 (Tests)

## Implementation Content

Create the beach configuration data file with all 9 Vancouver beach entries including coordinates, tide station mappings, and webcam URLs. This static configuration is used by all services to map beach IDs to their data sources.

## Target Files

- [ ] `/home/zxela/workspace/shared/data/beaches.ts`
- [ ] `/home/zxela/workspace/shared/data/__tests__/beaches.test.ts`
- [ ] `/home/zxela/workspace/shared/data/index.ts` (barrel export)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review TASK-002 deliverables (Beach type available)
- [ ] Write failing tests for beach data:
  ```typescript
  describe('Beach Configuration', () => {
    describe('data integrity', () => {
      it('contains exactly 9 beaches', () => {
        expect(beaches.length).toBe(9)
      })

      it('all beaches have required fields', () => {
        beaches.forEach(beach => {
          expect(beach.id).toBeDefined()
          expect(beach.name).toBeDefined()
          expect(beach.slug).toBeDefined()
          expect(beach.location.latitude).toBeDefined()
          expect(beach.location.longitude).toBeDefined()
        })
      })

      it('beachTideStationMap has 9 entries', () => {
        expect(beachTideStationMap.size).toBe(9)
      })

      it('Trout Lake has null tideStationId', () => {
        const troutLake = beaches.find(b => b.slug === 'trout-lake')
        expect(troutLake?.tideStationId).toBeNull()
      })

      it('English Bay has webcam URL', () => {
        const englishBay = beaches.find(b => b.slug === 'english-bay')
        expect(englishBay?.hasWebcam).toBe(true)
        expect(englishBay?.webcamUrl).toBeDefined()
      })
    })

    describe('helper functions', () => {
      it('getBeachById returns correct beach', () => {
        const beach = getBeachById('english-bay')
        expect(beach?.name).toBe('English Bay')
      })

      it('getBeachBySlug returns correct beach', () => {
        const beach = getBeachBySlug('jericho-beach')
        expect(beach?.name).toBe('Jericho Beach')
      })

      it('returns undefined for invalid ID', () => {
        expect(getBeachById('invalid')).toBeUndefined()
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Create `/shared/data/beaches.ts`:
  ```typescript
  import type { Beach } from '../types'

  export const beaches: Beach[] = [
    {
      id: 'english-bay',
      name: 'English Bay',
      slug: 'english-bay',
      location: { latitude: 49.2867, longitude: -123.1432 },
      tideStationId: '7735',
      hasWebcam: true,
      webcamUrl: 'https://www.skylinewebcams.com/...'
    },
    {
      id: 'jericho-beach',
      name: 'Jericho Beach',
      slug: 'jericho-beach',
      location: { latitude: 49.2727, longitude: -123.1978 },
      tideStationId: '7735',
      hasWebcam: true,
      webcamUrl: 'https://www.earthtv.com/...'
    },
    {
      id: 'kitsilano-beach',
      name: 'Kitsilano Beach',
      slug: 'kitsilano-beach',
      location: { latitude: 49.2732, longitude: -123.1536 },
      tideStationId: '7735',
      hasWebcam: true,
      webcamUrl: 'http://www.katkam.ca/'
    },
    {
      id: 'locarno-beach',
      name: 'Locarno Beach',
      slug: 'locarno-beach',
      location: { latitude: 49.2768, longitude: -123.2062 },
      tideStationId: '7735',
      hasWebcam: false,
      webcamUrl: null
    },
    {
      id: 'second-beach',
      name: 'Second Beach',
      slug: 'second-beach',
      location: { latitude: 49.2904, longitude: -123.1464 },
      tideStationId: '7735',
      hasWebcam: false,
      webcamUrl: null
    },
    {
      id: 'spanish-banks',
      name: 'Spanish Banks',
      slug: 'spanish-banks',
      location: { latitude: 49.2766, longitude: -123.2249 },
      tideStationId: '7735',
      hasWebcam: false,
      webcamUrl: null
    },
    {
      id: 'sunset-beach',
      name: 'Sunset Beach',
      slug: 'sunset-beach',
      location: { latitude: 49.2785, longitude: -123.1352 },
      tideStationId: '7735',
      hasWebcam: false,
      webcamUrl: null
    },
    {
      id: 'third-beach',
      name: 'Third Beach',
      slug: 'third-beach',
      location: { latitude: 49.2994, longitude: -123.1585 },
      tideStationId: '7735',
      hasWebcam: false,
      webcamUrl: null
    },
    {
      id: 'trout-lake',
      name: 'Trout Lake',
      slug: 'trout-lake',
      location: { latitude: 49.2554, longitude: -123.0643 },
      tideStationId: null, // Lake - no tides
      hasWebcam: false,
      webcamUrl: null
    }
  ]

  export const beachTideStationMap = new Map(
    beaches.map(b => [b.id, b.tideStationId])
  )

  export function getBeachById(id: string): Beach | undefined {
    return beaches.find(b => b.id === id)
  }

  export function getBeachBySlug(slug: string): Beach | undefined {
    return beaches.find(b => b.slug === slug)
  }
  ```
- [ ] Create barrel export in `/shared/data/index.ts`
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify all 9 beaches from Design Doc included
- [ ] Verify property: `beachTideStationMap.size === 9`
- [ ] Verify Trout Lake has `tideStationId: null`
- [ ] Verify webcam URLs match Design Doc references
- [ ] Confirm added tests pass

## Beach Data (from Design Doc)

| Beach | Latitude | Longitude | Tide Station | Webcam |
|-------|----------|-----------|--------------|--------|
| English Bay | 49.2867 | -123.1432 | 7735 | SkylineWebcams |
| Jericho Beach | 49.2727 | -123.1978 | 7735 | earthTV |
| Kitsilano Beach | 49.2732 | -123.1536 | 7735 | Katkam |
| Locarno Beach | 49.2768 | -123.2062 | 7735 | None |
| Second Beach | 49.2904 | -123.1464 | 7735 | None |
| Spanish Banks | 49.2766 | -123.2249 | 7735 | None |
| Sunset Beach | 49.2785 | -123.1352 | 7735 | None |
| Third Beach | 49.2994 | -123.1585 | 7735 | None |
| Trout Lake | 49.2554 | -123.0643 | N/A (lake) | None |

## Completion Criteria

- [ ] All 9 beaches from Design Doc "Vancouver Beaches Configuration" included
- [ ] Property validation: `beachTideStationMap.size === 9`
- [ ] Property validation: Trout Lake has `tideStationId: null`
- [ ] Helper functions work correctly (getBeachById, getBeachBySlug)
- [ ] Unit tests pass for data integrity
- [ ] Verification: L3 (Build) + L2 (Tests pass)

## AC References from Design Doc

- AC: "Beach count is always 9"
- AC: "beachTideStationMap.size === 9" (includes null entries for lakes)
- Data Contract: "Beach IDs are stable across requests"
- Note: "Trout Lake is a freshwater lake, tide data not applicable"

## Notes

- Impact scope: All services and routes use this configuration
- Constraints: Beach IDs must be stable (used in URLs and API endpoints)
- Tide station 7735 = Vancouver station (shared by 8 coastal beaches)
- Webcam URLs reference specific providers from Design Doc
