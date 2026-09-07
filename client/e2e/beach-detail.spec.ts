import { type Page, expect, test } from '@playwright/test';

async function mockConditions(page: Page, condition = 'sunny') {
  const now = Date.now();
  const time = (hours: number) => new Date(now + hours * 3600000).toISOString();
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    const data = url.includes('/weather/')
      ? {
          beachId: 'english-bay',
          fetchedAt: time(0),
          current: {
            temperature: 22,
            apparentTemperature: 23,
            condition,
            humidity: 65,
            windSpeed: 8,
            windDirection: 'NW',
            uvIndex: 4,
            visibility: 12000,
          },
          hourly: Array.from({ length: 24 }, (_, i) => ({
            time: time(i),
            temperature: 22 - i / 5,
            condition,
            precipitationProbability: 10,
          })),
          daily: Array.from({ length: 5 }, (_, i) => ({
            date: time(i * 24).slice(0, 10),
            high: 24,
            low: 16,
            condition,
          })),
        }
      : url.includes('/tides/')
        ? {
            beachId: 'english-bay',
            stationId: 'test',
            stationName: 'Vancouver',
            fetchedAt: time(0),
            predictions: Array.from({ length: 8 }, (_, i) => ({
              time: time(i * 6),
              height: i % 2 ? 1.1 : 3.2,
              type: i % 2 ? 'low' : 'high',
            })),
          }
        : {
            beachId: 'english-bay',
            level: 'advisory',
            advisoryReason: 'Elevated bacteria in latest sample',
            lastSampleDate: time(0),
            fetchedAt: time(0),
          };
    return route.fulfill({ json: { success: true, data } });
  });
}

test('shows weather, tides, and water quality in decision order', async ({ page }) => {
  await mockConditions(page);
  await page.goto('/beach/english-bay');
  await expect(page.getByTestId('beach-hero')).toContainText('22°');
  await expect(page.getByTestId('beach-hero')).toContainText('Sunny');
  await expect(page.getByRole('heading', { name: 'Hourly Forecast' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '5-Day Forecast' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tides', exact: true })).toBeVisible();
  await expect(page.getByTestId('water-quality-label')).toContainText('Advisory');
  await expect(page.getByText('Elevated bacteria in latest sample')).toBeVisible();
  const headings = await page.locator('h2').allTextContents();
  expect(headings.indexOf('Hourly Forecast')).toBeLessThan(headings.indexOf('5-Day Forecast'));
  expect(headings.slice(0, 3)).toEqual(["Today's Verdict", 'Conditions', 'Hourly Forecast']);
  // No configured beaches currently have a verified webcam source.
  await expect(page.getByRole('heading', { name: 'Webcam', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Community' })).toHaveCount(0);
});

for (const width of [320, 375]) {
  test(`header and long beach name fit at ${width}px`, async ({ page }) => {
    await mockConditions(page);
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/beach/kitsilano-beach');
    const favorite = page.getByRole('button', { name: /add kitsilano beach to favorites/i });
    const share = page.getByRole('button', { name: 'Share', exact: true });
    await expect(favorite).toBeVisible();
    await expect(share).toBeVisible();
    const f = await favorite.boundingBox();
    const s = await share.boundingBox();
    expect(f && s && f.x + f.width <= s.x).toBeTruthy();
    expect(f?.height).toBeGreaterThanOrEqual(44);
    expect(s?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('heading', { name: 'Kitsilano Beach', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('native beach selector supports keyboard selection and Escape', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile native pickers use OS touch controls.');
  await mockConditions(page);
  await page.goto('/beach/english-bay');
  const selector = page.getByRole('combobox', { name: 'Select beach' });
  await selector.focus();
  await selector.press('ArrowDown');
  await selector.press('Enter');
  await expect(page).not.toHaveURL(/english-bay$/);
  await selector.focus();
  await selector.press('Space');
  await selector.press('Escape');
  await expect(selector).toBeFocused();
  await selector.press('h');
  await expect(page).toHaveURL(/\/beach\//);
});

test('API failures show retry actions and invalid routes offer recovery', async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({ json: { success: false, error: 'Unavailable' } }),
  );
  await page.goto('/beach/english-bay');
  await expect(page.getByText('Current conditions unavailable')).toBeVisible();
  await expect(page.getByText('Tide data unavailable')).toBeVisible();
  await expect(page.getByText('Water quality data unavailable')).toBeVisible();
  await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(3);
  await page.goto('/beach/missing');
  await page.getByRole('main').getByRole('link', { name: 'Browse beaches' }).click();
  await expect(page).toHaveURL(/\/discover$/);
});

for (const theme of ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'foggy']) {
  test(`${theme} theme retains readable text and visible focus`, async ({ page }) => {
    await mockConditions(page, theme);
    await page.goto('/beach/english-bay');
    await expect(page.locator(`.weather-scene.weather-${theme}`)).toBeVisible();
    const link = page.getByRole('link', { name: 'Forecast', exact: true });
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
    // Check the lightest gradient endpoint against the supporting white text.
    const ratio = await page.locator('.weather-scene').evaluate((element) => {
      const hex = getComputedStyle(element).getPropertyValue('--weather-top').trim();
      const base = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
      const luminance = (rgb: number[]) =>
        rgb
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return (luminance(base.map((v) => 0.75 + v * 0.25)) + 0.05) / (luminance(base) + 0.05);
    });
    expect(ratio).toBeGreaterThan(4.5);
  });
}

test('webcam fixture fails explicitly and recovers on retry', async ({ page }) => {
  // Mount the real component through Vite; production beaches have no webcam URLs.
  await page.route('**/webcam-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { WebcamEmbed } = await import('/src/components/WebcamEmbed.tsx');
      await import('/src/index.css');
      createRoot(document.getElementById('root')).render(React.createElement(WebcamEmbed, {
        url: '/fixture-camera.svg', beachName: 'Fixture beach', onHide: () => {}
      }));
    </script></body></html>`,
    }),
  );
  let attempts = 0;
  await page.route('**/fixture-camera.svg', (route) => {
    attempts++;
    return attempts === 1
      ? route.abort()
      : route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#244e70"/></svg>',
        });
  });
  await page.goto('/webcam-fixture');
  await expect(page.getByRole('alert')).toHaveText('Webcam unavailable');
  await expect(page.getByRole('link', { name: 'Open source' })).toHaveAttribute(
    'href',
    '/fixture-camera.svg',
  );
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('img')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(attempts).toBe(2);
});

test('tide card has readable labels on its stable surface', async ({ page }) => {
  await mockConditions(page);
  await page.goto('/beach/english-bay');
  const card = page.getByTestId('tide-card');
  await expect(card).toHaveCSS('background-color', 'rgb(16, 40, 62)');
  await expect(card.getByRole('heading', { name: "Today's Tides" })).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  await expect(card.getByText('Key Tides')).toBeVisible();
  await expect(card.locator('canvas')).toHaveAttribute('aria-label', /tide/i);
});

test('desktop places extended forecast and tides side by side', async ({ page }) => {
  await mockConditions(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/beach/english-bay');
  const forecast = await page.getByRole('heading', { name: '5-Day Forecast' }).boundingBox();
  const tides = await page.getByRole('heading', { name: 'Tides', exact: true }).boundingBox();
  expect(forecast && tides && tides.x > forecast.x + 400).toBeTruthy();
  expect(forecast && tides && Math.abs(tides.y - forecast.y) < 5).toBeTruthy();
  const width = await page
    .locator('#today')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(1000);
});
