import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { EnvironmentData } from '@van-beaches/shared';
import type { WorldManifest } from '../src/world/types';

const assetPath = 'public/coast-assets/manifest.json';
const manifest: WorldManifest | null = existsSync(assetPath)
  ? JSON.parse(readFileSync(assetPath, 'utf8'))
  : null;
const environment: EnvironmentData = JSON.parse(
  readFileSync(new URL('./fixtures/environment.json', import.meta.url), 'utf8'),
);
const beaches = [
  'wreck-beach',
  'spanish-banks',
  'jericho-beach',
  'kitsilano-beach',
  'english-bay',
  'third-beach',
] as const;

// One world per test and one worker for release runs: software WebGL and Blender
// compete for substantial memory. These tests never generate or download source GIS.
test.describe('production world acceptance', () => {
  test.describe.configure({ mode: 'default' });
  test.beforeEach(async ({ page }) => {
    test.skip(!manifest, 'Restore a versioned world bundle before world acceptance');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.setFixedTime(new Date('2026-09-18T20:00:00Z'));
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
  });

  test('canonical six beaches and overview at five tide levels', async ({ page }, testInfo) => {
    test.setTimeout(300000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /shader|webgl/i.test(message.text()))
        errors.push(message.text());
    });
    await page.goto('/coast?profile');
    await page.waitForFunction(() => (window.__coastProfile?.()?.loadedTiles ?? 0) > 0);
    await page.evaluate(() => window.__coastDebug?.setQuality('LOW'));
    if (manifest?.urban)
      await expect
        .poll(() => page.evaluate(() => window.__coastProfile?.()?.urban?.loaded), {
          timeout: 30000,
        })
        .toBe(true);
    const captures = [];
    for (const beach of [...beaches, 'overview']) {
      if (beach === 'overview') {
        await page.getByRole('button', { name: 'Overview', exact: true }).click();
      } else {
        expect(manifest?.beaches.some((destination) => destination.id === beach)).toBe(true);
        await expect(
          page.locator(`select[aria-label="Fly to beach"] option[value="${beach}"]`),
        ).toHaveCount(1);
        await page.getByLabel('Fly to beach', { exact: true }).selectOption(beach);
      }
      await expect
        .poll(() => page.evaluate(() => window.__coastProfile?.()?.cameraState))
        .toBe(beach === 'overview' ? 'overview' : 'beach');
      await expect
        .poll(() => page.evaluate(() => window.__coastProfile?.()?.pendingTiles), {
          timeout: 45000,
        })
        .toBe(0);
      for (const height of [0.5, 1.5, 3, 4.5, 5]) {
        await page.evaluate((value) => window.__coastDebug?.setTide(value), height);
        await expect
          .poll(() => page.evaluate(() => window.__coastProfile?.()?.tide))
          .toBeCloseTo(height + (manifest?.chartDatumOffsetMetres ?? -3), 2);
        const snapshot = await page.evaluate(() => window.__coastProfile?.());
        expect(snapshot?.failedTiles).toBe(0);
        expect(snapshot?.position.every(Number.isFinite)).toBe(true);
        expect(snapshot?.triangles).toBeGreaterThan(0);
        captures.push({ beach, tideCD: height, snapshot });
        const name = `${beach}-tide-${height}.png`;
        if (process.env.COAST_VISUAL_BASELINES === '1') {
          await expect(page.locator('canvas')).toHaveScreenshot(name, {
            animations: 'disabled',
            maxDiffPixelRatio: 0.015,
          });
        } else {
          await testInfo.attach(name, {
            body: await page.locator('canvas').screenshot({
              path: testInfo.outputPath(name),
              style:
                '.coast-heading,.coast-marker,.coast-controls,.coast-footer,.coast-profile,.coast-status { visibility: hidden !important; }',
            }),
            contentType: 'image/png',
          });
        }
      }
    }
    writeFileSync(
      testInfo.outputPath('canonical-world-diagnostics.json'),
      JSON.stringify(captures, null, 2),
    );
    await testInfo.attach('canonical-world-diagnostics', {
      body: JSON.stringify(captures, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
  });

  test('terrain and regional tile outages retain controls and expose retry', async ({ page }) => {
    await page.route('**/coast-assets/*-lod*-*.glb', (route) => route.fulfill({ status: 503 }));
    await page.goto('/coast?profile');
    await expect
      .poll(() => page.evaluate(() => window.__coastProfile?.()?.failedTiles ?? 0), {
        timeout: 15000,
      })
      .toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Retry terrain' })).toBeVisible();
    await expect(page.getByLabel('Fly to beach', { exact: true })).toBeEnabled();
    await page.unroute('**/coast-assets/*-lod*-*.glb');
    await page.getByRole('button', { name: 'Retry terrain' }).click();
    await expect
      .poll(() => page.evaluate(() => window.__coastProfile?.()?.loadedTiles ?? 0), {
        timeout: 30000,
      })
      .toBeGreaterThan(0);
  });

  test('WebGL context loss keeps an accessible beach fallback', async ({ page }) => {
    await page.goto('/coast?profile');
    await expect(page.locator('canvas')).toBeVisible();
    await page.locator('canvas').evaluate((canvas) => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    });
    await expect(page.getByRole('alert')).toContainText('interrupted');
    await expect(page.getByRole('button', { name: 'Reload 3D coast' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Browse beaches', exact: true }).last(),
    ).toBeVisible();
  });

  test('detailed building failure preserves the coarse city silhouette', async ({ page }) => {
    test.skip(!manifest?.urban, 'Export the urban layers first');
    // Exercise a hardware-capable tier on CI without changing the real GPU or
    // weakening the production software-renderer quality guard.
    await page.addInitScript(() => {
      for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Context) continue;
        const getExtension = Context.prototype.getExtension;
        Context.prototype.getExtension = function (name: string) {
          return name === 'WEBGL_debug_renderer_info' ? null : getExtension.call(this, name);
        };
      }
    });
    await page.route(`**/coast-assets/${manifest?.urban?.assetUrl}`, (route) =>
      route.fulfill({ status: 503 }),
    );
    await page.goto('/coast?beach=kitsilano-beach&profile');
    await expect
      .poll(() => page.evaluate(() => window.__coastProfile?.()?.urban?.loaded), { timeout: 30000 })
      .toBe(true);
    await page.evaluate(() => window.__coastDebug?.setQuality('MEDIUM'));
    await expect
      .poll(() => page.evaluate(() => window.__coastProfile?.()?.urban?.failed), { timeout: 30000 })
      .toBeGreaterThan(0);
    const urban = await page.evaluate(() => window.__coastProfile?.()?.urban);
    expect(urban?.buildings).toBeGreaterThan(0);
    expect(urban?.bridges).toBeGreaterThan(0);
    await expect(page.getByLabel('Fly to beach', { exact: true })).toBeEnabled();
  });

  test('a failed ocean shader exposes accessible recovery', async ({ page }) => {
    await page.addInitScript(() => {
      for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Context) continue;
        const shaderSource = Context.prototype.shaderSource;
        Context.prototype.shaderSource = function (shader: WebGLShader, source: string) {
          shaderSource.call(
            this,
            shader,
            source.includes('uniform sampler2D marineMap')
              ? `${source}\nINVALID_WATER_SHADER`
              : source,
          );
        };
      }
    });
    await page.goto('/coast?profile');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload 3D coast' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Browse beaches', exact: true }).last(),
    ).toBeVisible();
  });

  test('slow manifest request shows loading while normal navigation remains available', async ({
    page,
  }) => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/coast-assets/manifest.json', async (route) => {
      await pending;
      await route.continue();
    });
    await page.goto('/coast');
    await expect(page.getByText('Preparing the coast…', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse beaches', exact: true })).toBeVisible();
    release?.();
    await expect(page.locator('canvas')).toBeVisible();
  });
});
