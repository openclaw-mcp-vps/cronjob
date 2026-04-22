import cron, { type ScheduledTask } from "node-cron";
import { getNextRunAt } from "@/lib/cron";
import { ensureSchema, query } from "@/lib/db";
import { enqueueExecution } from "@/lib/queue";

interface DueJobRow {
  id: string;
  schedule: string;
}

let schedulerTask: ScheduledTask | null = null;

export function startScheduler(): void {
  if (schedulerTask) {
    return;
  }

  schedulerTask = cron.schedule(
    "* * * * *",
    () => {
      void runSchedulerTick();
    },
    {
      timezone: "UTC"
    }
  );
}

export function stopScheduler(): void {
  if (!schedulerTask) {
    return;
  }

  schedulerTask.stop();
  schedulerTask = null;
}

export async function runSchedulerTick(): Promise<void> {
  await ensureSchema();

  const dueJobsResult = await query<DueJobRow>(
    `
      SELECT id, schedule
      FROM jobs
      WHERE active = TRUE
        AND next_run_at IS NOT NULL
        AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
      LIMIT 100
    `
  );

  for (const job of dueJobsResult.rows) {
    const nextRunAt = getNextRunAt(job.schedule, new Date());

    await query(
      `
        UPDATE jobs
        SET next_run_at = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [job.id, nextRunAt]
    );

    await enqueueExecution({
      jobId: job.id,
      triggeredBy: "scheduler"
    });
  }
}
