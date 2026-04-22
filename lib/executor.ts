import axios from "axios";
import { getNextRunAt } from "@/lib/cron";
import { ensureSchema, query } from "@/lib/db";
import { sendFailureNotification } from "@/lib/notifications";

interface JobRow {
  id: string;
  name: string;
  schedule: string;
  target_url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  active: boolean;
  notify_email: string | null;
  failure_webhook_url: string | null;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}...`;
}

function serializeResponseBody(data: unknown): string {
  if (typeof data === "string") {
    return truncate(data, 4_000);
  }

  try {
    return truncate(JSON.stringify(data), 4_000);
  } catch {
    return "[unserializable response body]";
  }
}

export async function executeJobById(
  jobId: string,
  triggeredBy: "scheduler" | "manual" | "webhook"
): Promise<{ executionId?: number; status: "skipped" | "success" | "failed" }> {
  await ensureSchema();

  const jobResult = await query<JobRow>(`SELECT * FROM jobs WHERE id = $1 LIMIT 1`, [jobId]);
  const job = jobResult.rows[0];

  if (!job || !job.active) {
    return { status: "skipped" };
  }

  const startTime = new Date();

  const executionInsert = await query<{ id: number }>(
    `
      INSERT INTO job_executions (job_id, status, triggered_by, started_at)
      VALUES ($1, 'running', $2, $3)
      RETURNING id
    `,
    [job.id, triggeredBy, startTime]
  );

  const executionId = executionInsert.rows[0].id;

  try {
    const response = await axios.request({
      url: job.target_url,
      method: job.method,
      data: job.method === "GET" || job.method === "DELETE" ? undefined : job.payload,
      headers: {
        "Content-Type": "application/json",
        "X-Cronjob-Id": job.id,
        "X-Cronjob-Execution-Id": String(executionId),
        ...job.headers
      },
      timeout: 30_000,
      validateStatus: () => true
    });

    const finishTime = new Date();
    const durationMs = finishTime.getTime() - startTime.getTime();
    const responseBody = serializeResponseBody(response.data);
    const status = response.status >= 200 && response.status < 300 ? "success" : "failed";

    await query(
      `
        UPDATE job_executions
        SET status = $1,
            finished_at = $2,
            duration_ms = $3,
            response_status = $4,
            response_body = $5,
            error_message = $6
        WHERE id = $7
      `,
      [
        status,
        finishTime,
        durationMs,
        response.status,
        responseBody,
        status === "failed" ? `Unexpected status code ${response.status}` : null,
        executionId
      ]
    );

    const nextRunAt = getNextRunAt(job.schedule, new Date());

    await query(
      `
        UPDATE jobs
        SET last_run_at = $2,
            next_run_at = $3,
            consecutive_failures = CASE WHEN $4 = 'success' THEN 0 ELSE consecutive_failures + 1 END,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.id, finishTime, nextRunAt, status]
    );

    if (status === "failed") {
      await sendFailureNotification({
        jobId: job.id,
        jobName: job.name,
        errorMessage: `Unexpected status code ${response.status}`,
        notifyEmail: job.notify_email,
        failureWebhookUrl: job.failure_webhook_url,
        executionId,
        responseStatus: response.status
      });
      return { executionId, status: "failed" };
    }

    return { executionId, status: "success" };
  } catch (error) {
    const finishTime = new Date();
    const durationMs = finishTime.getTime() - startTime.getTime();
    const message = error instanceof Error ? error.message : "Unknown execution error";
    const nextRunAt = getNextRunAt(job.schedule, new Date());

    await query(
      `
        UPDATE job_executions
        SET status = 'failed',
            finished_at = $2,
            duration_ms = $3,
            error_message = $4
        WHERE id = $1
      `,
      [executionId, finishTime, durationMs, truncate(message, 4_000)]
    );

    await query(
      `
        UPDATE jobs
        SET last_run_at = $2,
            next_run_at = $3,
            consecutive_failures = consecutive_failures + 1,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.id, finishTime, nextRunAt]
    );

    await sendFailureNotification({
      jobId: job.id,
      jobName: job.name,
      errorMessage: message,
      notifyEmail: job.notify_email,
      failureWebhookUrl: job.failure_webhook_url,
      executionId
    });

    return { executionId, status: "failed" };
  }
}
