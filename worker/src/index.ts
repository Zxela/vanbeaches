interface Env {
  BEACH_CACHE: KVNamespace;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    switch (event.cron) {
      case "*/30 * * * *":
        console.log("Cron triggered: weather refresh (every 30 min)");
        break;
      case "0 * * * *":
        console.log("Cron triggered: tide refresh (every 60 min)");
        break;
      case "0 */6 * * *":
        console.log("Cron triggered: water quality refresh (every 6 hours)");
        break;
      default:
        console.log(`Unknown cron pattern: ${event.cron}`);
    }
  },
};
