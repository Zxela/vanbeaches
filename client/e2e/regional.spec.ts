import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
const environment = JSON.parse(
  readFileSync(new URL('./fixtures/environment.json', import.meta.url), 'utf8'),
);

const path = 'public/coast-assets/manifest.json';
const manifest = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;

test('shared DEM terrain loads, changes viewpoint and follows weather and sun', async ({
  page,
}, testInfo) => {
  test.skip(!manifest?.regional, 'Run the regional terrain pipeline first');
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.clock.setFixedTime(new Date('2026-09-18T20:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/environment/*', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          ...environment,
          beachId: new URL(route.request().url()).pathname.split('/').at(-1),
        },
      },
    }),
  );
  await page.goto('/coast?beach=spanish-banks&profile');
  await page.getByRole('button', { name: 'Beach level', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.regionalTiles ?? 0), {
      timeout: 30000,
    })
    .toBeGreaterThan(0);
  const positions: number[][] = [];
  for (const id of [
    'spanish-banks',
    'kitsilano-beach',
    'english-bay',
    'jericho-beach',
    'sunset-beach',
    'second-beach',
    'third-beach',
  ]) {
    await page.getByLabel('Fly to beach', { exact: true }).selectOption(id);
    await page.getByRole('button', { name: 'Beach level', exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.__coastProfile?.()?.position[1]))
      .toBeLessThan(30);
    await page.waitForTimeout(1000);
    const snapshot = await page.evaluate(() => window.__coastProfile?.());
    expect(snapshot?.regionalTriangles).toBeGreaterThan(0);
    expect(snapshot?.failedTiles).toBe(0);
    positions.push(snapshot?.position ?? []);
    await page.screenshot({ path: testInfo.outputPath(`${id}.png`) });
  }
  expect(new Set(positions.map((p) => JSON.stringify(p))).size).toBe(7);
  await page.getByText(/Performance ·/).click();
  await page.getByLabel('Terrain debug', { exact: true }).selectOption('horizon');
  await page.getByLabel('Terrain viewpoint', { exact: true }).selectOption('wreck-beach');
  await page.getByRole('button', { name: 'Inspect terrain viewpoint' }).click();
  // The horizon asset is fetched and decoded on first use; wait for the requested
  // camera pose instead of racing cold loading on software WebGL.
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.position[0]), {
      timeout: 45000,
      message: 'Wreck Beach terrain viewpoint should finish loading and move the camera',
    })
    .toBeLessThan(-4000);
  const wreck = await page.evaluate(() => window.__coastProfile?.());
  expect(wreck?.position[0]).toBeLessThan(-4000);
  await page.screenshot({ path: testInfo.outputPath('wreck-beach-horizon.png') });
  expect(wreck?.mountains.earthRadius).toBe(6371008.8);
  await page.getByLabel('Visual snow line', { exact: true }).fill('750');
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.mountains.snowLine))
    .toBe(750);
  expect(errors).toEqual([]);
});
