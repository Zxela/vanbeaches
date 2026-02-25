import { describe, it, expect, vi, beforeEach } from "vitest";
import { kvCache } from "./kvCache";

function createMockKv() {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    _store: store,
  } as unknown as KVNamespace & { _store: Map<string, string> };
}

describe("kvCache", () => {
  let mockKv: ReturnType<typeof createMockKv>;

  beforeEach(() => {
    mockKv = createMockKv();
  });

  describe("get", () => {
    it("returns null when key is missing", async () => {
      expect(await kvCache.get(mockKv, "missing")).toBeNull();
    });

    it("returns parsed JSON value when key exists", async () => {
      mockKv._store.set("weather:test", JSON.stringify({ temperature: 20 }));
      const result = await kvCache.get<{ temperature: number }>(mockKv, "weather:test");
      expect(result).toEqual({ temperature: 20 });
    });
  });

  describe("set", () => {
    it("writes JSON string to KV with expirationTtl", async () => {
      await kvCache.set(mockKv, "weather:test", { temperature: 20 }, 1800);
      expect(mockKv.put).toHaveBeenCalledWith(
        "weather:test",
        expect.any(String),
        { expirationTtl: 1800 },
      );
      const stored = JSON.parse(mockKv._store.get("weather:test")!);
      expect(stored).toEqual({ temperature: 20 });
    });
  });

  describe("getOrFetch", () => {
    it("returns cached value on hit without calling fetcher", async () => {
      mockKv._store.set("weather:test", JSON.stringify({ temperature: 20 }));
      const fetcher = vi.fn();

      const result = await kvCache.getOrFetch(
        mockKv,
        "weather:test",
        fetcher,
        1800,
      );

      expect(result).toEqual({ temperature: 20 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("calls fetcher on cache miss and writes result to KV", async () => {
      const fetcher = vi.fn().mockResolvedValue({ temperature: 25 });

      const result = await kvCache.getOrFetch(
        mockKv,
        "weather:test",
        fetcher,
        1800,
      );

      expect(result).toEqual({ temperature: 25 });
      expect(fetcher).toHaveBeenCalledOnce();
      expect(mockKv.put).toHaveBeenCalled();
    });

    it("writes a fetching:{key} soft lock marker with 30s TTL before calling fetcher", async () => {
      const fetcher = vi.fn().mockResolvedValue({ temperature: 25 });

      await kvCache.getOrFetch(mockKv, "weather:test", fetcher, 1800);

      expect(mockKv.put).toHaveBeenCalledWith(
        "fetching:weather:test",
        "1",
        { expirationTtl: 30 },
      );
    });

    it("waits and retries KV read when soft lock exists on cache miss", async () => {
      mockKv._store.set("fetching:weather:test", "1");

      // On first get call, return null (cache miss)
      // On lock check, return "1" (lock exists)
      // On retry get after wait, return the cached value
      let getCalls = 0;
      (mockKv.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        getCalls++;
        if (key === "fetching:weather:test") return Promise.resolve("1");
        // First call for data key returns null, second returns data
        if (key === "weather:test" && getCalls > 2) {
          return Promise.resolve(JSON.stringify({ temperature: 30 }));
        }
        return Promise.resolve(null);
      });

      const fetcher = vi.fn().mockResolvedValue({ temperature: 25 });

      const result = await kvCache.getOrFetch(
        mockKv,
        "weather:test",
        fetcher,
        1800,
      );

      expect(result).toEqual({ temperature: 30 });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("proceeds to fetch if retry after lock wait still returns null", async () => {
      mockKv._store.set("fetching:weather:test", "1");

      (mockKv.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === "fetching:weather:test") return Promise.resolve("1");
        return Promise.resolve(null);
      });

      const fetcher = vi.fn().mockResolvedValue({ temperature: 25 });

      const result = await kvCache.getOrFetch(
        mockKv,
        "weather:test",
        fetcher,
        1800,
      );

      expect(result).toEqual({ temperature: 25 });
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it("deletes soft lock marker after successful fetch", async () => {
      const fetcher = vi.fn().mockResolvedValue({ temperature: 25 });

      await kvCache.getOrFetch(mockKv, "weather:test", fetcher, 1800);

      expect(mockKv.delete).toHaveBeenCalledWith("fetching:weather:test");
    });
  });
});
