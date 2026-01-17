# Task: TASK-024 Webcam Service

Metadata:
- Phase: 5 - Webcams + Dashboard
- Dependencies: TASK-007 (Beach Config)
- Provides: Service to return webcam embed URLs from static configuration
- Size: Small (2 files)
- Verification Level: L2 (Tests)

## Implementation Content

Create the Webcam Service that returns webcam embed URLs based on beach configuration. This service does not make external API calls - it simply returns the configured webcam URL or null from the beach data.

## Target Files

- [ ] `/home/zxela/workspace/server/src/services/webcamService.ts`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/webcamService.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-007: Beach config available at `/shared/data/beaches.ts`
- [ ] Write failing tests for Webcam Service:
  ```typescript
  import { describe, it, expect } from 'vitest'
  import { webcamService } from '../webcamService'

  describe('WebcamService', () => {
    describe('getWebcamUrl', () => {
      it('returns URL for beach with webcam (English Bay)', () => {
        const url = webcamService.getWebcamUrl('english-bay')

        expect(url).not.toBeNull()
        expect(url).toContain('skylinewebcams')
      })

      it('returns URL for beach with webcam (Jericho)', () => {
        const url = webcamService.getWebcamUrl('jericho-beach')

        expect(url).not.toBeNull()
        expect(url).toContain('earthtv')
      })

      it('returns URL for beach with webcam (Kitsilano)', () => {
        const url = webcamService.getWebcamUrl('kitsilano-beach')

        expect(url).not.toBeNull()
        expect(url).toContain('katkam')
      })

      it('returns null for beach without webcam (Locarno)', () => {
        const url = webcamService.getWebcamUrl('locarno-beach')

        expect(url).toBeNull()
      })

      it('returns null for beach without webcam (Trout Lake)', () => {
        const url = webcamService.getWebcamUrl('trout-lake')

        expect(url).toBeNull()
      })

      it('returns null for invalid beach ID', () => {
        const url = webcamService.getWebcamUrl('invalid-beach')

        expect(url).toBeNull()
      })
    })

    describe('hasWebcam', () => {
      it('returns true for beaches with webcams', () => {
        expect(webcamService.hasWebcam('english-bay')).toBe(true)
        expect(webcamService.hasWebcam('jericho-beach')).toBe(true)
        expect(webcamService.hasWebcam('kitsilano-beach')).toBe(true)
      })

      it('returns false for beaches without webcams', () => {
        expect(webcamService.hasWebcam('locarno-beach')).toBe(false)
        expect(webcamService.hasWebcam('second-beach')).toBe(false)
        expect(webcamService.hasWebcam('spanish-banks')).toBe(false)
        expect(webcamService.hasWebcam('sunset-beach')).toBe(false)
        expect(webcamService.hasWebcam('third-beach')).toBe(false)
        expect(webcamService.hasWebcam('trout-lake')).toBe(false)
      })
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Webcam Service:
  ```typescript
  import { getBeachById } from '@van-beaches/shared/data'

  export class WebcamService {
    getWebcamUrl(beachId: string): string | null {
      const beach = getBeachById(beachId)

      if (!beach) {
        return null
      }

      return beach.webcamUrl
    }

    hasWebcam(beachId: string): boolean {
      const beach = getBeachById(beachId)
      return beach?.hasWebcam ?? false
    }
  }

  export const webcamService = new WebcamService()
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify service returns correct URLs for beaches with webcams
- [ ] Verify service returns null for beaches without webcams
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Service returns correct URLs for beaches with webcams
- [ ] Service returns null for beaches without webcams
- [ ] English Bay, Jericho, Kitsilano have URLs
- [ ] Locarno, Second Beach, Spanish Banks, Sunset, Third Beach, Trout Lake return null
- [ ] Unit tests pass
- [ ] Verification: L2 (Tests)

## AC References from Design Doc

- Integration Boundary: "Webcam Service: Input: Beach ID, Output: Embed URL or null"
- Webcam data: English Bay (SkylineWebcams), Jericho (earthTV), Kitsilano (Katkam)
- No external API calls (static configuration)

## Notes

- Impact scope: WebcamEmbed Component (TASK-025) depends on this service
- Constraints: No external API calls - purely static lookup
- Only 3 out of 9 beaches have webcams
- Service is synchronous (no async needed)
