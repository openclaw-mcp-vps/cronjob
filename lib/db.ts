import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ExecutionLogRecord, JobRecord, UserRecord } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const LOGS_FILE = path.join(DATA_DIR, "execution-logs.json");

let mutationQueue: Promise<unknown> = Promise.resolve();

async function queueMutation<T>(task: () => Promise<T>) {
  const run = mutationQueue.then(task, task);
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

async function ensureFile(filePath: string) {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, "[]\n", "utf8");
  }
}

export async function ensureDataFiles() {
  await Promise.all([ensureFile(USERS_FILE), ensureFile(JOBS_FILE), ensureFile(LOGS_FILE)]);
}

async function readCollection<T>(filePath: string): Promise<T[]> {
  await ensureFile(filePath);
  const raw = await readFile(filePath, "utf8");

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

async function writeCollection<T>(filePath: string, data: T[]) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, savedHash: string) {
  const [salt, stored] = savedHash.split(":");

  if (!salt || !stored) {
    return false;
  }

  const derived = scryptSync(password, salt, 64).toString("hex");

  if (derived.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(stored, "hex"));
}

export async function listUsers() {
  return readCollection<UserRecord>(USERS_FILE);
}

export async function findUserByEmail(email: string) {
  const users = await listUsers();
  const normalized = normalizeEmail(email);
  return users.find((user) => user.email === normalized) ?? null;
}

export async function findUserById(userId: string) {
  const users = await listUsers();
  return users.find((user) => user.id === userId) ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  notificationEmail?: string;
}) {
  return queueMutation(async () => {
    const users = await listUsers();
    const normalized = normalizeEmail(input.email);

    if (users.some((user) => user.email === normalized)) {
      throw new Error("A user with this email already exists.");
    }

    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email: normalized,
      passwordHash: hashPassword(input.password),
      notificationEmail: normalizeEmail(input.notificationEmail ?? input.email),
      paid: false,
      createdAt: now,
      updatedAt: now
    };

    users.push(user);
    await writeCollection(USERS_FILE, users);

    return user;
  });
}

export async function updateUser(userId: string, updates: Partial<UserRecord>) {
  return queueMutation(async () => {
    const users = await listUsers();
    const index = users.findIndex((user) => user.id === userId);

    if (index === -1) {
      return null;
    }

    const next: UserRecord = {
      ...users[index],
      ...updates,
      email: updates.email ? normalizeEmail(updates.email) : users[index].email,
      updatedAt: new Date().toISOString()
    };

    users[index] = next;
    await writeCollection(USERS_FILE, users);

    return next;
  });
}

export async function verifyUserPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function markUserPaidByEmail(email: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  return updateUser(user.id, { paid: true });
}

export async function listJobsByUser(userId: string) {
  const jobs = await readCollection<JobRecord>(JOBS_FILE);
  return jobs
    .filter((job) => job.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listActiveJobs() {
  const jobs = await readCollection<JobRecord>(JOBS_FILE);
  return jobs.filter((job) => job.active);
}

export async function getJobById(jobId: string) {
  const jobs = await readCollection<JobRecord>(JOBS_FILE);
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function createJob(input: Omit<JobRecord, "id" | "createdAt" | "updatedAt">) {
  return queueMutation(async () => {
    const jobs = await readCollection<JobRecord>(JOBS_FILE);
    const now = new Date().toISOString();

    const job: JobRecord = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    jobs.push(job);
    await writeCollection(JOBS_FILE, jobs);

    return job;
  });
}

export async function updateJob(jobId: string, updates: Partial<JobRecord>) {
  return queueMutation(async () => {
    const jobs = await readCollection<JobRecord>(JOBS_FILE);
    const index = jobs.findIndex((job) => job.id === jobId);

    if (index === -1) {
      return null;
    }

    const next: JobRecord = {
      ...jobs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    jobs[index] = next;
    await writeCollection(JOBS_FILE, jobs);

    return next;
  });
}

export async function deleteJob(jobId: string) {
  return queueMutation(async () => {
    const jobs = await readCollection<JobRecord>(JOBS_FILE);
    const index = jobs.findIndex((job) => job.id === jobId);

    if (index === -1) {
      return false;
    }

    jobs.splice(index, 1);
    await writeCollection(JOBS_FILE, jobs);

    const logs = await readCollection<ExecutionLogRecord>(LOGS_FILE);
    const remainingLogs = logs.filter((log) => log.jobId !== jobId);
    await writeCollection(LOGS_FILE, remainingLogs);

    return true;
  });
}

export async function updateJobLastRun(jobId: string, lastRunAt: string) {
  return updateJob(jobId, { lastRunAt });
}

export async function createExecutionLog(
  input: Omit<ExecutionLogRecord, "id" | "startedAt" | "status">
) {
  return queueMutation(async () => {
    const logs = await readCollection<ExecutionLogRecord>(LOGS_FILE);

    const log: ExecutionLogRecord = {
      ...input,
      id: randomUUID(),
      startedAt: new Date().toISOString(),
      status: "running"
    };

    logs.push(log);
    await writeCollection(LOGS_FILE, logs);

    return log;
  });
}

export async function finishExecutionLog(
  logId: string,
  input: {
    status: "success" | "failed";
    httpStatus?: number;
    responseBody?: string;
    error?: string;
  }
) {
  return queueMutation(async () => {
    const logs = await readCollection<ExecutionLogRecord>(LOGS_FILE);
    const index = logs.findIndex((log) => log.id === logId);

    if (index === -1) {
      return null;
    }

    const finishedAt = new Date().toISOString();
    const startedAtMs = new Date(logs[index].startedAt).getTime();
    const finishedAtMs = new Date(finishedAt).getTime();

    const next: ExecutionLogRecord = {
      ...logs[index],
      ...input,
      finishedAt,
      durationMs: Math.max(finishedAtMs - startedAtMs, 0)
    };

    logs[index] = next;
    await writeCollection(LOGS_FILE, logs);

    return next;
  });
}

export async function listExecutionLogsByUser(userId: string, limit = 100) {
  const logs = await readCollection<ExecutionLogRecord>(LOGS_FILE);

  return logs
    .filter((log) => log.userId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

export async function listExecutionLogsByJob(jobId: string, limit = 50) {
  const logs = await readCollection<ExecutionLogRecord>(LOGS_FILE);

  return logs
    .filter((log) => log.jobId === jobId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}
