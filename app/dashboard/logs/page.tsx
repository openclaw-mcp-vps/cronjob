import { ExecutionLogs } from "@/components/ExecutionLogs";
import { requirePaidUser } from "@/lib/auth";
import { ensureDataFiles, listExecutionLogsByUser, listJobsByUser } from "@/lib/db";

export default async function DashboardLogsPage() {
  const session = await requirePaidUser();
  await ensureDataFiles();

  const [logs, jobs] = await Promise.all([
    listExecutionLogsByUser(session.user.id, 200),
    listJobsByUser(session.user.id)
  ]);

  const jobNameById = new Map(jobs.map((job) => [job.id, job.name]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    jobName: jobNameById.get(log.jobId) ?? "Unknown Job"
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f6fc]">Execution Logs</h1>
        <p className="mt-2 text-[#8b949e]">
          Track every run across all jobs with response status, duration, and failure context.
        </p>
      </div>
      <ExecutionLogs initialLogs={enrichedLogs} />
    </div>
  );
}
