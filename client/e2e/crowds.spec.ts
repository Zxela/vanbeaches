import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { EnvironmentData } from '@van-beaches/shared';

function fixture(beachId: string, time: string, rain: boolean): EnvironmentData {
  const timestamp = Date.parse(time);
  const weather = {
    time,
    temperature: rain ? 12 : 28,
    condition: rain ? ('rainy' as const) : ('sunny' as const),
    cloudCover: rain ? 100 : 5,
    precipitation: rain ? 3 : 0,
    rain: rain ? 3 : 0,
    windSpeed: 8,
    windDirection: 270,
    visibility: null,
  };
  return {
    version: 1,
    beachId,
    latitude: 49.28,
    longitude: -123.15,
    tide: {
      stationId: '5cebf1de3d0f4a073c4bb943',
      stationCode: '07735',
      predictionsFetchedAt: time,
      observationsFetchedAt: time,
      observations: [],
      extremes: [],
      predictions: Array.from({ length: 217 }, (_, i) => ({
        time: new Date(timestamp + (i - 24) * 15 * 60000).toISOString(),
        heightCD: 2,
      })),
    },
    weather: {
      current: weather,
      fetchedAt: time,
      hourly: Array.from({ length: 55 }, (_, i) => ({
        ...weather,
        time: new Date(timestamp + (i - 6) * 3600000).toISOString(),
      })),
    },
  };
}

test('estimated crowds distinguish hot Kits, rainy Spanish Banks and sunset English Bay', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync('public/coast-assets/manifest.json'), 'Export the real coast first');
  test.setTimeout(240000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|webgl/i.test(m.text())) errors.push(m.text());
  });
  let time = '2026-07-04T22:00:00Z';
  let rain = false;
  await page.route('**/api/environment/*', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: fixture(route.request().url().split('/').at(-1) ?? '', time, rain),
      },
    }),
  );
  const scenarios = [
    { id: 'kitsilano-beach', time, rain: false, category: 'Very busy' },
    { id: 'spanish-banks', time: '2026-07-07T16:00:00Z', rain: true, category: 'Quiet' },
    { id: 'english-bay', time: '2026-07-08T03:45:00Z', rain: false, category: 'Busy' },
  ];
  const counts: number[] = [];
  for (const scenario of scenarios) {
    time = scenario.time;
    rain = scenario.rain;
    await page.clock.setFixedTime(new Date(time));
    await page.goto(`/coast?beach=${scenario.id}&profile`);
    await expect(
      page.getByText(`Estimated activity: ${scenario.category}`, { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    // Detail terrain follows the coarse regional queue. Keep crowd and terrain
    // readiness explicit so a cold-load timeout identifies the unfinished work.
    await expect
      .poll(
        () =>
          page.evaluate((id) => {
            const snapshot = window.__coastProfile?.();
            const beach = snapshot?.crowds.beaches.find((b) => b.id === id);
            return {
              hasAgents: (beach?.agents ?? 0) > 0,
              reachedTarget: !!beach && beach.agents >= beach.target,
              hasDetail: (snapshot?.detailTiles ?? 0) > 0,
              agents: beach?.agents,
              target: beach?.target,
              maskStatus: snapshot?.crowds.maskStatus,
              quality: snapshot?.quality,
              loadedTiles: snapshot?.loadedTiles,
              detailTiles: snapshot?.detailTiles,
              pendingTiles: snapshot?.pendingTiles,
              failedTiles: snapshot?.failedTiles,
            };
          }, scenario.id),
        { timeout: 60000, message: `${scenario.id} crowd and coastal detail should become ready` },
      )
      .toMatchObject({ hasAgents: true, reachedTarget: true, hasDetail: true });
    const snapshot = await page.evaluate(() => window.__coastProfile?.());
    const population = snapshot?.crowds.beaches.find((b) => b.id === scenario.id);
    expect(population?.state.confidence).toBe('low');
    expect(snapshot?.crowds.activeAgents).toBeLessThanOrEqual(
      snapshot?.detail === 'mobile' ? 120 : 360,
    );
    expect(population?.maskCells).toBeGreaterThan(0);
    counts.push(population?.agents ?? 0);
    if (scenario.rain) {
      expect(population?.activities.swim).toBe(0);
      expect(population?.activities.wade).toBe(0);
    }
    if (scenario.id === 'kitsilano-beach')
      expect(population?.activities.volleyball).toBeGreaterThan(0);
    await page.locator('.coast-crowd summary').click();
    await expect(
      page.getByText(/do not represent tracked visitors or a live headcount/),
    ).toBeVisible();
    await page.locator('.coast-crowd summary').click();
    await page.screenshot({ path: testInfo.outputPath(`${scenario.id}.png`) });
    await testInfo.attach(scenario.id, {
      body: JSON.stringify(snapshot, null, 2),
      contentType: 'application/json',
    });
    if (scenario.id === 'kitsilano-beach') {
      await page.getByRole('button', { name: 'Beach level', exact: true }).click();
      await expect
        .poll(() => page.evaluate(() => window.__coastProfile?.()?.position[1]))
        .toBeLessThan(30);
      await page.screenshot({ path: testInfo.outputPath('kits-close.png') });
      const night = Date.parse('2026-07-05T08:00:00Z');
      await page.getByLabel('Coastal timeline', { exact: true }).evaluate((element, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(element, String(value));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, night);
      await expect(page.getByText('Estimated activity: Quiet', { exact: true })).toBeVisible();
      await page.waitForFunction(
        () =>
          (window.__coastProfile?.()?.crowds.beaches.find((b) => b.id === 'kitsilano-beach')
            ?.target ?? 360) < 10,
      );
      const transition = await page.evaluate(() =>
        window.__coastProfile?.()?.crowds.beaches.find((b) => b.id === 'kitsilano-beach'),
      );
      // Existing people remain while their opacity ramps down, even with reduced motion.
      expect(transition?.agents).toBeGreaterThan(transition?.target ?? 360);
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                window.__coastProfile?.()?.crowds.beaches.find((b) => b.id === 'kitsilano-beach')
                  ?.agents,
            ),
          { timeout: 15000 },
        )
        .toBeLessThan(10);
    }
  }
  expect(counts[0]).toBeGreaterThan(counts[2]);
  expect(counts[2]).toBeGreaterThan(counts[1] * 3);
  // Switching to overview keeps the pool alive while the density fades out.
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__coastProfile?.()?.crowds.activeAgents), {
      timeout: 20000,
    })
    .toBe(0);
  expect(errors).toEqual([]);
});
