import cron from 'node-cron';

interface Job {
  name: string;
  task: cron.ScheduledTask;
}

const jobs: Job[] = [];

export function scheduleJob(
  name: string,
  cronExpression: string,
  handler: () => Promise<void>,
): void {
  const task = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Running job: ${name}`);
    try {
      await handler();
      console.log(`[Scheduler] Completed: ${name}`);
    } catch (error) {
      console.error(`[Scheduler] Failed: ${name}`, error);
    }
  });
  jobs.push({ name, task });
}

export function startScheduler(): void {
  for (const job of jobs) {
    job.task.start();
  }
  console.log(`[Scheduler] Started ${jobs.length} jobs`);
}

export function stopScheduler(): void {
  for (const job of jobs) {
    job.task.stop();
  }
  console.log('[Scheduler] Stopped all jobs');
}
