import { describe, it, expect, vi, beforeEach } from "vitest";
import { BEACHES } from "@van-beaches/shared";

vi.mock("./services/weatherService", () => ({
  fetchWeatherForBeach: vi.fn().mockResolvedValue({}),
}));

vi.mock("./services/iwlsService", () => ({
  fetchTidesForStation: vi.fn().mockResolvedValue({}),
}));

vi.mock("./services/waterQualityService", () => ({
  fetchWaterQualityForBeach: vi.fn().mockResolvedValue({}),
}));

import { fetchWeatherForBeach } from "./services/weatherService";
import { fetchTidesForStation } from "./services/iwlsService";
import { fetchWaterQualityForBeach } from "./services/waterQualityService";
import worker from "./index";

function createMockKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;
}

function createMockCtx() {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil: vi.fn((p: Promise<unknown>) => {
      promises.push(p);
    }),
    passThroughOnException: vi.fn(),
    _promises: promises,
  } as unknown as ExecutionContext & { _promises: Promise<unknown>[] };
}

describe("cron handler", () => {
  let mockKv: KVNamespace;
  let env: { BEACH_CACHE: KVNamespace };
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKv = createMockKv();
    env = { BEACH_CACHE: mockKv };
    ctx = createMockCtx();
  });

  it("refreshes weather for all 9 beaches on */30 * * * *", async () => {
    const event = { cron: "*/30 * * * *", scheduledTime: Date.now() } as ScheduledEvent;

    await worker.scheduled(event, env, ctx);
    await Promise.all(ctx._promises);

    expect(fetchWeatherForBeach).toHaveBeenCalledTimes(9);
  });

  it("refreshes tides for unique non-null stations only on 0 * * * *", async () => {
    const event = { cron: "0 * * * *", scheduledTime: Date.now() } as ScheduledEvent;

    await worker.scheduled(event, env, ctx);
    await Promise.all(ctx._promises);

    // All saltwater beaches share one station; Trout Lake is null
    expect(fetchTidesForStation).toHaveBeenCalledTimes(1);
  });

  it("refreshes water quality for all 9 beaches on 0 */6 * * *", async () => {
    const event = { cron: "0 */6 * * *", scheduledTime: Date.now() } as ScheduledEvent;

    await worker.scheduled(event, env, ctx);
    await Promise.all(ctx._promises);

    expect(fetchWaterQualityForBeach).toHaveBeenCalledTimes(9);
  });

  it("skips beaches where tideStationId is null", async () => {
    const event = { cron: "0 * * * *", scheduledTime: Date.now() } as ScheduledEvent;

    await worker.scheduled(event, env, ctx);
    await Promise.all(ctx._promises);

    const calls = vi.mocked(fetchTidesForStation).mock.calls;
    for (const [_kv, stationId] of calls) {
      expect(stationId).not.toBeNull();
    }
  });

  it("continues processing if one beach refresh fails", async () => {
    vi.mocked(fetchWeatherForBeach)
      .mockRejectedValueOnce(new Error("API down"))
      .mockResolvedValue({} as never);

    const event = { cron: "*/30 * * * *", scheduledTime: Date.now() } as ScheduledEvent;

    await worker.scheduled(event, env, ctx);
    await expect(Promise.all(ctx._promises)).resolves.not.toThrow();

    // Should still attempt all 9 beaches
    expect(fetchWeatherForBeach).toHaveBeenCalledTimes(BEACHES.length);
  });
});
