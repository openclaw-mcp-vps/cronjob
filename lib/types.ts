export type JobMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JobRecord {
  id: string;
  name: string;
  schedule: string;
  timezone: string;
  targetUrl: string;
  method: JobMethod;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  active: boolean;
  failureWebhookUrl: string | null;
  notifyEmail: string | null;
  webhookToken: string;
  consecutiveFailures: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = "running" | "success" | "failed";

export interface ExecutionRecord {
  id: number;
  jobId: string;
  status: ExecutionStatus;
  triggeredBy: "scheduler" | "manual" | "webhook";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
}
