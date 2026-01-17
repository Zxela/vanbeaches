# Task: TASK-033 Background Scheduler

Metadata:
- Phase: 6 - Optimization
- Dependencies: TASK-009 (IWLS Service), TASK-014 (Weather Service), TASK-019 (Water Quality Service)
- Provides: Cron-based background job scheduling for proactive cache refresh
- Size: Small (3 files)
- Verification Level: L2 (Tests)

## Implementation Content

Create the background scheduler using node-cron to proactively refresh cache data. Schedule weather refresh every 30 minutes and water quality refresh every 6 hours. Implement job status logging and ensure job failures don't crash the server.

## Target Files

- [ ] `/home/zxela/workspace/server/src/jobs/scheduler.ts`
- [ ] `/home/zxela/workspace/server/src/jobs/dataRefreshJob.ts`
- [ ] `/home/zxela/workspace/server/src/jobs/__tests__/scheduler.test.ts`

## Implementation Steps (TDD: Red-Green-Refactor)

### 1. Red Phase
- [ ] Review dependency deliverables:
  - TASK-009: IWLSService for tide data refresh
  - TASK-014: WeatherService for weather data refresh
  - TASK-019: WaterQualityService for water quality refresh
- [ ] Write failing tests for scheduler:
  ```typescript
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { Scheduler } from '../scheduler'
  import { DataRefreshJob } from '../dataRefreshJob'

  describe('Scheduler', () => {
    let scheduler: Scheduler

    beforeEach(() => {
      vi.useFakeTimers()
      scheduler = new Scheduler()
    })

    afterEach(() => {
      scheduler.stop()
      vi.useRealTimers()
    })

    describe('scheduleJob', () => {
      it('schedules a job with cron expression', () => {
        const handler = vi.fn()

        scheduler.scheduleJob('test-job', '*/5 * * * *', handler)

        expect(scheduler.getJobs()).toContainEqual(
          expect.objectContaining({ name: 'test-job' })
        )
      })

      it('executes job at scheduled time', async () => {
        const handler = vi.fn().mockResolvedValue(undefined)

        scheduler.scheduleJob('test-job', '* * * * *', handler)
        scheduler.start()

        // Advance time by 1 minute
        vi.advanceTimersByTime(60000)

        await vi.runAllTimersAsync()
        expect(handler).toHaveBeenCalled()
      })
    })

    describe('job failure handling', () => {
      it('logs errors but does not crash', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Job failed'))
        const consoleSpy = vi.spyOn(console, 'error')

        scheduler.scheduleJob('failing-job', '* * * * *', handler)
        scheduler.start()

        vi.advanceTimersByTime(60000)
        await vi.runAllTimersAsync()

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Job failed')
        )
      })
    })

    describe('start/stop', () => {
      it('starts all scheduled jobs', () => {
        scheduler.scheduleJob('job1', '* * * * *', vi.fn())
        scheduler.scheduleJob('job2', '* * * * *', vi.fn())

        scheduler.start()

        expect(scheduler.isRunning()).toBe(true)
      })

      it('stops all scheduled jobs', () => {
        scheduler.scheduleJob('job1', '* * * * *', vi.fn())
        scheduler.start()
        scheduler.stop()

        expect(scheduler.isRunning()).toBe(false)
      })
    })
  })

  describe('DataRefreshJob', () => {
    it('refreshes weather data for all beaches', async () => {
      const weatherService = {
        getWeatherForecast: vi.fn().mockResolvedValue({})
      }
      const job = new DataRefreshJob({ weatherService })

      await job.refreshWeather()

      // 9 beaches
      expect(weatherService.getWeatherForecast).toHaveBeenCalledTimes(9)
    })

    it('refreshes water quality data for all beaches', async () => {
      const waterQualityService = {
        getWaterQuality: vi.fn().mockResolvedValue({})
      }
      const job = new DataRefreshJob({ waterQualityService })

      await job.refreshWaterQuality()

      expect(waterQualityService.getWaterQuality).toHaveBeenCalledTimes(9)
    })

    it('logs job status', async () => {
      const consoleSpy = vi.spyOn(console, 'info')
      const job = new DataRefreshJob({
        weatherService: { getWeatherForecast: vi.fn().mockResolvedValue({}) }
      })

      await job.refreshWeather()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Weather refresh')
      )
    })
  })
  ```
- [ ] Run tests and confirm failure

### 2. Green Phase
- [ ] Implement Scheduler:
  ```typescript
  import cron from 'node-cron'
  import pino from 'pino'

  const logger = pino({ name: 'scheduler' })

  interface ScheduledJob {
    name: string
    cronExpression: string
    task: cron.ScheduledTask | null
    handler: () => Promise<void>
  }

  export class Scheduler {
    private jobs: Map<string, ScheduledJob> = new Map()
    private running = false

    scheduleJob(
      name: string,
      cronExpression: string,
      handler: () => Promise<void>
    ): void {
      this.jobs.set(name, {
        name,
        cronExpression,
        task: null,
        handler
      })
    }

    start(): void {
      if (this.running) return

      this.jobs.forEach((job, name) => {
        job.task = cron.schedule(job.cronExpression, async () => {
          const startTime = Date.now()
          logger.info({ job: name }, `Starting job: ${name}`)

          try {
            await job.handler()
            const duration = Date.now() - startTime
            logger.info({ job: name, duration }, `Job completed: ${name}`)
          } catch (error) {
            logger.error({ job: name, error }, `Job failed: ${name}`)
          }
        })
      })

      this.running = true
      logger.info('Scheduler started')
    }

    stop(): void {
      this.jobs.forEach(job => {
        job.task?.stop()
        job.task = null
      })
      this.running = false
      logger.info('Scheduler stopped')
    }

    isRunning(): boolean {
      return this.running
    }

    getJobs(): ScheduledJob[] {
      return Array.from(this.jobs.values())
    }
  }

  export const scheduler = new Scheduler()
  ```
- [ ] Implement DataRefreshJob:
  ```typescript
  import { beaches } from '@van-beaches/shared/data'
  import { weatherService } from '../services/weatherService'
  import { waterQualityService } from '../services/waterQualityService'
  import pino from 'pino'

  const logger = pino({ name: 'data-refresh-job' })

  export class DataRefreshJob {
    async refreshWeather(): Promise<void> {
      logger.info('Weather refresh started')
      const startTime = Date.now()

      const results = await Promise.allSettled(
        beaches.map(beach =>
          weatherService.getWeatherForecast(
            beach.location.latitude,
            beach.location.longitude
          )
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      const duration = Date.now() - startTime
      logger.info({ succeeded, failed, duration }, 'Weather refresh completed')
    }

    async refreshWaterQuality(): Promise<void> {
      logger.info('Water quality refresh started')
      const startTime = Date.now()

      const results = await Promise.allSettled(
        beaches.map(beach =>
          waterQualityService.getWaterQuality(beach.name)
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      const duration = Date.now() - startTime
      logger.info({ succeeded, failed, duration }, 'Water quality refresh completed')
    }
  }

  export const dataRefreshJob = new DataRefreshJob()
  ```
- [ ] Wire up scheduler in server startup:
  ```typescript
  // In server/src/index.ts
  import { scheduler } from './jobs/scheduler'
  import { dataRefreshJob } from './jobs/dataRefreshJob'

  // Schedule jobs
  scheduler.scheduleJob('weather-refresh', '*/30 * * * *', () =>
    dataRefreshJob.refreshWeather()
  )
  scheduler.scheduleJob('water-quality-refresh', '0 */6 * * *', () =>
    dataRefreshJob.refreshWaterQuality()
  )

  // Start scheduler when server starts
  scheduler.start()
  ```
- [ ] Run tests and confirm they pass

### 3. Refactor Phase
- [ ] Verify jobs run at scheduled intervals
- [ ] Verify cache updated proactively
- [ ] Verify job failures logged but don't crash server
- [ ] Confirm added tests pass

## Completion Criteria

- [ ] Jobs run at scheduled intervals (30min weather, 6hr water quality)
- [ ] Cache updated proactively
- [ ] Job failures logged, do not crash server
- [ ] Job status logging implemented
- [ ] Unit tests pass for scheduler logic
- [ ] Verification: L2 (Tests)

## AC References from Design Doc

- AC: "Auto-refresh data at appropriate intervals"
- Component: Scheduler (`/server/src/jobs/scheduler.ts`)
- Background Refresh Flow: Scheduler -> Cron Job -> Refresh All Data -> Update Cache
- Log Events: "Background Job -> INFO -> jobName, duration, itemsProcessed"

## Notes

- Impact scope: Keeps cache fresh proactively
- Constraints: Jobs must not crash server on failure
- Cron expressions: `*/30 * * * *` (every 30 min), `0 */6 * * *` (every 6 hours)
- Use node-cron for scheduling
