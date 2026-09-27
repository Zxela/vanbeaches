import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { EnvironmentData } from '@van-beaches/shared';
import sharp from 'sharp';
import type { WorldManifest } from '../src/world/types';
const environment = JSON.parse(
  readFileSync(new URL('./fixtures/environment.json', import.meta.url), 'utf8'),
) as EnvironmentData;

test('coast has a useful fallback when assets are unavailable', async ({ page }) => {
  await page.route('**/coast-assets/manifest.json', (route) => route.fulfill({ status: 503 }));
  await page.goto('/coast');
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(
    page.getByRole('link', { name: 'Browse beaches', exact: true }).last(),
  ).toBeVisible();
});

test('coast survives unavailable WebGL', async ({ page }) => {
  test.skip(!existsSync('public/coast-assets/manifest.json'), 'Export the real coast first');
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return getContext.apply(this, [type, ...args] as Parameters<typeof getContext>);
    } as typeof getContext;
  });
  await page.goto('/coast');
  await expect(page.getByRole('alert')).toContainText('device could not start');
});

test('streams real tiles, navigates with reduced motion, and disposes detail', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync('public/coast-assets/manifest.json'), 'Export the real coast first');
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|webgl/i.test(message.text()))
      errors.push(message.text());
  });
  page.on('request', (request) => requests.push(request.url()));
  await page.clock.setFixedTime(new Date(environment.weather.fetchedAt ?? 0));
  await page.route('**/api/environment/*', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ...environment, beachId: route.request().url().split('/').at(-1) },
      },
    }),
  );
  await page.goto('/coast?profile');
  await page.waitForFunction(() => (window.__coastProfile?.()?.loadedTiles ?? 0) > 20);
  expect(requests.some((url) => /-lod[12]-/.test(url))).toBe(false);
  expect(requests.some((url) => /\/api\/(weather|tides)/.test(url))).toBe(false);
  await page.getByLabel('Fly to beach', { exact: true }).selectOption('spanish-banks');
  await page.waitForFunction(() => window.__coastProfile?.()?.cameraState === 'beach');
  await page.getByRole('button', { name: 'Depth', exact: true }).click();
  await page.getByRole('button', { name: /^Next high/ }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(
            (window.__coastProfile?.()?.tide ?? 0) - (window.__coastProfile?.()?.targetTide ?? 10),
          ),
        ),
      { timeout: 15000 },
    )
    .toBeLessThan(0.03);
  const high = await page.evaluate(() => window.__coastProfile?.());
  await page.screenshot({ path: testInfo.outputPath('spanish-banks-high.png') });
  const lowTime = Date.parse(environment.tide.extremes[0].time);
  await page.getByLabel('Coastal timeline', { exact: true }).evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, lowTime);
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(
            (window.__coastProfile?.()?.tide ?? 0) - (window.__coastProfile?.()?.targetTide ?? 10),
          ),
        ),
      { timeout: 15000 },
    )
    .toBeLessThan(0.03);
  const low = await page.evaluate(() => window.__coastProfile?.());
  if (!high?.environment || !low?.environment) throw new Error('Missing environment snapshot');
  expect(high.tide - low.tide).toBeGreaterThan(2);
  await page.screenshot({ path: testInfo.outputPath('spanish-banks-low.png') });
  // Independent check against the REAL exported survey atlas, never synthetic geography.
  const manifest = JSON.parse(
    readFileSync('public/coast-assets/manifest.json', 'utf8'),
  ) as WorldManifest;
  const spanish = manifest.beaches.find((beach) => beach.id === 'spanish-banks');
  if (!spanish) throw new Error('Missing Spanish Banks destination');
  const atlas = await sharp(`public/coast-assets/${manifest.depthTexture.assetUrl}`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [west, north, east, south] = manifest.depthTexture.bounds;
  let exposed = 0;
  for (let row = 0; row < atlas.info.height; row++) {
    for (let col = 0; col < atlas.info.width; col++) {
      const x = west + ((col + 0.5) / atlas.info.width) * (east - west);
      const z = north + ((row + 0.5) / atlas.info.height) * (south - north);
      if (Math.hypot(x - spanish.worldPosition[0], z - spanish.worldPosition[2]) > 1200) continue;
      const i = (row * atlas.info.width + col) * 4;
      const bed = (atlas.data[i] * 256 + atlas.data[i + 1]) * 0.01 - 512;
      if (atlas.data[i + 3] && bed > low.tide && bed < high.tide) exposed++;
    }
  }
  const exposedSquareMetres =
    (((exposed * (east - west)) / atlas.info.width) * (south - north)) / atlas.info.height;
  expect(exposedSquareMetres).toBeGreaterThan(50000);
  const reportPath = testInfo.outputPath('shoreline-acceptance.json');
  writeFileSync(reportPath, JSON.stringify({ high, low, exposedSquareMetres }, null, 2));
  await testInfo.attach('shoreline-acceptance', {
    path: reportPath,
    contentType: 'application/json',
  });
  expect(high.environment.sun.elevation).not.toBe(low.environment.sun.elevation);
  expect(low.environment.tide.source).toBe('predicted');
  expect(low.environment.mode).toBe('TIMELINE');
  await page.getByRole('button', { name: 'LIVE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'LIVE', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Beach level', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.position[1]))
    .toBeLessThan(30);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await page.getByLabel('Fly to beach', { exact: true }).selectOption('kitsilano-beach');
  await expect(page.getByRole('link', { name: 'Beach page' })).toHaveAttribute(
    'href',
    '/beach/kitsilano-beach',
  );
  await page.goBack();
  await expect(page.getByLabel('Fly to beach', { exact: true })).toHaveValue('spanish-banks');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.detailTiles), { timeout: 20000 })
    .toBe(0);
  await page.getByRole('link', { name: 'Browse beaches', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('environment outages preserve exploration and use explicit fallbacks', async ({ page }) => {
  test.skip(!existsSync('public/coast-assets/manifest.json'), 'Export the real coast first');
  await page.route('**/api/environment/*', (route) => route.fulfill({ status: 503 }));
  await page.goto('/coast?beach=spanish-banks&profile');
  await page.waitForFunction(() => (window.__coastProfile?.()?.loadedTiles ?? 0) > 20);
  await expect(page.getByText('Neutral weather fallback', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__coastProfile?.()?.environment?.tide.source)).toBe(
    'neutral',
  );
  await page.evaluate(
    (data) => localStorage.setItem('coast-environment:spanish-banks', JSON.stringify(data)),
    environment,
  );
  await page.clock.setFixedTime(
    new Date(Date.parse(environment.weather.fetchedAt ?? '') + 3 * 3600000),
  );
  await page.reload();
  await page.waitForFunction(
    () => window.__coastProfile?.()?.environment?.tide.source === 'predicted',
  );
  expect(await page.evaluate(() => window.__coastProfile?.()?.environment?.tide.stale)).toBe(true);
  await expect(page.getByText(/Offline.*using available data/)).toBeVisible();
});

test('rain and wind are bounded and reduced motion suppresses particles', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync('public/coast-assets/manifest.json'), 'Export the real coast first');
  const current = environment.weather.current;
  if (!current) throw new Error('Missing weather fixture');
  const data = {
    ...environment,
    weather: {
      ...environment.weather,
      current: {
        ...current,
        condition: 'rainy',
        rain: 4,
        precipitation: 4,
        cloudCover: 100,
        windSpeed: 100,
        visibility: 2500,
      },
    },
  };
  await page.clock.setFixedTime(new Date(environment.weather.fetchedAt ?? 0));
  await page.route('**/api/environment/*', (route) =>
    route.fulfill({ json: { success: true, data } }),
  );
  await page.goto('/coast?beach=spanish-banks&profile');
  await page.waitForFunction(() => window.__coastProfile?.()?.atmosphere?.rainVisible);
  const snapshot = await page.evaluate(() => window.__coastProfile?.());
  expect(snapshot?.visual.amplitude).toBe(0.16);
  expect(snapshot?.atmosphere.rainParticles).toBeLessThanOrEqual(700);
  expect(snapshot?.atmosphere.cloudCover).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('rain.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.atmosphere.rainParticles))
    .toBe(0);
});
