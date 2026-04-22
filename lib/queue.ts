import { Queue } from "bullmq";
import IORedis from "ioredis";
import { executeJobById } from "@/lib/executor";

export interface ExecutionQueuePayload {
  jobId: string;
  triggeredBy: "scheduler" | "manual" | "webhook";
}

declare global {
  // eslint-disable-next-line no-var
  var __cronjobRedisConnection: IORedis | undefined;
  // eslint-disable-next-line no-var
  var __cronjobQueue: Queue<ExecutionQueuePayload> | undefined;
}

const redisUrl = process.env.REDIS_URL;

const connection: IORedis | null = redisUrl
  ? (global.__cronjobRedisConnection ??
    new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    }))
  : null;

if (connection && process.env.NODE_ENV !== "production") {
  global.__cronjobRedisConnection = connection;
}

const queue: Queue<ExecutionQueuePayload> | null = connection
  ? (global.__cronjobQueue ??
    new Queue<ExecutionQueuePayload>("cronjob-executions", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 500,
        removeOnFail: 500,
        backoff: {
          type: "exponential",
          delay: 5_000
        }
      }
    }))
  : null;

if (queue && process.env.NODE_ENV !== "production") {
  global.__cronjobQueue = queue;
}

export function hasRedisQueue(): boolean {
  return Boolean(queue);
}

export function getQueueConnection(): IORedis | null {
  return connection ?? null;
}

export async function enqueueExecution(payload: ExecutionQueuePayload): Promise<{ mode: "queue" | "inline" }> {
  if (queue) {
    await queue.add(`job:${payload.jobId}:${Date.now()}`, payload);
    return { mode: "queue" };
  }

  await executeJobById(payload.jobId, payload.triggeredBy);
  return { mode: "inline" };
}
