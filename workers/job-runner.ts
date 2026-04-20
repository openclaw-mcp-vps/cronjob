import { ensureDataFiles } from "@/lib/db";
import { getExecutionQueue, processQueueJob, startScheduler, stopScheduler } from "@/lib/scheduler";

async function bootstrap() {
  await ensureDataFiles();

  const queue = getExecutionQueue();

  if (queue) {
    queue.process(5, async (job) => processQueueJob(job));
  }

  const state = await startScheduler(30_000);

  console.log(
    `[worker] started | scheduled=${state.jobsScheduled} | queue=${state.usingQueue ? "redis" : "direct"}`
  );
}

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down`);
  await stopScheduler();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  console.error("[worker] failed to start", error);
  process.exit(1);
});
