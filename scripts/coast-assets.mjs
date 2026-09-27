import { spawnSync } from 'node:child_process';
// Keep large GIS products out of Git. Restore a pinned release bundle for Pages builds.
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const mode = process.argv[2] || 'prepare';
if (!['prepare', 'verify', 'package', 'stamp'].includes(mode))
  throw new Error(`Unknown coast asset operation: ${mode}`);
const folder = path.resolve(root, process.argv[3] || 'client/public/coast-assets');
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );
const hash = (data) => createHash('sha256').update(data).digest('hex');
const checkedPath = (name) => {
  if (typeof name !== 'string' || !name || /[\r\n\0]/.test(name))
    throw new Error('Invalid asset path');
  const resolved = path.resolve(folder, name);
  if (!resolved.startsWith(`${folder}${path.sep}`) || /[\\:]/.test(name))
    throw new Error(`Invalid asset path: ${name}`);
  return resolved;
};

async function verify({ checkBuild = true } = {}) {
  const manifest = JSON.parse(await readFile(path.join(folder, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.tiles?.length || !manifest.depthTexture)
    throw new Error('Incomplete coast export');
  for (const tile of manifest.tiles) {
    const bytes = await readFile(checkedPath(tile.assetUrl));
    if (hash(bytes) !== tile.sha256 || bytes.length !== tile.bytes)
      throw new Error(`Coast checksum mismatch: ${tile.assetUrl}`);
    if (bytes.length > 25 * 1024 * 1024) throw new Error(`Pages limit exceeded: ${tile.assetUrl}`);
  }
  const extras = [
    ...(manifest.regional ? [manifest.regional.horizonsUrl] : []),
    manifest.depthTexture.assetUrl,
    manifest.noticesUrl,
    'decoders/draco_wasm_wrapper.js',
    'decoders/draco_decoder.wasm',
  ];
  if (manifest.marineTexture) {
    const marine = manifest.marineTexture;
    const bytes = await readFile(checkedPath(marine.assetUrl));
    if (hash(bytes) !== marine.sha256 || bytes.length !== marine.bytes)
      throw new Error(`Marine mask checksum mismatch: ${marine.assetUrl}`);
    extras.push(marine.assetUrl);
  }
  if (manifest.urban) {
    for (const [name, digest, size] of [
      [manifest.urban.assetUrl, manifest.urban.sha256, manifest.urban.bytes],
      [manifest.urban.coarseAssetUrl, manifest.urban.coarseSha256, manifest.urban.coarseBytes],
    ]) {
      const bytes = await readFile(checkedPath(name));
      if (hash(bytes) !== digest || bytes.length !== size)
        throw new Error(`Urban checksum mismatch: ${name}`);
      if (bytes.length > 25 * 1024 * 1024) throw new Error(`Pages limit exceeded: ${name}`);
      extras.push(name);
    }
  }
  for (const name of extras) await access(checkedPath(name));
  const beachText = (
    await readFile(path.join(root, 'shared/src/data/beaches.ts'), 'utf8')
  ).replaceAll('\r\n', '\n');
  if (hash(beachText) !== manifest.beachSourceSha256)
    throw new Error('Shared beaches changed: regenerate the coast export');
  const files = [
    ...new Set(['manifest.json', ...extras, ...manifest.tiles.map((tile) => tile.assetUrl)]),
  ];
  if (checkBuild && (await exists(path.join(folder, 'world-build.json')))) {
    const build = JSON.parse(await readFile(path.join(folder, 'world-build.json'), 'utf8'));
    const { id, ...record } = build;
    if (id !== `world-${hash(JSON.stringify(record)).slice(0, 20)}`)
      throw new Error('World build identity does not match its provenance record');
    if (
      Object.keys(record.assets ?? {})
        .sort()
        .join('\n') !== [...files].sort().join('\n')
    )
      throw new Error('World build asset inventory changed: explicitly stamp the new world build');
    for (const name of files) {
      const bytes = await readFile(checkedPath(name));
      if (record.assets[name].sha256 !== hash(bytes) || record.assets[name].bytes !== bytes.length)
        throw new Error(`World build checksum mismatch: ${name}`);
    }
    files.push('world-build.json');
    console.log(`Verified ${id}.`);
  }
  console.log(
    `Verified ${manifest.tiles.length} coast tiles and ${extras.length} supporting assets.`,
  );
  return files;
}

// Explicit release operation only; application builds never invoke GIS or Blender.
async function stamp(files) {
  const assets = {};
  for (const name of [...files].sort()) {
    const bytes = await readFile(checkedPath(name));
    assets[name] = { sha256: hash(bytes), bytes: bytes.length };
  }
  const manifest = JSON.parse(await readFile(checkedPath('manifest.json'), 'utf8'));
  const pipeline = {};
  const fingerprint = async (relative) => {
    if (!(await exists(path.join(root, relative)))) return;
    pipeline[relative] = hash(await readFile(path.join(root, relative)));
  };
  for (const directory of ['3d/gis', '3d/export', '3d/blender', '3d/config']) {
    const scan = async (relative) => {
      const entries = await readdir(path.join(root, relative), { withFileTypes: true });
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        if (entry.name.startsWith('.') || entry.name === '__pycache__') continue;
        const name = `${relative}/${entry.name}`;
        if (entry.isDirectory()) await scan(name);
        else if (/\.(py|mjs|js|json|yaml|txt)$/.test(name)) await fingerprint(name);
      }
    };
    await scan(directory);
  }
  for (const file of [
    '3d/pipeline.py',
    '3d/requirements.lock.txt',
    'pnpm-lock.yaml',
    'scripts/coast-assets.mjs',
  ])
    await fingerprint(file);
  const evidence = {};
  for (const file of [
    'required-sources.json',
    'acquisition-all.json',
    'acquisition-bathymetry.json',
    'latest-supplemental-ground.json',
    'required-imagery.json',
    'regional-sources.json',
    'latest-regional-build.json',
  ]) {
    const filename = path.join(root, '3d/data/metadata', file);
    if (await exists(filename)) evidence[file] = hash(await readFile(filename));
  }
  const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const record = {
    schemaVersion: 1,
    pipelineRevision: revision.status === 0 ? revision.stdout.trim() : null,
    pipeline,
    sources: {
      coastal: manifest.sources,
      marine: manifest.marineTexture ?? null,
      lidar: {
        dataset: 'City of Vancouver LiDAR 2022',
        evidence: evidence['acquisition-all.json'] ?? null,
      },
      bathymetry: {
        dataset: 'CHS NONNA 10',
        evidence: evidence['acquisition-bathymetry.json'] ?? null,
      },
      regional: manifest.regional ?? null,
      urban: manifest.urban ?? null,
      evidence,
    },
    assets,
  };
  const id = `world-${hash(JSON.stringify(record)).slice(0, 20)}`;
  await writeFile(
    checkedPath('world-build.json'),
    `${JSON.stringify({ id, ...record }, null, 2)}\n`,
  );
  console.log(
    `Stamped ${id}. Source evidence hashes refer to retained offline acquisition records.`,
  );
}

if (mode === 'prepare' && process.env.COAST_ASSET_ARCHIVE_URL) {
  if (!/^[a-f0-9]{64}$/i.test(process.env.COAST_ASSET_ARCHIVE_SHA256 || ''))
    throw new Error('Set COAST_ASSET_ARCHIVE_SHA256 with the release bundle hash');
  const url = new URL(process.env.COAST_ASSET_ARCHIVE_URL);
  if (url.protocol !== 'https:') throw new Error('Coast release URL must use HTTPS');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Coast release download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== process.env.COAST_ASSET_ARCHIVE_SHA256.toLowerCase())
    throw new Error('Coast release checksum mismatch');
  await mkdir(path.join(root, '3d/output'), { recursive: true });
  const archive = path.join(root, '3d/output/coast-download.tar.gz');
  await writeFile(archive, bytes);
  const listing = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
  if (listing.status !== 0) throw new Error(listing.stderr);
  for (const name of listing.stdout.trim().split(/\r?\n/)) checkedPath(name);
  await mkdir(folder, { recursive: true });
  const extract = spawnSync('tar', ['-xzf', archive, '-C', folder], { encoding: 'utf8' });
  if (extract.status !== 0) throw new Error(extract.stderr);
}

if (await exists(path.join(folder, 'manifest.json'))) {
  const files = await verify({ checkBuild: mode !== 'package' && mode !== 'stamp' });
  if (mode === 'package' || mode === 'stamp') {
    await stamp(files);
    files.push('world-build.json');
  }
  if (mode === 'prepare') {
    const referenced = new Set(files);
    for (const file of await readdir(folder)) {
      if (
        /^((tile_|regional_).+-lod[012]-[a-f0-9]{12}\.glb|depth-[a-f0-9]{12}\.png|horizons-[a-f0-9]{12}\.json)$/.test(
          file,
        ) &&
        !referenced.has(file)
      ) {
        await unlink(checkedPath(file));
      }
    }
  }
  if (mode === 'package') {
    await mkdir(path.join(root, '3d/output'), { recursive: true });
    const destination = path.join(root, '3d/output/coast-web.tar.gz');
    const list = path.join(root, '3d/output/coast-files.txt');
    await writeFile(list, `${files.join('\n')}\n`);
    const result = spawnSync('tar', ['-czf', destination, '-C', folder, '-T', list], {
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(result.stderr);
    const digest = hash(await readFile(destination));
    await writeFile(`${destination}.sha256`, `${digest}\n`);
    console.log(`${destination}\nSHA256 ${digest}`);
  }
} else if (process.env.VITE_COAST_MANIFEST_URL) {
  const response = await fetch(process.env.VITE_COAST_MANIFEST_URL);
  if (!response.ok) throw new Error('Hosted coast manifest is unavailable');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (JSON.parse(bytes.toString('utf8')).version !== 1)
    throw new Error('Hosted coast manifest is incompatible');
  const buildResponse = await fetch(
    new URL('world-build.json', process.env.VITE_COAST_MANIFEST_URL),
  );
  if (!buildResponse.ok) throw new Error('Hosted world build record is unavailable');
  const { id, ...record } = await buildResponse.json();
  if (
    id !== `world-${hash(JSON.stringify(record)).slice(0, 20)}` ||
    record.assets?.['manifest.json']?.sha256 !== hash(bytes)
  )
    throw new Error('Hosted world build and manifest do not match');
  console.log(`Using hosted coastal assets ${id}.`);
} else if (mode === 'prepare') {
  console.warn(
    'Coast assets are absent: the site will show its beach-page fallback. Run pnpm 3d:export before releasing.',
  );
} else {
  throw new Error(
    'Coast release is missing. Export locally, restore the pinned bundle, or set VITE_COAST_MANIFEST_URL.',
  );
}
