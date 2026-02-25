const LOCK_TTL_SECONDS = 30;
const LOCK_WAIT_MS = 500;

async function get<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

async function set<T>(
  kv: KVNamespace,
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
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
  await kv.put(lockKey, "1", { expirationTtl: LOCK_TTL_SECONDS });

  // Fetch and cache
  const value = await fetcher();
  await set(kv, key, value, ttlSeconds);
  await kv.delete(lockKey);
  return value;
}

export const kvCache = { get, set, getOrFetch };
