# Task: TASK-019 VCH Scraper Service

Metadata:
- Phase: 4 - Water Quality Slice
- Dependencies: TASK-003 (Cache Manager), TASK-007 (Beach Config)
- Provides: Service to scrape water quality data from Vancouver Coastal Health website
- Size: Small (4 files including fixtures)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Create the Water Quality Service that scrapes the Vancouver Coastal Health (VCH) website for beach water quality reports. The service uses cheerio for HTML parsing, extracts water quality status (Good/Advisory/Closed), E.coli counts, and sample dates. It integrates with Cache Manager (6-hour TTL), handles off-season detection (October-April), and gracefully handles parse failures.

## Target Files

- [ ] `/home/zxela/workspace/server/src/services/waterQualityService.ts`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/waterQualityService.test.ts`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/fixtures/vch-good.html`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/fixtures/vch-advisory.html`
- [ ] `/home/zxela/workspace/server/src/services/__tests__/fixtures/vch-closed.html`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-003: CacheManager available at `/server/src/cache/cacheManager.ts`
  - TASK-007: Beach config available at `/shared/data/beaches.ts`
- [ ] Write failing tests for Water Quality Service:
  ```typescript
  import { readFileSync } from 'fs'
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { waterQualityService, parseWaterQuality } from '../waterQualityService'

  const fixturesDir = '__tests__/fixtures'

  describe('WaterQualityService', () => {
    describe('getWaterQuality', () => {
      it('returns typed WaterQualityStatus', async () => {
        const goodHtml = readFileSync(`${fixturesDir}/vch-good.html`, 'utf-8')
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(goodHtml)
        })

        const result = await waterQualityService.getWaterQuality('English Bay')

        expect(result).toMatchObject({
          level: 'good',
          ecoliCount: expect.any(Number),
          sampleDate: expect.any(String)
        })
      })

      it('integrates with cache manager (6-hour TTL)', async () => {
        const cachedData = { level: 'good', ecoliCount: 50 }
        cache.set('water-quality:English Bay', cachedData, 21600000)

        const result = await waterQualityService.getWaterQuality('English Bay')

        expect(fetch).not.toHaveBeenCalled()
        expect(result.level).toBe('good')
      })
    })

    describe('parseWaterQuality', () => {
      it('parses "Good" status correctly', () => {
        const html = readFileSync(`${fixturesDir}/vch-good.html`, 'utf-8')

        const result = parseWaterQuality(html, 'English Bay')

        expect(result.level).toBe('good')
        expect(result.advisoryReason).toBeNull()
      })

      it('parses "Advisory" status with reason', () => {
        const html = readFileSync(`${fixturesDir}/vch-advisory.html`, 'utf-8')

        const result = parseWaterQuality(html, 'English Bay')

        expect(result.level).toBe('advisory')
        expect(result.advisoryReason).toBeDefined()
        expect(result.advisoryReason).not.toBeNull()
      })

      it('parses "Closed" status', () => {
        const html = readFileSync(`${fixturesDir}/vch-closed.html`, 'utf-8')

        const result = parseWaterQuality(html, 'English Bay')

        expect(result.level).toBe('closed')
      })

      it('extracts E.coli count', () => {
        const html = readFileSync(`${fixturesDir}/vch-good.html`, 'utf-8')

        const result = parseWaterQuality(html, 'English Bay')

        expect(typeof result.ecoliCount).toBe('number')
      })

      it('extracts sample date', () => {
        const html = readFileSync(`${fixturesDir}/vch-good.html`, 'utf-8')

        const result = parseWaterQuality(html, 'English Bay')

        expect(result.sampleDate).toBeDefined()
        expect(new Date(result.sampleDate!)).toBeInstanceOf(Date)
      })
    })

    describe('off-season handling', () => {
      it('returns off-season status in October-April', () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15')) // January

        const result = await waterQualityService.getWaterQuality('English Bay')

        expect(result.level).toBe('off-season')
        vi.useRealTimers()
      })
    })

    describe('error handling', () => {
      it('returns cached data on parse failure', async () => {
        const cachedData = { level: 'good', ecoliCount: 50 }
        cache.set('water-quality:English Bay', cachedData, 21600000)
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>Invalid HTML</html>')
        })

        const result = await waterQualityService.getWaterQuality('English Bay')

        expect(result.level).toBe('good') // From cache
      })

      it('returns unknown status when no cache and parse fails', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html>Invalid HTML</html>')
        })

        const result = await waterQualityService.getWaterQuality('English Bay')

        expect(result.level).toBe('unknown')
      })
    })
  })
  ```
- [ ] Create HTML fixture files for Good, Advisory, and Closed states
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Water Quality Service:
  ```typescript
  import * as cheerio from 'cheerio'
  import type { WaterQualityStatus, WaterQualityLevel } from '@van-beaches/shared'
  import { cacheManager } from '../cache/cacheManager'

  const VCH_URL = 'https://www.vch.ca/en/service/public-beach-water-quality'
  const WATER_QUALITY_CACHE_TTL = 21600000 // 6 hours

  export class WaterQualityService {
    async getWaterQuality(beachName: string): Promise<WaterQualityStatus> {
      // Check if off-season (October - April)
      const month = new Date().getMonth()
      if (month >= 9 || month <= 3) { // October(9) - April(3)
        return {
          beachId: beachName,
          level: 'off-season',
          ecoliCount: null,
          advisoryReason: null,
          sampleDate: null,
          fetchedAt: new Date().toISOString()
        }
      }

      const cacheKey = `water-quality:${beachName}`

      return cacheManager.getOrFetch(
        cacheKey,
        async () => {
          try {
            const response = await fetch(VCH_URL)
            if (!response.ok) {
              throw new Error(`VCH fetch failed: ${response.status}`)
            }

            const html = await response.text()
            return parseWaterQuality(html, beachName)
          } catch (error) {
            // Log error and return unknown status
            console.error('Water quality scraping failed:', error)
            throw error // Let cache manager handle fallback
          }
        },
        WATER_QUALITY_CACHE_TTL
      )
    }
  }

  export function parseWaterQuality(html: string, beachName: string): WaterQualityStatus {
    const $ = cheerio.load(html)

    // Find the beach row in the table
    // Note: Actual selectors depend on VCH website structure
    const beachRow = $(`tr:contains("${beachName}")`)

    if (beachRow.length === 0) {
      return {
        beachId: beachName,
        level: 'unknown',
        ecoliCount: null,
        advisoryReason: null,
        sampleDate: null,
        fetchedAt: new Date().toISOString()
      }
    }

    // Parse status
    const statusText = beachRow.find('.status').text().trim().toLowerCase()
    let level: WaterQualityLevel = 'unknown'
    if (statusText.includes('good') || statusText.includes('safe')) {
      level = 'good'
    } else if (statusText.includes('advisory')) {
      level = 'advisory'
    } else if (statusText.includes('closed')) {
      level = 'closed'
    }

    // Parse E.coli count
    const ecoliText = beachRow.find('.ecoli').text().trim()
    const ecoliCount = parseInt(ecoliText, 10) || null

    // Parse sample date
    const dateText = beachRow.find('.sample-date').text().trim()
    const sampleDate = dateText ? new Date(dateText).toISOString() : null

    // Parse advisory reason
    const advisoryReason = (level === 'advisory' || level === 'closed')
      ? beachRow.find('.reason').text().trim() || null
      : null

    return {
      beachId: beachName,
      level,
      ecoliCount,
      advisoryReason,
      sampleDate,
      fetchedAt: new Date().toISOString()
    }
  }

  export const waterQualityService = new WaterQualityService()
  ```
- [ ] Create HTML fixture files based on actual VCH website structure
- [ ] Implement cheerio parsing logic
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify service returns typed WaterQualityStatus
- [ ] Verify status correctly parsed from HTML
- [ ] Verify advisory reason extracted when applicable
- [ ] Verify off-season returns appropriate status
- [ ] Verify parse failures logged and cached data served
- [ ] Add snapshot tests to detect HTML structure changes
- [ ] Confirm added tests pass

## VCH Website Reference

```
URL: https://www.vch.ca/en/service/public-beach-water-quality
Content: HTML table with beach names, status, E.coli counts, sample dates
Update Frequency: Weekly during swimming season (May-September)

Risk: Website structure may change without notice
Mitigation: HTML fixture tests, snapshot tests, parse failure alerts
```

## Completion Criteria

- [ ] Service returns typed WaterQualityStatus
- [ ] Status correctly parsed from HTML (Good/Advisory/Closed)
- [ ] Advisory reason extracted when applicable
- [ ] E.coli counts and sample dates extracted
- [ ] Off-season returns appropriate status (October-April)
- [ ] Parse failures logged and cached data served
- [ ] HTML fixture tests for all status types
- [ ] Snapshot tests detect HTML structure changes
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Display water quality status as Good/Advisory/Closed/Unknown/Off-Season"
- AC: "When Advisory or Closed, display advisory reason"
- AC: "Display date of last water quality sample"
- AC: "If off-season, display 'Monitoring resumes in May'"
- Risk Mitigation: "Snapshot tests detect HTML structure changes"
- Cache: `waterQualityCache.ttl === 21600000` (6 hours)

## Notes

- Impact scope: Water Quality API Route (TASK-020) depends on this service
- Constraints: Web scraping required (no official API)
- Risk: VCH website redesign could break scraper
- Off-season: October through April (no water quality testing)
- HTML fixtures must be updated if VCH website changes
