import Queue from "bull";
import cron, { type ScheduledTask } from "node-cron";

import { ensureDataFiles, listActiveJobs } from "@/lib/db";
import { runJobById } from "@/lib/executor";

type QueuePayload = {
  jobId: string;
  trigger: "scheduled" | "retry";
};

const scheduledTasks = new Map<string, ScheduledTask>();
let schedulerInterval: NodeJS.Timeout | null = null;
let fingerprint = "";
let executionQueue: Queue.Queue<QueuePayload> | null | undefined;

function buildFingerprint(jobs: Awaited<ReturnType<typeof listActiveJobs>>) {
  return jobs
    .map((job) => [job.id, job.updatedAt, job.cronExpression, job.active ? "1" : "0"].join(":"))
    .sort()
    .join("|");
}

function getQueue() {
  if (executionQueue !== undefined) {
    return executionQueue;
  }

  if (!process.env.REDIS_URL) {
    executionQueue = null;
    return executionQueue;
  }

  executionQueue = new Queue<QueuePayload>("cronjob-executions", process.env.REDIS_URL);

  executionQueue.on("error", (error) => {
    console.error("Queue connection error", error);
  });

  return executionQueue;
}

async function queueExecution(jobId: string, retries: number) {
  const queue = getQueue();

  if (!queue) {
    await runJobById(jobId, { trigger: "scheduled", attempt: 1 });
    return;
  }

  await queue.add(
    { jobId, trigger: "scheduled" },
    {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: retries + 1,
      backoff: {
        type: "exponential",
        delay: 10_000
      }
    }
  );
}

async function syncSchedules() {
  await ensureDataFiles();

  const activeJobs = await listActiveJobs();
  const nextFingerprint = buildFingerprint(activeJobs);

  if (nextFingerprint === fingerprint) {
    return;
  }

  fingerprint = nextFingerprint;
  const activeIds = new Set(activeJobs.map((job) => job.id));

  for (const [jobId, task] of scheduledTasks.entries()) {
    if (!activeIds.has(jobId)) {
      task.stop();
      task.destroy();
      scheduledTasks.delete(jobId);
    }
  }

  for (const job of activeJobs) {
    if (!cron.validate(job.cronExpression)) {
      continue;
    }

    const existing = scheduledTasks.get(job.id);

    if (existing) {
      existing.stop();
      existing.destroy();
    }

    const task = cron.schedule(
      job.cronExpression,
      async () => {
        try {
          await queueExecution(job.id, job.maxRetries);
        } catch (error) {
          console.error(`Failed to enqueue execution for ${job.id}`, error);
        }
      },
      {
        timezone: job.timezone || "UTC"
      }
    );

    scheduledTasks.set(job.id, task);
  }
}

export async function processQueueJob(queueJob: Queue.Job<QueuePayload>) {
  const attempt = queueJob.attemptsMade + 1;
  const trigger = attempt > 1 ? "retry" : queueJob.data.trigger;
  return runJobById(queueJob.data.jobId, { trigger, attempt });
}

export function getExecutionQueue() {
  return getQueue();
}

export async function startScheduler(pollIntervalMs = 30_000) {
  await syncSchedules();

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  schedulerInterval = setInterval(() => {
    syncSchedules().catch((error) => {
      console.error("Scheduler sync failed", error);
    });
  }, pollIntervalMs);

  return {
    jobsScheduled: scheduledTasks.size,
    usingQueue: Boolean(getQueue())
  };
}

export async function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  for (const task of scheduledTasks.values()) {
    task.stop();
    task.destroy();
  }

  scheduledTasks.clear();

  if (executionQueue) {
    await executionQueue.close();
    executionQueue = undefined;
  }
}
