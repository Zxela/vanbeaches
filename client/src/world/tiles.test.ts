import { expect, it } from 'vitest';
import { chooseDetail } from './tiles';
import type { Tile } from './types';

const tiles: Tile[] = Array.from({ length: 20 }, (_, index) =>
  [0, 1, 2].map(
    (lod) =>
      ({
        id: `tile-${index}`,
        lod,
        bounds: { min: [index * 50, 0, 0], max: [index * 50 + 50, 10, 50] },
        worldTransform: [0, 0, 0],
        assetUrl: 'tile.glb',
        bytes: 100,
        triangles: 10,
        sha256: '',
      }) as Tile,
  ),
).flat();
it('loads no detail at overview and bounds mobile and desktop residency', () => {
  expect(chooseDetail(tiles, [0, 6500, 0], [0, 0, 0], false)).toEqual([]);
  const mobile = chooseDetail(tiles, [0, 100, 0], [0, 0, 0], true);
  expect(mobile.length).toBeLessThanOrEqual(8);
  expect(mobile.every((tile) => tile.lod === 1)).toBe(true);
  const desktop = chooseDetail(tiles, [0, 100, 0], [0, 0, 0], false);
  expect(desktop.length).toBeLessThanOrEqual(12);
  expect(desktop.filter((tile) => tile.lod === 2).length).toBeLessThanOrEqual(4);
  expect(new Set(desktop.map((tile) => tile.id)).size).toBe(desktop.length);
});

it('regional LODs do not consume the coastal detail allowance', () => {
  const mountains = tiles.map((tile) => ({
    ...tile,
    id: `regional-${tile.id}`,
    layer: 'regional' as const,
  }));
  const selected = chooseDetail([...tiles, ...mountains], [0, 100, 0], [0, 0, 0], false);
  expect(selected).toEqual(chooseDetail(tiles, [0, 100, 0], [0, 0, 0], false));
});
