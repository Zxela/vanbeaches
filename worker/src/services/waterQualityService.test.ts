import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWaterQualityForBeach } from "./waterQualityService";

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

describe("waterQualityService", () => {
  let mockKv: ReturnType<typeof createMockKv>;

  beforeEach(() => {
    mockKv = createMockKv();
    vi.restoreAllMocks();
  });

  it("returns a WaterQualityStatus object", async () => {
    const result = await fetchWaterQualityForBeach(mockKv, "english-bay");

    expect(result.beachId).toBe("english-bay");
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("ecoliCount");
    expect(result).toHaveProperty("advisoryReason");
    expect(result).toHaveProperty("sampleDate");
    expect(result).toHaveProperty("fetchedAt");
  });

  it("returns 'off-season' level during October through April", async () => {
    // February is off-season (month 2 <= 4)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));

    const result = await fetchWaterQualityForBeach(mockKv, "english-bay");

    expect(result.level).toBe("off-season");
    expect(result.ecoliCount).toBeNull();
    expect(result.advisoryReason).toBeNull();
    expect(result.sampleDate).toBeNull();

    vi.useRealTimers();
  });

  it("returns in-season data during May through September", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));

    const result = await fetchWaterQualityForBeach(mockKv, "english-bay");

    expect(["good", "advisory"]).toContain(result.level);
    expect(result.ecoliCount).toBeTypeOf("number");
    expect(result.sampleDate).not.toBeNull();

    vi.useRealTimers();
  });

  it("writes water quality data to KV with 21600s TTL", async () => {
    await fetchWaterQualityForBeach(mockKv, "english-bay");

    expect(mockKv.put).toHaveBeenCalledWith(
      "waterquality:english-bay",
      expect.any(String),
      { expirationTtl: 21600 },
    );
  });

  it("matches the WaterQualityStatus shared type shape", async () => {
    const result = await fetchWaterQualityForBeach(mockKv, "english-bay");

    expect(typeof result.beachId).toBe("string");
    expect(typeof result.level).toBe("string");
    expect(
      result.ecoliCount === null || typeof result.ecoliCount === "number",
    ).toBe(true);
    expect(
      result.advisoryReason === null ||
        typeof result.advisoryReason === "string",
    ).toBe(true);
    expect(
      result.sampleDate === null || typeof result.sampleDate === "string",
    ).toBe(true);
    expect(typeof result.fetchedAt).toBe("string");
  });
});
