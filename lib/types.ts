export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  notificationEmail: string;
  defaultFailureWebhookUrl?: string;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobRecord = {
  id: string;
  userId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  webhookUrl: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  failureWebhookUrl?: string;
  timeoutMs: number;
  maxRetries: number;
  active: boolean;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecutionStatus = "running" | "success" | "failed";

export type ExecutionLogRecord = {
  id: string;
  jobId: string;
  userId: string;
  trigger: "scheduled" | "manual" | "retry";
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  status: ExecutionStatus;
  attempt: number;
  httpStatus?: number;
  responseBody?: string;
  error?: string;
};
