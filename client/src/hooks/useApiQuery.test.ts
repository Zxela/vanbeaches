import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApiQuery } from './useApiQuery';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useApiQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('clears old data and ignores an obsolete response when the URL changes', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(({ url }) => useApiQuery<{ id: string }>(url), {
      initialProps: { url: '/api/a' },
    });

    rerender({ url: '/api/b' });
    expect(result.current.data).toBeNull();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);

    await act(async () => {
      second.resolve({ json: async () => ({ success: true, data: { id: 'b' } }) } as Response);
      await second.promise;
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'b' }));

    await act(async () => {
      first.resolve({ json: async () => ({ success: true, data: { id: 'a' } }) } as Response);
      await first.promise;
    });
    expect(result.current.data).toEqual({ id: 'b' });
  });

  it('clears successful data when a refetch fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: { id: 'a' } }) })
      .mockResolvedValueOnce({ json: async () => ({ success: false, error: 'Unavailable' }) });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useApiQuery<{ id: string }>('/api/a'));
    await waitFor(() => expect(result.current.data).toEqual({ id: 'a' }));

    await act(async () => result.current.refetch());
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Unavailable');
  });
});
