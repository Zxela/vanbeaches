import type { Point, WorldManifest } from './types';

export const manifestUrl = import.meta.env.VITE_COAST_MANIFEST_URL || '/coast-assets/manifest.json';
const point = (value: unknown): value is Point =>
  Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

export function validateManifest(data: WorldManifest): WorldManifest {
  if (
    data.version !== 1 ||
    data.units !== 'metres' ||
    data.axes !== 'X east, Y up, Z south' ||
    !data.origin ||
    data.origin.crs !== 'EPSG:3157' ||
    !point(data.origin.utm) ||
    !Number.isFinite(data.chartDatumOffsetMetres) ||
    !point(data.overview?.position) ||
    !point(data.overview?.target) ||
    !point(data.bounds?.min) ||
    !point(data.bounds?.max) ||
    !Array.isArray(data.tiles) ||
    !data.tiles.length ||
    !Array.isArray(data.beaches) ||
    !data.water ||
    !Number.isFinite(data.water.initial_tide_cd_m) ||
    !data.depthTexture ||
    typeof data.depthTexture.assetUrl !== 'string' ||
    !Array.isArray(data.depthTexture.bounds) ||
    data.depthTexture.bounds.length !== 4 ||
    !data.depthTexture.bounds.every(Number.isFinite)
  ) {
    throw new Error('The coastal world manifest is incomplete or incompatible.');
  }
  const keys = new Set<string>();
  for (const asset of [data.marineTexture, data.urban]) {
    if (!asset) continue;
    if (
      typeof asset.assetUrl !== 'string' ||
      !Number.isFinite(asset.bytes) ||
      asset.bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(asset.sha256)
    )
      throw new Error('Invalid world layer metadata.');
    assetUrl(asset.assetUrl);
  }
  if (data.urban?.coarseAssetUrl) assetUrl(data.urban.coarseAssetUrl);
  if (
    data.marineTexture &&
    (data.marineTexture.bounds.length !== 4 || !data.marineTexture.bounds.every(Number.isFinite))
  )
    throw new Error('Invalid marine bounds.');
  if (data.regional) {
    const region = data.regional;
    if (
      !Number.isFinite(region.earthRadiusMetres) ||
      region.earthRadiusMetres < 0 ||
      !Number.isFinite(region.maxDistanceMetres) ||
      region.maxDistanceMetres > 160000 ||
      !region.snow ||
      ![region.snow.lineMetres, region.snow.amount, region.snow.transitionMetres].every(
        Number.isFinite,
      ) ||
      region.snow.amount < 0 ||
      region.snow.amount > 1 ||
      region.snow.transitionMetres <= 0 ||
      typeof region.horizonsUrl !== 'string'
    )
      throw new Error('Invalid regional terrain metadata.');
    assetUrl(region.horizonsUrl);
  }
  for (const tile of data.tiles) {
    const key = `${tile.id}:${tile.lod}`;
    if (
      keys.has(key) ||
      (tile.layer !== undefined && (tile.layer !== 'regional' || !data.regional || tile.lod > 1)) ||
      ![0, 1, 2].includes(tile.lod) ||
      !point(tile.worldTransform) ||
      !point(tile.bounds?.min) ||
      !point(tile.bounds?.max) ||
      typeof tile.assetUrl !== 'string' ||
      !Number.isFinite(tile.bytes) ||
      !Number.isFinite(tile.triangles)
    )
      throw new Error('Invalid coastal tile metadata.');
    keys.add(key);
  }
  for (const tile of data.tiles)
    if (!keys.has(`${tile.id}:0`)) throw new Error('Missing regional terrain.');
  for (const beach of data.beaches)
    if (!point(beach.cameraTarget) || !point(beach.cameraApproach) || !point(beach.worldPosition))
      throw new Error('Invalid beach destination.');
  for (const beach of data.beaches) {
    if (beach.beachView && (!point(beach.beachView.position) || !point(beach.beachView.target)))
      throw new Error('Invalid beach viewpoint.');
  }
  for (const value of [
    data.water.wave_amplitude_m,
    data.water.wave_direction_degrees,
    data.water.wave_speed,
    data.water.wind_strength,
  ])
    if (!Number.isFinite(value)) throw new Error('Invalid water settings.');
  for (const url of [
    ...data.tiles.map((tile) => tile.assetUrl),
    data.depthTexture.assetUrl,
    data.noticesUrl,
  ])
    assetUrl(url);
  return data;
}

export async function loadManifest(signal: AbortSignal) {
  const response = await fetch(manifestUrl, { signal });
  if (!response.ok) throw new Error('The coastal world is temporarily unavailable.');
  return validateManifest(await response.json());
}

export function assetUrl(relative: string) {
  const url = new URL(relative, new URL(manifestUrl, window.location.href));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported asset URL');
  return url.href;
}
