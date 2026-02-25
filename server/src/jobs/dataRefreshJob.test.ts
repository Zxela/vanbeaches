import { BEACHES } from '@van-beaches/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../services/iwlsService.js', () => ({
  getTidePredictions: vi.fn().mockResolvedValue({ beachId: 'test', predictions: [] }),
}));

vi.mock('../services/weatherService.js', () => ({
  getWeatherForecast: vi.fn().mockResolvedValue({}),
}));

vi.mock('../services/waterQualityService.js', () => ({
  getWaterQuality: vi.fn().mockResolvedValue({}),
}));

vi.mock('./scheduler.js', () => ({
  scheduleJob: vi.fn(),
}));

import { getTidePredictions } from '../services/iwlsService.js';
import { scheduleJob } from './scheduler.js';
import { setupDataRefreshJobs } from './dataRefreshJob.js';

describe('dataRefreshJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tide refresh job', () => {
    it('schedules tide-refresh job with hourly cron expression', () => {
      setupDataRefreshJobs();
      expect(scheduleJob).toHaveBeenCalledWith(
        'tide-refresh',
        '0 * * * *',
        expect.any(Function),
      );
    });

    it('deduplicates tide station fetches for beaches sharing the same stationId', async () => {
      setupDataRefreshJobs();

      // Find the tide-refresh handler
      const calls = vi.mocked(scheduleJob).mock.calls;
      const tideCall = calls.find((c) => c[0] === 'tide-refresh');
      expect(tideCall).toBeDefined();
      const handler = tideCall![2];

      await handler();

      // Count unique non-null station IDs from BEACHES
      const uniqueStationIds = new Set(
        BEACHES.filter((b) => b.tideStationId !== null).map((b) => b.tideStationId),
      );
      expect(getTidePredictions).toHaveBeenCalledTimes(uniqueStationIds.size);
    });

    it('skips beaches with null tideStationId', async () => {
      setupDataRefreshJobs();

      const calls = vi.mocked(scheduleJob).mock.calls;
      const tideCall = calls.find((c) => c[0] === 'tide-refresh');
      const handler = tideCall![2];

      await handler();

      // Verify no call was made with null stationId
      const tideCallArgs = vi.mocked(getTidePredictions).mock.calls;
      for (const [stationId] of tideCallArgs) {
        expect(stationId).not.toBeNull();
      }
    });

    it('catches and logs individual beach tide refresh failures without propagating', async () => {
      vi.mocked(getTidePredictions).mockRejectedValueOnce(new Error('Station offline'));

      setupDataRefreshJobs();

      const calls = vi.mocked(scheduleJob).mock.calls;
      const tideCall = calls.find((c) => c[0] === 'tide-refresh');
      const handler = tideCall![2];

      // Should not throw even if one station fails
      await expect(handler()).resolves.not.toThrow();
    });
  });
});
