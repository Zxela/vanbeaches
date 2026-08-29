import { type Page, expect, test } from '@playwright/test';

const beachSummaries = [
  ['english-bay', 'English Bay', 22, 'sunny', 'high'],
  ['jericho-beach', 'Jericho Beach', 18, 'cloudy', 'low'],
  ['kitsilano-beach', 'Kitsilano Beach', 20, 'sunny', 'high'],
  ['locarno-beach', 'Locarno Beach', 17, 'cloudy', 'low'],
  ['second-beach', 'Second Beach', 19, 'sunny', 'high'],
  ['spanish-banks', 'Spanish Banks', 16, 'rainy', 'low'],
  ['sunset-beach', 'Sunset Beach', 21, 'sunny', 'high'],
  ['third-beach', 'Third Beach', 18, 'cloudy', 'low'],
  ['trout-lake', 'Trout Lake', 23, 'sunny', null],
].map(([id, name, temperature, condition, tideType]) => ({
  id,
  name,
  currentWeather: { temperature, condition, icon: condition },
  nextTide: tideType
    ? {
        type: tideType,
        time: '2026-08-29T18:30:00.000Z',
        height: tideType === 'high' ? 3.2 : 1.1,
      }
    : null,
  waterQuality: 'good',
  lastUpdated: '2026-08-29T17:00:00.000Z',
}));

async function mockBeachSummaries(page: Page) {
  await page.route('**/api/beaches', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: beachSummaries }),
    }),
  );
}

test.describe('Discover beaches', () => {
  test.beforeEach(async ({ page }) => {
    await mockBeachSummaries(page);
    await page.goto('/discover');
  });

  test('shows every beach as a live condition card', async ({ page }) => {
    const list = page.getByTestId('discovery-beach-list');
    await expect(list).toBeVisible();

    const cards = list.locator('a[href^="/beach/"]');
    await expect(cards).toHaveCount(9);
    await expect(cards.first()).toContainText('English Bay');
    await expect(cards.first()).toContainText('22°');
    await expect(cards.first()).toContainText(/sunny/i);
  });

  test('search narrows the list and clearing restores it', async ({ page }) => {
    const list = page.getByTestId('discovery-beach-list');
    const search = page.getByRole('searchbox', { name: 'Search beaches' });

    await search.fill('Kits');
    await expect(list.locator('a[href^="/beach/"]')).toHaveCount(1);
    await expect(list.getByRole('link')).toContainText('Kitsilano Beach');

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(list.locator('a[href^="/beach/"]')).toHaveCount(9);
  });

  test('search exposes a useful empty state', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Search beaches' }).fill('not a beach');
    await expect(page.getByTestId('discovery-beach-list').getByRole('link')).toHaveCount(0);
    await expect(page.getByText('No beaches found')).toBeVisible();
  });

  test('favorite beaches are placed first', async ({ page }) => {
    await page.evaluate(() =>
      localStorage.setItem('favoriteBeaches', JSON.stringify(['kitsilano-beach'])),
    );
    await page.reload();

    const cards = page.getByTestId('discovery-beach-list').locator('a[href^="/beach/"]');
    await expect(cards.first()).toHaveAttribute('href', '/beach/kitsilano-beach');
    await expect(cards.first().getByLabel('Favorite')).toBeVisible();
  });

  test('switches between list and map without losing the discovery page', async ({ page }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByTestId('discovery-beach-list')).toBeHidden();

    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByTestId('discovery-beach-list')).toBeVisible();
  });

  test('a condition card opens its beach detail page', async ({ page }) => {
    await page.getByTestId('discovery-beach-list').locator('a[href="/beach/english-bay"]').click();
    await expect(page).toHaveURL(/\/beach\/english-bay$/);
  });

  test('remains usable at a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await expect(page.getByRole('searchbox', { name: 'Search beaches' })).toBeVisible();
    await expect(page.getByTestId('discovery-beach-list')).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test('Discover presents a retry action when summaries fail', async ({ page }) => {
  await page.route('**/api/beaches', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Service unavailable' }),
    }),
  );
  await page.goto('/discover');

  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});
