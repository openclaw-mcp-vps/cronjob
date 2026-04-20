import axios from "axios";

import {
  createExecutionLog,
  ensureDataFiles,
  findUserById,
  finishExecutionLog,
  getJobById,
  updateJobLastRun
} from "@/lib/db";
import { sendFailureNotifications } from "@/lib/notifications";

type RunContext = {
  trigger: "scheduled" | "manual" | "retry";
  attempt?: number;
};

function stringifyBody(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, 10_000);
  }

  return JSON.stringify(value).slice(0, 10_000);
}

function parseRequestBody(input?: string) {
  if (!input) {
    return undefined;
  }

  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

export async function runJobById(jobId: string, context: RunContext) {
  await ensureDataFiles();

  const job = await getJobById(jobId);

  if (!job) {
    throw new Error("Job not found.");
  }

  const user = await findUserById(job.userId);

  if (!user) {
    throw new Error("Job owner no longer exists.");
  }

  const log = await createExecutionLog({
    attempt: context.attempt ?? 1,
    jobId: job.id,
    trigger: context.trigger,
    userId: job.userId
  });

  try {
    const response = await axios.request({
      url: job.webhookUrl,
      method: job.method,
      headers: {
        "Content-Type": "application/json",
        ...job.headers
      },
      data: parseRequestBody(job.body),
      timeout: job.timeoutMs,
      validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Endpoint responded with ${response.status}.`);
    }

    await updateJobLastRun(job.id, new Date().toISOString());

    const success = await finishExecutionLog(log.id, {
      status: "success",
      httpStatus: response.status,
      responseBody: stringifyBody(response.data)
    });

    if (!success) {
      throw new Error("Unable to update execution log.");
    }

    return success;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution error";

    const responseStatus = axios.isAxiosError(error) ? error.response?.status : undefined;
    const responseBody = axios.isAxiosError(error) ? stringifyBody(error.response?.data ?? "") : undefined;

    const failure = await finishExecutionLog(log.id, {
      status: "failed",
      error: message,
      httpStatus: responseStatus,
      responseBody
    });

    if (failure) {
      await sendFailureNotifications({
        job,
        log: failure,
        user,
        errorMessage: message
      });

      return failure;
    }

    throw error;
  }
}
