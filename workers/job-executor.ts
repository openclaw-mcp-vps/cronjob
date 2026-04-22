import { Worker } from "bullmq";
import { ensureSchema } from "../lib/db";
import { executeJobById } from "../lib/executor";
import { getQueueConnection, hasRedisQueue, type ExecutionQueuePayload } from "../lib/queue";
import { runSchedulerTick, startScheduler, stopScheduler } from "../lib/scheduler";

const runOnce = process.argv.includes("--once");

async function run(): Promise<void> {
  await ensureSchema();

  if (runOnce) {
    await runSchedulerTick();
    process.exit(0);
  }

  startScheduler();

  if (!hasRedisQueue()) {
    console.warn("[worker] REDIS_URL is not configured. Scheduler will run with inline execution mode.");
    return;
  }

  const connection = getQueueConnection();
  if (!connection) {
    throw new Error("Expected a Redis connection when queue is enabled");
  }

  const worker = new Worker<ExecutionQueuePayload>(
    "cronjob-executions",
    async (job) => {
      await executeJobById(job.data.jobId, job.data.triggeredBy);
    },
    {
      connection,
      concurrency: Number(process.env.WORKER_CONCURRENCY ?? 10)
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] completed ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker] failed ${job?.id}: ${error.message}`);
  });

  const shutdown = async () => {
    stopScheduler();
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void run();
