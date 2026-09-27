const LOCK_TTL_SECONDS = 60; // Cloudflare KV minimum TTL
const LOCK_WAIT_MS = 500;

async function get<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

async function set<T>(kv: KVNamespace, key: string, value: T, ttlSeconds: number): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

async function getOrFetch<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  // Check cache
  const cached = await get<T>(kv, key);
  if (cached !== null) return cached;

  // Check soft lock -- another worker may be fetching
  const lockKey = `fetching:${key}`;
  const lock = await kv.get(lockKey);
  if (lock !== null) {
    // Wait briefly and retry cache read
    await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MS));
    const retried = await get<T>(kv, key);
    if (retried !== null) return retried;
  }

  // Acquire soft lock
  await kv.put(lockKey, '1', { expirationTtl: LOCK_TTL_SECONDS });

  // Fetch and cache
  const value = await fetcher();
  await set(kv, key, value, ttlSeconds);
  await kv.delete(lockKey);
  return value;
}

const pending = new Map<string, Promise<unknown>>();

// Reuse the existing cache keys. Keep last-good values separately from freshness TTLs.
// KV locks are advisory across isolates; same-isolate requests are coalesced exactly.
async function resilient<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  const cached = await get<T>(kv, key);
  if (cached !== null) return cached;
  const active = pending.get(key);
  if (active) return active as Promise<T>;
  const task = (async () => {
    const stale = await get<T>(kv, `last-good:${key}`);
    if (await kv.get(`retry:${key}`)) {
      if (stale !== null) return stale;
      throw new Error('Environmental source temporarily unavailable');
    }
    if (await kv.get(`fetching:${key}`)) {
      if (stale !== null) return stale;
      throw new Error('Environmental source refresh in progress');
    }
    await set(kv, `fetching:${key}`, true, 60);
    try {
      const value = await fetcher();
      await set(kv, key, value, ttl);
      await set(kv, `last-good:${key}`, value, 7 * 86400);
      return value;
    } catch (error) {
      await set(kv, `retry:${key}`, true, 60);
      if (stale !== null) return stale;
      throw error;
    } finally {
      await kv.delete(`fetching:${key}`);
    }
  })();
  pending.set(key, task);
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}

export const kvCache = { get, set, getOrFetch, resilient };
