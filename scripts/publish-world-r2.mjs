import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = JSON.parse(await readFile(path.join(root, 'world-assets/release.json'), 'utf8'));
const assets = path.join(root, 'client/public/coast-assets');
const output = path.join(root, '3d/output');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Release command failed (${result.status})`);
};
if (!/^world-[a-f0-9]{20}$/.test(release.worldId)) throw new Error('Invalid release ID');
// Publishing a local package must always inspect local bytes, even in a hosted-build shell.
process.env.VITE_COAST_MANIFEST_URL = '';
run(['scripts/coast-assets.mjs', 'verify']);
const build = JSON.parse(await readFile(path.join(assets, 'world-build.json'), 'utf8'));
if (build.id !== release.worldId) throw new Error('Local world does not match the pinned release');
const archive = path.join(output, 'coast-web.tar.gz');
if (hash(await readFile(archive)) !== release.archiveSha256)
  throw new Error('Archive does not match the pinned release');
if ((await readFile(`${archive}.sha256`, 'utf8')).trim() !== release.archiveSha256)
  throw new Error('Archive checksum sidecar does not match the pinned release');

const contentType = (name) => {
  if (name.endsWith('.json')) return 'application/json';
  if (name.endsWith('.glb')) return 'model/gltf-binary';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.js')) return 'text/javascript';
  if (name.endsWith('.wasm')) return 'application/wasm';
  if (name.endsWith('.gz')) return 'application/gzip';
  return 'text/plain';
};
const groups = new Map();
const add = (name, file) => {
  const type = contentType(name);
  if (!groups.has(type)) groups.set(type, []);
  groups.get(type).push({ key: `${release.worldId}/${name}`, file });
};
for (const name of Object.keys(build.assets)) {
  if (name !== 'manifest.json') add(name, path.join(assets, name));
}
add('coast-web.tar.gz', archive);
add('coast-web.tar.gz.sha256', `${archive}.sha256`);
await mkdir(output, { recursive: true });
const plans = [];
for (const [type, entries] of groups) {
  const filename = path.join(output, `r2-upload-${plans.length}.json`);
  await writeFile(filename, JSON.stringify(entries, null, 2));
  plans.push({ type, filename, objects: entries.length });
}
const manifestUrl = `${release.baseUrl}/${release.worldId}/manifest.json`;
async function verifyPublished() {
  process.env.VITE_COAST_MANIFEST_URL = manifestUrl;
  run(['scripts/coast-assets.mjs', 'verify']);
  const response = await fetch(new URL('coast-web.tar.gz', manifestUrl));
  if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== release.archiveSha256)
    throw new Error('Published archive differs from the immutable release pin');
}
console.log(JSON.stringify({ bucket: release.bucket, manifestUrl, groups: plans }, null, 2));
if (!process.argv.includes('--publish')) {
  console.log(
    'Plan only. Use --publish after enabling R2 and deploying the read-only asset Worker.',
  );
  process.exit(0);
}
const existing = await fetch(manifestUrl);
if (existing.ok) {
  if (hash(Buffer.from(await existing.arrayBuffer())) !== build.assets['manifest.json'].sha256)
    throw new Error('Published version differs: refusing to overwrite an immutable release');
  await verifyPublished();
  console.log('This world is already published. No objects were overwritten.');
  process.exit(0);
}
if (existing.status !== 404) throw new Error(`Cannot inspect destination: ${existing.status}`);
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
for (const plan of plans)
  run([
    wrangler,
    'r2',
    'bulk',
    'put',
    release.bucket,
    '--remote',
    '--force',
    '--filename',
    plan.filename,
    '--concurrency',
    '4',
    '--content-type',
    plan.type,
    '--cache-control',
    'public, max-age=31536000, immutable',
  ]);
// Publish the manifest last, so a newly available version has all referenced objects.
for (const name of ['world-build.json', 'manifest.json'])
  run([
    wrangler,
    'r2',
    'object',
    'put',
    `${release.bucket}/${release.worldId}/${name}`,
    '--remote',
    '--file',
    path.join(assets, name),
    '--content-type',
    'application/json',
    '--cache-control',
    'public, max-age=31536000, immutable',
  ]);
await verifyPublished();
console.log(`Published ${manifestUrl}`);
