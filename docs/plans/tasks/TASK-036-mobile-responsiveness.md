# Task: TASK-036 Mobile Responsiveness Polish

Metadata:
- Phase: 6 - Optimization
- Dependencies: Phase 5 (All UI components)
- Provides: Mobile layout fixes, touch-friendly tap targets, overflow fixes
- Size: Small (Multiple CSS/component updates)
- Verification Level: L1 (Functional) + L2 (Tests)

## Implementation Content

Audit and fix mobile layout issues, implement touch-friendly tap targets (44px minimum), test on mobile devices or emulators, fix overflow or scrolling issues, and ensure viewport meta tags are correct.

## Target Files

- [ ] `/home/zxela/workspace/client/src/index.css` (global styles)
- [ ] `/home/zxela/workspace/client/index.html` (viewport meta)
- [ ] `/home/zxela/workspace/client/src/components/*.tsx` (component updates)
- [ ] `/home/zxela/workspace/client/e2e/mobile.spec.ts` (mobile tests)

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables: Phase 5 UI components
- [ ] Write failing tests for mobile responsiveness:
  ```typescript
  import { test, expect } from '@playwright/test'

  test.describe('Mobile Responsiveness', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    })

    test('dashboard displays single column on mobile', async ({ page }) => {
      await page.goto('/')

      const grid = page.locator('[data-testid="beach-grid"]')
      const computedStyle = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      )

      // Single column should not have multiple columns
      expect(computedStyle).not.toContain(' ')
    })

    test('no horizontal scroll on mobile', async ({ page }) => {
      await page.goto('/')

      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      )

      expect(hasHorizontalScroll).toBe(false)
    })

    test('tap targets are at least 44px', async ({ page }) => {
      await page.goto('/')

      const links = page.locator('a')
      const count = await links.count()

      for (let i = 0; i < count; i++) {
        const link = links.nth(i)
        const box = await link.boundingBox()

        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
          // Width can be larger for full-width elements
        }
      }
    })

    test('weather widget readable on mobile', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const weatherWidget = page.locator('[data-testid="weather-widget"]')
      await expect(weatherWidget).toBeVisible()

      const box = await weatherWidget.boundingBox()
      expect(box?.width).toBeLessThanOrEqual(375) // Fits in viewport
    })

    test('tide chart scrollable on mobile', async ({ page }) => {
      await page.goto('/beach/english-bay')

      const tideChart = page.locator('[data-testid="tide-chart"]')
      await expect(tideChart).toBeVisible()

      // Should be contained within viewport or have horizontal scroll
      const isContained = await tideChart.evaluate(el =>
        el.scrollWidth <= el.clientWidth ||
        el.style.overflowX === 'auto' ||
        el.style.overflowX === 'scroll'
      )

      expect(isContained).toBe(true)
    })

    test('navigation accessible on mobile', async ({ page }) => {
      await page.goto('/')

      const nav = page.locator('[data-testid="navigation"]')
      await expect(nav).toBeVisible()

      const homeLink = nav.locator('a')
      await expect(homeLink).toBeVisible()

      // Should be tappable
      await homeLink.tap()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Tablet Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    })

    test('dashboard displays 2 columns on tablet', async ({ page }) => {
      await page.goto('/')

      const grid = page.locator('[data-testid="beach-grid"]')
      const computedStyle = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      )

      // Should have 2 columns
      const columns = computedStyle.split(' ').filter(v => v !== '')
      expect(columns.length).toBe(2)
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Verify viewport meta tag:
  ```html
  <!-- index.html -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  ```
- [ ] Update global styles for touch targets:
  ```css
  /* index.css */
  @layer base {
    a, button {
      @apply min-h-[44px] min-w-[44px] flex items-center;
    }

    /* Prevent text from causing overflow */
    .truncate-mobile {
      @apply truncate max-w-full;
    }

    /* Ensure images don't overflow */
    img {
      @apply max-w-full h-auto;
    }
  }
  ```
- [ ] Fix component overflow issues:
  ```typescript
  // Update components to handle overflow
  <div className="overflow-x-auto">
    {/* Horizontal scrollable content */}
  </div>
  ```
- [ ] Update BeachCard for touch:
  ```typescript
  // BeachCard.tsx
  <Link
    to={`/beach/${id}`}
    className="block bg-white rounded-lg shadow p-4 min-h-[88px] active:bg-gray-50"
  >
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify all features usable on 320px viewport
- [ ] Verify touch targets meet 44px minimum
- [ ] Verify no horizontal scroll on mobile
- [ ] Test on actual mobile device or emulator
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] All features usable on 320px viewport
- [ ] Touch targets meet accessibility guidelines (44px min)
- [ ] No horizontal scroll on mobile
- [ ] Components handle overflow gracefully
- [ ] Viewport meta tags correct
- [ ] Mobile E2E tests pass
- [ ] Verification: L1 (Functional) + L2 (Tests)

## AC References from Design Doc

- AC: "Mobile-responsive layout with touch-friendly navigation"
- AC: "Support viewport widths 320px to 2560px"
- Property: `responsive.breakpoints.includes(['mobile', 'tablet', 'desktop'])`

## Notes

- Impact scope: All UI components
- Constraints: 44px minimum for touch targets (WCAG guideline)
- Common issues: overflow, small text, tiny tap targets
- Test on multiple viewport sizes
