import { describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index';

const version = 'world-0123456789abcdefabcd';
const uploaded = new Date('2026-09-19T12:00:00Z');
function fixture(found = true) {
  const metadata = {
    size: 4,
    httpEtag: '"asset-etag"',
    uploaded,
    writeHttpMetadata: (headers: Headers) => {
      headers.set('Content-Type', 'model/gltf-binary');
      headers.set('Cache-Control', 'private, max-age=0');
    },
  };
  const bucket = {
    get: vi.fn(async () => (found ? { ...metadata, body: new Response('GLB!').body } : null)),
    head: vi.fn(async () => (found ? metadata : null)),
  };
  return { bucket, env: { WORLD_ASSETS: bucket } as unknown as Env };
}
const request = (path: string, init?: RequestInit) =>
  new Request(`https://assets.test${path}`, init);

describe('public versioned world assets', () => {
  it.each(['GET', 'HEAD'])(
    'blocks %s before any R2 read when delivery is disabled',
    async (method) => {
      const { env, bucket } = fixture();
      env.WORLD_ASSETS_ENABLED = 'false';
      const response = await worker.fetch(request(`/${version}/manifest.json`, { method }), env);
      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(await response.text()).toBe(
        method === 'HEAD' ? '' : 'World asset delivery is temporarily disabled',
      );
      expect(bucket.get).not.toHaveBeenCalled();
      expect(bucket.head).not.toHaveBeenCalled();
      const preflight = await worker.fetch(
        request(`/${version}/manifest.json`, { method: 'OPTIONS' }),
        env,
      );
      expect(preflight.status).toBe(204);
      expect(bucket.get).not.toHaveBeenCalled();
      expect(bucket.head).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 'true', 'FALSE'])(
    'keeps delivery enabled unless the setting is exactly false: %s',
    async (setting) => {
      const { env, bucket } = fixture();
      env.WORLD_ASSETS_ENABLED = setting;
      const response = await worker.fetch(request(`/${version}/manifest.json`), env);
      expect(response.status).toBe(200);
      expect(bucket.get).toHaveBeenCalledOnce();
    },
  );

  it('streams the exact version key with R2 metadata, ETag, CORS and immutable caching', async () => {
    const { env, bucket } = fixture();
    const response = await worker.fetch(request(`/${version}/tile_1-lod0.glb?ignored=1`), env);
    expect(bucket.get).toHaveBeenCalledWith(`${version}/tile_1-lod0.glb`);
    expect(await response.text()).toBe('GLB!');
    expect(response.headers.get('Content-Type')).toBe('model/gltf-binary');
    expect(response.headers.get('ETag')).toBe('"asset-etag"');
    expect(response.headers.get('Content-Length')).toBe('4');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('uses R2 head without reading a body, including for the release archive', async () => {
    const { env, bucket } = fixture();
    const response = await worker.fetch(
      request(`/${version}/archive.tar.gz`, { method: 'HEAD' }),
      env,
    );
    expect(bucket.head).toHaveBeenCalledWith(`${version}/archive.tar.gz`);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Content-Length')).toBe('4');
  });

  it('allows decoder subdirectories and answers preflight without touching R2', async () => {
    const { env, bucket } = fixture();
    const response = await worker.fetch(
      request(`/${version}/decoders/draco_decoder.wasm`, { method: 'OPTIONS' }),
      env,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS');
    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.head).not.toHaveBeenCalled();
  });

  it.each([
    '/',
    '/manifest.json',
    '/world-invalid/archive.tar.gz',
    `/${version}/`,
    `/${version}//secret`,
    `/${version}/%2fprivate`,
    `/${version}/%252e%252e/private`,
  ])('rejects unsafe or unversioned paths before an R2 read: %s', async (path) => {
    const { env, bucket } = fixture();
    const response = await worker.fetch(request(path), env);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it('never caches missing assets and preserves empty HEAD semantics', async () => {
    const { env } = fixture(false);
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(request(`/${version}/missing.glb`, { method }), env);
      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(await response.text()).toBe(method === 'HEAD' ? '' : 'Not found');
    }
  });

  it('rejects mutation and returns uncached failures without leaking storage errors', async () => {
    const { env, bucket } = fixture();
    const denied = await worker.fetch(request(`/${version}/manifest.json`, { method: 'PUT' }), env);
    expect(denied.status).toBe(405);
    expect(denied.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
    expect(bucket.get).not.toHaveBeenCalled();
    bucket.get.mockRejectedValueOnce(new Error('private storage detail'));
    const failed = await worker.fetch(request(`/${version}/manifest.json`), env);
    expect(failed.status).toBe(503);
    expect(failed.headers.get('Cache-Control')).toBe('no-store');
    expect(await failed.text()).not.toContain('private storage detail');
  });

  it('honors weak/list ETag validation and gives ETags precedence over dates', async () => {
    const { env } = fixture();
    const cached = await worker.fetch(
      request(`/${version}/manifest.json`, {
        headers: { 'If-None-Match': '"different", W/"asset-etag"' },
      }),
      env,
    );
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
    expect(cached.headers.has('Content-Length')).toBe(false);
    const changed = await worker.fetch(
      request(`/${version}/manifest.json`, {
        headers: {
          'If-None-Match': '"different"',
          'If-Modified-Since': 'Sun, 20 Sep 2026 12:00:00 GMT',
        },
      }),
      env,
    );
    expect(changed.status).toBe(200);
    const dated = await worker.fetch(
      request(`/${version}/manifest.json`, {
        method: 'HEAD',
        headers: { 'If-Modified-Since': uploaded.toUTCString() },
      }),
      env,
    );
    expect(dated.status).toBe(304);
  });
});
