import { randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { getNextRunAt, isValidCronExpression } from "@/lib/cron";
import { query } from "@/lib/db";
import type { ExecutionRecord, JobRecord, JobMethod } from "@/lib/types";

const methodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const createJobSchema = z.object({
  name: z.string().min(3).max(120),
  schedule: z
    .string()
    .min(9)
    .refine((value) => isValidCronExpression(value), "Invalid cron expression"),
  timezone: z.string().min(1).max(64).default("UTC"),
  targetUrl: z.string().url(),
  method: methodSchema.default("POST"),
  payload: z.record(z.unknown()).default({}),
  headers: z.record(z.string()).default({}),
  active: z.boolean().default(true),
  failureWebhookUrl: z.string().url().nullable().optional(),
  notifyEmail: z.string().email().nullable().optional(),
  webhookToken: z.string().min(8).optional()
});

export const updateJobSchema = createJobSchema.partial().extend({
  regenerateWebhookToken: z.boolean().optional()
});

interface JobRow {
  id: string;
  name: string;
  schedule: string;
  timezone: string;
  target_url: string;
  method: JobMethod;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  active: boolean;
  failure_webhook_url: string | null;
  notify_email: string | null;
  webhook_token: string;
  consecutive_failures: number;
  last_run_at: Date | null;
  next_run_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ExecutionRow {
  id: number;
  job_id: string;
  status: "running" | "success" | "failed";
  triggered_by: "scheduler" | "manual" | "webhook";
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
}

export function mapJobRow(row: JobRow): JobRecord {
  return {
    id: row.id,
    name: row.name,
    schedule: row.schedule,
    timezone: row.timezone,
    targetUrl: row.target_url,
    method: row.method,
    payload: row.payload ?? {},
    headers: row.headers ?? {},
    active: row.active,
    failureWebhookUrl: row.failure_webhook_url,
    notifyEmail: row.notify_email,
    webhookToken: row.webhook_token,
    consecutiveFailures: row.consecutive_failures,
    lastRunAt: row.last_run_at?.toISOString() ?? null,
    nextRunAt: row.next_run_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export function mapExecutionRow(row: ExecutionRow): ExecutionRecord {
  return {
    id: row.id,
    jobId: row.job_id,
    status: row.status,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    durationMs: row.duration_ms,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    errorMessage: row.error_message
  };
}

export async function fetchJobs(): Promise<JobRecord[]> {
  const result = await query<JobRow>(`SELECT * FROM jobs ORDER BY created_at DESC`);
  return result.rows.map(mapJobRow);
}

export async function fetchJobById(id: string): Promise<JobRecord | null> {
  const result = await query<JobRow>(`SELECT * FROM jobs WHERE id = $1 LIMIT 1`, [id]);
  const row = result.rows[0];
  return row ? mapJobRow(row) : null;
}

export async function fetchExecutionsForJob(id: string, limit = 50): Promise<ExecutionRecord[]> {
  const result = await query<ExecutionRow>(
    `
      SELECT *
      FROM job_executions
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `,
    [id, limit]
  );

  return result.rows.map(mapExecutionRow);
}

export async function createJob(input: z.infer<typeof createJobSchema>): Promise<JobRecord> {
  const now = new Date();
  const id = randomUUID();
  const nextRunAt = getNextRunAt(input.schedule, now);
  const webhookToken = input.webhookToken ?? randomBytes(16).toString("hex");

  const result = await query<JobRow>(
    `
      INSERT INTO jobs (
        id,
        name,
        schedule,
        timezone,
        target_url,
        method,
        payload,
        headers,
        active,
        failure_webhook_url,
        notify_email,
        webhook_token,
        next_run_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        $8::jsonb,
        $9,
        $10,
        $11,
        $12,
        $13,
        NOW(),
        NOW()
      )
      RETURNING *
    `,
    [
      id,
      input.name,
      input.schedule,
      input.timezone,
      input.targetUrl,
      input.method,
      JSON.stringify(input.payload),
      JSON.stringify(input.headers),
      input.active,
      input.failureWebhookUrl ?? null,
      input.notifyEmail ?? null,
      webhookToken,
      nextRunAt
    ]
  );

  return mapJobRow(result.rows[0]);
}

export async function updateJob(id: string, input: z.infer<typeof updateJobSchema>): Promise<JobRecord | null> {
  const existingResult = await query<JobRow>(`SELECT * FROM jobs WHERE id = $1 LIMIT 1`, [id]);
  const existing = existingResult.rows[0];

  if (!existing) {
    return null;
  }

  const mergedSchedule = input.schedule ?? existing.schedule;
  const nextRunAt = getNextRunAt(mergedSchedule, new Date());

  const result = await query<JobRow>(
    `
      UPDATE jobs
      SET name = $2,
          schedule = $3,
          timezone = $4,
          target_url = $5,
          method = $6,
          payload = $7::jsonb,
          headers = $8::jsonb,
          active = $9,
          failure_webhook_url = $10,
          notify_email = $11,
          webhook_token = $12,
          next_run_at = $13,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      input.name ?? existing.name,
      mergedSchedule,
      input.timezone ?? existing.timezone,
      input.targetUrl ?? existing.target_url,
      input.method ?? existing.method,
      JSON.stringify(input.payload ?? existing.payload ?? {}),
      JSON.stringify(input.headers ?? existing.headers ?? {}),
      input.active ?? existing.active,
      input.failureWebhookUrl ?? existing.failure_webhook_url,
      input.notifyEmail ?? existing.notify_email,
      input.regenerateWebhookToken
        ? randomBytes(16).toString("hex")
        : input.webhookToken ?? existing.webhook_token,
      nextRunAt
    ]
  );

  return mapJobRow(result.rows[0]);
}

export async function deleteJob(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM jobs WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
