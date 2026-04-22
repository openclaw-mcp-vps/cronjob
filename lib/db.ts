import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __cronjobPool: Pool | undefined;
}

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/cronjob";

const pool =
  global.__cronjobPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

if (process.env.NODE_ENV !== "production") {
  global.__cronjobPool = pool;
}

let schemaInitPromise: Promise<void> | null = null;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = initializeSchema();
  }

  return schemaInitPromise;
}

async function initializeSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      target_url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'POST',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      headers JSONB NOT NULL DEFAULT '{}'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      failure_webhook_url TEXT,
      notify_email TEXT,
      webhook_token TEXT NOT NULL,
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS job_executions (
      id BIGSERIAL PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ,
      duration_ms INTEGER,
      response_status INTEGER,
      response_body TEXT,
      error_message TEXT
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS paid_customers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      last_event_id TEXT,
      purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS jobs_webhook_token_idx ON jobs(webhook_token);`);
  await query(`CREATE INDEX IF NOT EXISTS jobs_next_run_at_idx ON jobs(next_run_at) WHERE active = TRUE;`);
  await query(`CREATE INDEX IF NOT EXISTS executions_job_id_started_at_idx ON job_executions(job_id, started_at DESC);`);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
