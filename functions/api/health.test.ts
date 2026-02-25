import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './health';

function createMockContext() {
  return {
    request: new Request('https://example.com/api/health'),
    env: { BEACH_CACHE: {} as KVNamespace },
    params: {},
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    next: vi.fn(),
    data: {},
    functionPath: '',
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/health', () => {
  it('returns status ok and a timestamp', async () => {
    const context = createMockContext();
    const response = await onRequestGet(context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
