import { NextResponse, type NextRequest } from "next/server";
import { assertApiAccess } from "@/lib/auth";
import { ensureSchema, query } from "@/lib/db";

interface LogRow {
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
  name: string;
}

export async function GET(request: NextRequest) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  await ensureSchema();

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const jobId = url.searchParams.get("jobId");

  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

  const result = await query<LogRow>(
    `
      SELECT e.*, j.name
      FROM job_executions e
      JOIN jobs j ON j.id = e.job_id
      WHERE ($1::text IS NULL OR e.job_id = $1)
      ORDER BY e.started_at DESC
      LIMIT $2
    `,
    [jobId, safeLimit]
  );

  const logs = result.rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    jobName: row.name,
    status: row.status,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
    durationMs: row.duration_ms,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    errorMessage: row.error_message
  }));

  return NextResponse.json({ logs });
}
