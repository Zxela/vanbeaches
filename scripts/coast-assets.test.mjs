import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import test from 'node:test';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const manifest = JSON.stringify({ version: 1 });
const record = { assets: { 'manifest.json': { sha256: hash(manifest) } } };
const id = `world-${hash(JSON.stringify(record)).slice(0, 20)}`;

function verify({ mode = 'verify', pathId = id, badManifest = false, badBuild = false } = {}) {
  const preload = `globalThis.fetch = async (url) => {
    if (!String(url).startsWith('https://world.example/')) throw new Error('Archive must not be fetched');
    return new Response(String(url).endsWith('world-build.json')
      ? ${JSON.stringify(JSON.stringify({ id: badBuild ? 'world-wrong' : id, ...record }))}
      : ${JSON.stringify(badManifest ? JSON.stringify({ version: 1, changed: true }) : manifest)});
  };`;
  return spawnSync(
    process.execPath,
    [
      '--import',
      `data:text/javascript,${encodeURIComponent(preload)}`,
      'scripts/coast-assets.mjs',
      mode,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        VITE_COAST_MANIFEST_URL: `https://world.example/${pathId}/manifest.json`,
        COAST_ASSET_ARCHIVE_URL: 'https://archive.example/must-not-download.tar.gz',
      },
    },
  );
}

test('hosted preparation verifies its release without downloading the archive', () => {
  const result = verify({ mode: 'prepare' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Using separately hosted coastal assets/);
});
test('hosted verification rejects a modified manifest', () => {
  assert.notEqual(verify({ badManifest: true }).status, 0);
});
test('hosted verification rejects a modified build identity', () => {
  assert.notEqual(verify({ badBuild: true }).status, 0);
});
test('hosted verification rejects a mutable or mismatched URL', () => {
  assert.notEqual(verify({ pathId: 'latest' }).status, 0);
});
