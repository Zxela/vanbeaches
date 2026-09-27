export interface Env {
  WORLD_ASSETS: R2Bucket;
  WORLD_ASSETS_ENABLED?: string;
}

const immutable = 'public, max-age=31536000, immutable';
const methods = 'GET, HEAD, OPTIONS';

function headers() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'If-None-Match, If-Modified-Since, Range',
    'Access-Control-Expose-Headers': 'ETag, Content-Length, Last-Modified, Cache-Control',
    'X-Content-Type-Options': 'nosniff',
  });
}

function failure(status: number, message: string, head: boolean) {
  const responseHeaders = headers();
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
  if (status === 405) responseHeaders.set('Allow', methods);
  return new Response(head ? null : message, { status, headers: responseHeaders });
}

/** No unversioned aliases, encoded paths, directory listing or administrative routes. */
function assetKey(pathname: string) {
  if (pathname.length > 2048) return null;
  const parts = pathname.slice(1).split('/');
  if (!/^world-[a-f0-9]{20}$/.test(parts[0]) || parts.length < 2) return null;
  if (
    parts.slice(1).some((part) => !/^[A-Za-z0-9_.-]+$/.test(part) || part === '.' || part === '..')
  )
    return null;
  return parts.join('/');
}

function fallbackContentType(key: string) {
  if (key.endsWith('.json')) return 'application/json';
  if (key.endsWith('.glb')) return 'model/gltf-binary';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (key.endsWith('.wasm')) return 'application/wasm';
  if (key.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (key.endsWith('.gz')) return 'application/gzip';
  return 'application/octet-stream';
}

function notModified(request: Request, object: R2Object) {
  const etags = request.headers.get('If-None-Match');
  if (etags !== null)
    return etags.split(',').some((tag) => {
      const candidate = tag.trim().replace(/^W\//, '');
      return candidate === '*' || candidate === object.httpEtag;
    });
  const since = request.headers.get('If-Modified-Since');
  return since !== null && Math.floor(object.uploaded.getTime() / 1000) <= Date.parse(since) / 1000;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const head = request.method === 'HEAD';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
      return failure(405, 'Method not allowed', head);
    if (request.method !== 'OPTIONS' && env.WORLD_ASSETS_ENABLED === 'false')
      return failure(503, 'World asset delivery is temporarily disabled', head);
    const key = assetKey(new URL(request.url).pathname);
    if (!key) return failure(404, 'Not found', head);
    if (request.method === 'OPTIONS') {
      const responseHeaders = headers();
      responseHeaders.set('Access-Control-Max-Age', '86400');
      return new Response(null, { status: 204, headers: responseHeaders });
    }
    try {
      let object: R2Object | null;
      let body: ReadableStream | null = null;
      if (head) object = await env.WORLD_ASSETS.head(key);
      else {
        const loaded = await env.WORLD_ASSETS.get(key);
        object = loaded;
        body = loaded?.body ?? null;
      }
      if (!object) return failure(404, 'Not found', head);
      const responseHeaders = headers();
      object.writeHttpMetadata(responseHeaders);
      responseHeaders.set('ETag', object.httpEtag);
      responseHeaders.set('Last-Modified', object.uploaded.toUTCString());
      responseHeaders.set('Cache-Control', immutable);
      if (!responseHeaders.has('Content-Type'))
        responseHeaders.set('Content-Type', fallbackContentType(key));
      if (notModified(request, object)) {
        if (body) await body.cancel();
        responseHeaders.delete('Content-Length');
        return new Response(null, { status: 304, headers: responseHeaders });
      }
      responseHeaders.set('Content-Length', String(object.size));
      return new Response(body, { headers: responseHeaders });
    } catch {
      return failure(503, 'World assets temporarily unavailable', head);
    }
  },
};
