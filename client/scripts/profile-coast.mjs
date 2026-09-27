import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const output = new URL('../../3d/output/web-profile/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: process.env.COAST_GPU_ANGLE ? [`--use-angle=${process.env.COAST_GPU_ANGLE}`] : [],
});
const results = [];
for (const mobile of [false, true]) {
  const context = await browser.newContext(
    mobile ? { ...devices['Pixel 5'] } : { viewport: { width: 1440, height: 960 } },
  );
  const page = await context.newPage();
  await page.addInitScript(() => performance.setResourceTimingBufferSize(3000));
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text().slice(0, 2000));
  });
  page.on('request', (request) => {
    if (request.url().includes('.glb')) requests.push(request.url());
  });
  await page.goto(`${process.env.COAST_URL || 'http://127.0.0.1:5173'}/coast?profile`, {
    waitUntil: 'networkidle',
  });
  await page.waitForFunction(() => window.__coastProfile?.()?.loadedTiles > 30, undefined, {
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  const overview = await page.evaluate(() => window.__coastProfile());
  const initialDetailRequests = requests.filter((url) => /-lod[12]-/.test(url)).length;
  await page.screenshot({
    path: fileURLToPath(new URL(`${mobile ? 'mobile' : 'desktop'}-overview.png`, output)),
  });
  await page.getByLabel('Fly to beach', { exact: true }).selectOption('spanish-banks');
  await page.waitForTimeout(9000);
  const beach = await page.evaluate(() => window.__coastProfile());
  await page.getByRole('button', { name: 'Depth', exact: true }).click();
  await page.getByRole('button', { name: /^Next low/ }).click();
  await page.waitForTimeout(5000);
  const low = await page.evaluate(() => window.__coastProfile());
  await page.screenshot({
    path: fileURLToPath(new URL(`${mobile ? 'mobile' : 'desktop'}-depth-low.png`, output)),
  });
  await page.getByRole('button', { name: /^Next high/ }).click();
  await page.waitForTimeout(5000);
  const high = await page.evaluate(() => window.__coastProfile());
  await page.screenshot({
    path: fileURLToPath(new URL(`${mobile ? 'mobile' : 'desktop'}-depth-high.png`, output)),
  });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.waitForTimeout(7500);
  const returned = await page.evaluate(() => window.__coastProfile());
  const network = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.includes('/coast-assets/'))
      .map((entry) => ({
        url: new URL(entry.name).pathname,
        bytes: entry.transferSize,
        durationMs: entry.duration,
      })),
  );
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  results.push({
    mobile,
    gpu,
    overview,
    initialDetailRequests,
    beach,
    low,
    high,
    returned,
    errors,
    network,
  });
  await context.close();
}
await browser.close();
await writeFile(new URL('profile.json', output), JSON.stringify(results, null, 2));
await writeFile(
  new URL('../../3d/data/metadata/latest-web-profile.json', import.meta.url),
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      node: process.version,
      browser: browser.version(),
      url: process.env.COAST_URL || 'http://127.0.0.1:5173',
      physicalMobileTested: false,
      gpuBytesAreEstimates: true,
      runs: results.map(({ network, ...run }) => ({
        ...run,
        assetRequests: network.length,
        transferredAssetBytes: network.reduce((sum, request) => sum + request.bytes, 0),
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(JSON.stringify(results, null, 2));
if (
  results.some(
    (run) =>
      run.errors.length ||
      run.initialDetailRequests ||
      Math.abs(run.low.tide - run.low.targetTide) > 0.05 ||
      Math.abs(run.high.tide - run.high.targetTide) > 0.05 ||
      run.high.tide <= run.low.tide,
  )
)
  process.exitCode = 1;
