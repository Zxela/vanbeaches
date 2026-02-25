import { describe, expect, it, vi } from 'vitest';
import { AppError, onRequest } from './_middleware';

function createMockContext(
  overrides: {
    method?: string;
    next?: () => Promise<Response>;
  } = {},
) {
  const method = overrides.method ?? 'GET';
  const request = new Request('https://example.com/api/test', { method });
  const next = overrides.next ?? (async () => Response.json({ ok: true }));

  return {
    request,
    next,
    env: { BEACH_CACHE: {} as KVNamespace },
    params: {},
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequest>[0];
}

describe('_middleware', () => {
  describe('CORS headers', () => {
    it('adds CORS headers to all responses', async () => {
      const context = createMockContext();
      const response = await onRequest(context);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    it('returns 204 for OPTIONS preflight without calling next', async () => {
      const next = vi.fn();
      const context = createMockContext({ method: 'OPTIONS', next });
      const response = await onRequest(context);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns ApiResponse<null> shape for AppError', async () => {
      const context = createMockContext({
        next: async () => {
          throw new AppError('NOT_FOUND', 'Beach not found: xyz');
        },
      });

      const response = await onRequest(context);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({
        success: false,
        data: null,
        error: 'Beach not found: xyz',
        cached: false,
        cachedAt: null,
      });
    });

    it('returns 404 for NOT_FOUND errors', async () => {
      const context = createMockContext({
        next: async () => {
          throw new AppError('NOT_FOUND', 'Not found');
        },
      });

      const response = await onRequest(context);
      expect(response.status).toBe(404);
    });

    it('returns 429 for RATE_LIMITED errors', async () => {
      const context = createMockContext({
        next: async () => {
          throw new AppError('RATE_LIMITED', 'Rate limited');
        },
      });

      const response = await onRequest(context);
      expect(response.status).toBe(429);
    });

    it('returns 503 for SERVICE_UNAVAILABLE errors', async () => {
      const context = createMockContext({
        next: async () => {
          throw new AppError('SERVICE_UNAVAILABLE', 'Service unavailable');
        },
      });

      const response = await onRequest(context);
      expect(response.status).toBe(503);
    });

    it('returns 500 for unhandled errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const context = createMockContext({
        next: async () => {
          throw new Error('Something unexpected');
        },
      });

      const response = await onRequest(context);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        success: false,
        data: null,
        error: 'Internal server error',
        cached: false,
        cachedAt: null,
      });

      consoleSpy.mockRestore();
    });

    it('includes CORS headers on error responses', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const context = createMockContext({
        next: async () => {
          throw new Error('fail');
        },
      });

      const response = await onRequest(context);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      consoleSpy.mockRestore();
    });
  });

  describe('passthrough', () => {
    it('passes through successful responses with original body', async () => {
      const context = createMockContext({
        next: async () => Response.json({ success: true, data: 'hello' }),
      });

      const response = await onRequest(context);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, data: 'hello' });
    });
  });
});
