import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const folder = new URL('../../3d/output/regional-review/', import.meta.url);
await mkdir(folder, { recursive: true });
const fixture = JSON.parse(
  await readFile(new URL('../e2e/fixtures/environment.json', import.meta.url)),
);
const browser = await chromium.launch();
const runs = [];
for (const mobile of [false, true]) {
  const context = await browser.newContext(
    mobile
      ? { ...devices['Pixel 5'], reducedMotion: 'reduce' }
      : { viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' },
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  let visibility = 80000;
  let cloudCover = 10;
  let rain = 0;
  await page.route('**/api/environment/*', (route) => {
    const data = structuredClone(fixture);
    data.beachId = new URL(route.request().url()).pathname.split('/').at(-1);
    for (const weather of [data.weather.current, ...data.weather.hourly])
      Object.assign(weather, {
        visibility,
        cloudCover,
        rain,
        precipitation: rain,
        condition: rain ? 'rainy' : 'sunny',
      });
    return route.fulfill({ json: { success: true, data } });
  });
  await page.clock.setFixedTime(new Date('2026-09-18T20:00:00Z'));
  const prefix = mobile ? 'mobile' : 'desktop';
  await page.goto('http://127.0.0.1:5173/coast?beach=spanish-banks&profile');
  await page.getByRole('button', { name: 'Beach level', exact: true }).click();
  await page.waitForFunction(() => window.__coastProfile?.()?.regionalTiles > 0, undefined, {
    timeout: 30000,
  });
  const screenshots = [];
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
    await page.waitForTimeout(2500);
    const stats = await page.evaluate(() => window.__coastProfile());
    screenshots.push({ beach: id, ...stats });
    await page.screenshot({ path: fileURLToPath(new URL(`${prefix}-${id}.png`, folder)) });
  }
  await page.getByText(/Performance ·/).click();
  await page.getByLabel('Terrain debug', { exact: true }).selectOption('horizon');
  await page.getByLabel('Terrain viewpoint', { exact: true }).selectOption('wreck-beach');
  await page.getByRole('button', { name: 'Inspect terrain viewpoint' }).click();
  await page.waitForTimeout(3000);
  screenshots.push({
    beach: 'wreck-beach',
    ...(await page.evaluate(() => window.__coastProfile())),
  });
  await page.getByLabel('Terrain debug', { exact: true }).selectOption('off');
  await page.getByText(/Performance ·/).click();
  await page.screenshot({ path: fileURLToPath(new URL(`${prefix}-wreck-beach.png`, folder)) });
  const environments = [];
  for (const [name, time, vis, cloud, wet] of [
    ['rain', '2026-09-18T20:00:00Z', 2500, 100, 4],
    ['morning', '2026-09-18T15:00:00Z', 80000, 10, 0],
    ['sunset', '2026-09-19T01:45:00Z', 80000, 10, 0],
    ['night', '2026-09-19T07:00:00Z', 80000, 10, 0],
  ]) {
    visibility = vis;
    cloudCover = cloud;
    rain = wet;
    await page.clock.setFixedTime(new Date(time));
    await page.goto('http://127.0.0.1:5173/coast?beach=spanish-banks&profile');
    await page.getByRole('button', { name: 'Beach level', exact: true }).click();
    await page.waitForFunction(() => window.__coastProfile?.()?.regionalTiles > 0);
    await page.waitForTimeout(2500);
    environments.push({ name, ...(await page.evaluate(() => window.__coastProfile())) });
    await page.screenshot({ path: fileURLToPath(new URL(`${prefix}-${name}.png`, folder)) });
  }
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  runs.push({ mobile, gpu, errors, screenshots, environments });
  await context.close();
}
await browser.close();
const report = { capturedAt: new Date().toISOString(), physicalMobileTested: false, runs };
await writeFile(new URL('profile.json', folder), JSON.stringify(report, null, 2));
await writeFile(
  new URL('../../3d/data/metadata/latest-regional-profile.json', import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    runs.map((r) => ({
      mobile: r.mobile,
      gpu: r.gpu,
      errors: r.errors,
      views: r.screenshots.map((s) => ({
        beach: s.beach,
        fps: s.fps,
        triangles: s.regionalTriangles,
        tiles: s.regionalTiles,
        bytes: s.regionalDownloadedBytes,
      })),
      weather: r.environments.map((s) => ({
        name: s.name,
        light: s.visual.sunlight,
        haze: s.visual.haze,
      })),
    })),
    null,
    2,
  ),
);
if (
  runs.some((r) => r.errors.length || r.screenshots.some((s) => !s.regionalTiles || s.failedTiles))
)
  process.exitCode = 1;
