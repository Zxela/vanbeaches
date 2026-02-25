import type { WaterQualityLevel, WaterQualityStatus } from "@van-beaches/shared";
import { kvCache } from "../cache/kvCache";

const WATER_QUALITY_TTL_SECONDS = 21600; // 6 hours

export async function fetchWaterQualityForBeach(
  kv: KVNamespace,
  beachId: string,
): Promise<WaterQualityStatus> {
  const now = new Date();
  const month = now.getMonth() + 1;

  let status: WaterQualityStatus;

  if (month >= 10 || month <= 4) {
    status = {
      beachId,
      level: "off-season" as WaterQualityLevel,
      ecoliCount: null,
      advisoryReason: null,
      sampleDate: null,
      fetchedAt: new Date().toISOString(),
    };
  } else {
    const mockStatuses: WaterQualityLevel[] = [
      "good",
      "good",
      "good",
      "advisory",
      "good",
    ];
    const randomLevel =
      mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

    status = {
      beachId,
      level: randomLevel,
      ecoliCount:
        randomLevel === "good"
          ? Math.floor(Math.random() * 100)
          : Math.floor(Math.random() * 300) + 200,
      advisoryReason:
        randomLevel === "advisory"
          ? "Elevated E.coli levels detected"
          : null,
      sampleDate: new Date(
        now.getTime() - 86400000 * Math.floor(Math.random() * 7),
      ).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  }

  await kvCache.set(
    kv,
    `waterquality:${beachId}`,
    status,
    WATER_QUALITY_TTL_SECONDS,
  );
  return status;
}
