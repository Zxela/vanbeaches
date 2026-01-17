# Task: TASK-038 E2E Test Implementation

Metadata:
- Phase: 7 - Quality Assurance
- Dependencies: Phase 5, Phase 6
- Provides: Complete E2E test suite for all user paths
- Size: Medium (3 files)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Complete the E2E test implementations in the pre-generated test skeletons at `/client/e2e/`. This includes dashboard tests (6 tests), beach detail tests (15 tests), and caching/performance tests (6 tests). Add API mocking for failure scenarios and mobile viewport tests.

## Target Files

- [ ] `/home/zxela/workspace/client/e2e/dashboard.spec.ts`
- [ ] `/home/zxela/workspace/client/e2e/beach-detail.spec.ts`
- [ ] `/home/zxela/workspace/client/e2e/caching-performance.spec.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review existing E2E test skeletons
- [ ] Identify tests that need implementation
- [ ] Run existing tests to confirm current state

### 2. Green Phase

#### dashboard.spec.ts (6 tests)
```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('displays all 9 Vancouver beaches', async ({ page }) => {
    await page.goto('/')

    const beachCards = page.locator('[data-testid="beach-card"]')
    await expect(beachCards).toHaveCount(9)
  })

  test('displays beach cards with conditions', async ({ page }) => {
    await page.goto('/')

    const card = page.locator('[data-testid="beach-card"]').first()

    // Should have beach name
    await expect(card.locator('h3')).toBeVisible()

    // Should have weather info or data unavailable
    const hasWeather = await card.locator('[data-testid="weather-icon"]').isVisible()
    const hasUnavailable = await card.getByText(/Data unavailable/i).isVisible()
    expect(hasWeather || hasUnavailable).toBe(true)
  })

  test('shows data unavailable on API fail', async ({ page }) => {
    // Mock API to fail
    await page.route('**/api/beaches', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: 'Server error' })
      })
    })

    await page.goto('/')

    await expect(page.getByText(/error|unavailable/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible()
  })

  test('responsive mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const grid = page.locator('[data-testid="beach-grid"]')
    const style = await grid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    )

    // Single column on mobile
    expect(style.split(' ').filter(s => s).length).toBe(1)
  })

  test('responsive tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')

    const grid = page.locator('[data-testid="beach-grid"]')
    const style = await grid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    )

    // Two columns on tablet
    expect(style.split(' ').filter(s => s).length).toBe(2)
  })

  test('responsive desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    const grid = page.locator('[data-testid="beach-grid"]')
    const style = await grid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    )

    // Three columns on desktop
    expect(style.split(' ').filter(s => s).length).toBe(3)
  })
})
```

#### beach-detail.spec.ts (15 tests)
```typescript
import { test, expect } from '@playwright/test'

test.describe('Beach Detail', () => {
  test.describe('Weather', () => {
    test('displays 24-hour weather forecast', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const hourlyEntries = page.locator('[data-testid="hourly-entry"]')
      await expect(hourlyEntries).toHaveCount(24)
    })

    test('displays temperature with one decimal', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const temp = page.locator('[data-testid="weather-widget"]').getByText(/\d+\.\d°C/)
      await expect(temp).toBeVisible()
    })

    test('displays weather icons', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const icon = page.locator('[data-testid^="weather-icon-"]')
      await expect(icon).toBeVisible()
    })

    test('shows cached data indicator', async ({ page }) => {
      // Mock cached response
      await page.route('**/api/weather/*', route => {
        route.fulfill({
          body: JSON.stringify({
            success: true,
            data: { current: { temperature: 15 }, hourly: [] },
            cached: true,
            cachedAt: new Date().toISOString()
          })
        })
      })

      await page.goto('/beach/english-bay')

      await expect(page.getByText(/Last updated/i)).toBeVisible()
    })
  })

  test.describe('Tides', () => {
    test('displays 3 high and 3 low tides', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const highTides = page.locator('[data-testid="tide-chart"]').getByText(/High/i)
      const lowTides = page.locator('[data-testid="tide-chart"]').getByText(/Low/i)

      await expect(highTides).toHaveCount(3)
      await expect(lowTides).toHaveCount(3)
    })

    test('tide times in 12-hour format', async ({ page }) => {
      await page.goto('/beach/english-bay')

      // Should see AM or PM
      const tideTime = page.locator('[data-testid="tide-chart"]').getByText(/\d{1,2}:\d{2}\s*(AM|PM)/i)
      await expect(tideTime.first()).toBeVisible()
    })

    test('tide heights with two decimals', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const height = page.locator('[data-testid="tide-chart"]').getByText(/\d+\.\d{2}\s*m/i)
      await expect(height.first()).toBeVisible()
    })

    test('serves cached data when rate limited', async ({ page }) => {
      await page.route('**/api/tides/*', route => {
        route.fulfill({
          body: JSON.stringify({
            success: true,
            data: { predictions: [] },
            cached: true,
            cachedAt: new Date(Date.now() - 3600000).toISOString()
          })
        })
      })

      await page.goto('/beach/english-bay')

      await expect(page.getByText(/Last updated/i)).toBeVisible()
    })

    test('shows tide not applicable for Trout Lake', async ({ page }) => {
      await page.goto('/beach/trout-lake')

      await expect(page.getByText(/not applicable/i)).toBeVisible()
    })
  })

  test.describe('Water Quality', () => {
    test('displays water quality status badge', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const badge = page.locator('[data-testid="water-quality-badge"]')
      await expect(badge).toBeVisible()
    })

    test('shows advisory reason', async ({ page }) => {
      await page.route('**/api/water-quality/*', route => {
        route.fulfill({
          body: JSON.stringify({
            success: true,
            data: {
              level: 'advisory',
              advisoryReason: 'E.coli levels elevated'
            }
          })
        })
      })

      await page.goto('/beach/english-bay')

      await expect(page.getByText(/E\.coli levels/i)).toBeVisible()
    })

    test('displays last sample date', async ({ page }) => {
      await page.goto('/beach/english-bay')

      await expect(page.getByText(/sampled|sample date/i)).toBeVisible()
    })

    test('shows off-season message', async ({ page }) => {
      await page.route('**/api/water-quality/*', route => {
        route.fulfill({
          body: JSON.stringify({
            success: true,
            data: { level: 'off-season' }
          })
        })
      })

      await page.goto('/beach/english-bay')

      await expect(page.getByText(/resumes in May/i)).toBeVisible()
    })
  })

  test.describe('Webcam', () => {
    test('embeds live webcam', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const iframe = page.locator('[data-testid="webcam-iframe"]')
      await expect(iframe).toBeVisible()
    })

    test('shows placeholder when webcam unavailable', async ({ page }) => {
      await page.goto('/beach/locarno-beach')

      await expect(page.getByText(/Webcam unavailable/i)).toBeVisible()
    })
  })
})
```

#### caching-performance.spec.ts (6 tests)
```typescript
import { test, expect } from '@playwright/test'

test.describe('Caching and Performance', () => {
  test('serves cached data on subsequent requests', async ({ page }) => {
    // First request
    await page.goto('/beach/english-bay')
    await page.waitForLoadState('networkidle')

    // Second request should be faster (cached)
    const start = Date.now()
    await page.reload()
    await page.waitForLoadState('networkidle')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(1000) // < 1 second
  })

  test('displays last updated timestamp', async ({ page }) => {
    await page.goto('/beach/english-bay')

    // At least one component should show last updated
    const hasTimestamp = await page.getByText(/Last updated|cached/i).isVisible()
    expect(hasTimestamp).toBe(true)
  })

  test('shows error when cache empty and API unavailable', async ({ page }) => {
    // Mock all APIs to fail
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'API unavailable' }
        })
      })
    })

    await page.goto('/beach/english-bay')

    await expect(page.getByText(/error|unavailable/i)).toBeVisible()
  })

  test('dashboard loads within 3 seconds', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForSelector('[data-testid="beach-card"]')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(3000)
  })

  test('data refresh within 1 second', async ({ page }) => {
    await page.goto('/beach/english-bay')
    await page.waitForLoadState('networkidle')

    // Find and click refresh button (if exists) or reload
    const start = Date.now()
    await page.reload()
    await page.waitForSelector('[data-testid="weather-widget"]')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(1000)
  })

  test('critical user paths work end-to-end', async ({ page }) => {
    // Path 1: Visit dashboard
    await page.goto('/')
    await expect(page.locator('[data-testid="beach-card"]').first()).toBeVisible()

    // Path 2: Click beach to view detail
    await page.locator('[data-testid="beach-card"]').first().click()
    await expect(page.locator('[data-testid="weather-widget"]')).toBeVisible()

    // Path 3: Navigate back to dashboard
    await page.locator('text=Dashboard').click()
    await expect(page.locator('[data-testid="beach-card"]')).toHaveCount(9)
  })
})
```

### 3. Refactor Phase
- [ ] Verify all 27 E2E tests pass
- [ ] Add any missing edge case tests
- [ ] Ensure tests are stable and not flaky
- [ ] Confirm tests handle API mocking correctly

## Completion Criteria

- [ ] All E2E test skeletons converted to passing tests
- [ ] dashboard.spec.ts: 6 tests passing
- [ ] beach-detail.spec.ts: 15 tests passing
- [ ] caching-performance.spec.ts: 6 tests passing
- [ ] Total: 27/27 E2E tests passing
- [ ] Tests cover all critical user paths
- [ ] Tests handle API failure scenarios
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- Test Strategy: E2E tests cover dashboard, beach detail, caching/performance
- Critical Paths: User visits dashboard, clicks beach, sees data, navigates back
- E2E Traceability: See work plan for full test-to-AC mapping

## Notes

- Impact scope: Final verification of all user-facing functionality
- Constraints: Tests must be stable (not flaky)
- Use Playwright for E2E testing
- Mock API responses for edge cases and failure scenarios
