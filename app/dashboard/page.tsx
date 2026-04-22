import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheckBig, Clock10 } from "lucide-react";
import { ensureSchema, query } from "@/lib/db";

interface OverviewRow {
  total_jobs: number;
  active_jobs: number;
  failed_24h: number;
  success_24h: number;
}

interface RecentFailureRow {
  job_name: string;
  started_at: Date;
  error_message: string | null;
  response_status: number | null;
}

export default async function DashboardOverviewPage() {
  await ensureSchema();

  const overviewResult = await query<OverviewRow>(
    `
      SELECT
        (SELECT COUNT(*)::int FROM jobs) AS total_jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE active = TRUE) AS active_jobs,
        (
          SELECT COUNT(*)::int
          FROM job_executions
          WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours'
        ) AS failed_24h,
        (
          SELECT COUNT(*)::int
          FROM job_executions
          WHERE status = 'success' AND started_at >= NOW() - INTERVAL '24 hours'
        ) AS success_24h
    `
  );

  const recentFailuresResult = await query<RecentFailureRow>(
    `
      SELECT
        j.name AS job_name,
        e.started_at,
        e.error_message,
        e.response_status
      FROM job_executions e
      JOIN jobs j ON j.id = e.job_id
      WHERE e.status = 'failed'
      ORDER BY e.started_at DESC
      LIMIT 6
    `
  );

  const stats = overviewResult.rows[0] ?? {
    total_jobs: 0,
    active_jobs: 0,
    failed_24h: 0,
    success_24h: 0
  };

  const totalRuns = stats.success_24h + stats.failed_24h;
  const successRate = totalRuns ? Math.round((stats.success_24h / totalRuns) * 100) : 100;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-sm text-slate-400">Total Jobs</p>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total_jobs}</p>
        </article>
        <article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm text-emerald-300">Active Jobs</p>
          <p className="mt-2 text-3xl font-bold text-emerald-100">{stats.active_jobs}</p>
        </article>
        <article className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
          <p className="text-sm text-sky-300">24h Success Rate</p>
          <p className="mt-2 text-3xl font-bold text-sky-100">{successRate}%</p>
        </article>
        <article className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
          <p className="text-sm text-rose-300">Failures (24h)</p>
          <p className="mt-2 text-3xl font-bold text-rose-100">{stats.failed_24h}</p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-[var(--font-heading)] text-xl font-bold text-white">Incident Radar</h2>
          <p className="mt-2 text-sm text-slate-400">
            Last failed executions are listed here so you can investigate quickly before downstream tasks pile up.
          </p>

          <div className="mt-5 space-y-3">
            {recentFailuresResult.rows.length ? (
              recentFailuresResult.rows.map((row, index) => (
                <div key={`${row.job_name}-${index}`} className="rounded-xl border border-slate-800 bg-[#0d1522] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-white">{row.job_name}</p>
                    <span className="font-mono text-xs text-slate-500">{new Date(row.started_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-rose-300">
                    {row.error_message ?? `Task returned HTTP ${row.response_status ?? "unknown"}`}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                No recent failures. Scheduler is healthy.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-[var(--font-heading)] text-xl font-bold text-white">Fast Actions</h2>
          <div className="mt-5 space-y-3">
            <Link
              href="/dashboard/jobs"
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-[#0d1522] p-4 text-slate-200 transition hover:border-slate-500"
            >
              <span className="inline-flex items-center gap-2">
                <Clock10 className="h-4 w-4 text-emerald-300" />
                Create or edit scheduled jobs
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/logs"
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-[#0d1522] p-4 text-slate-200 transition hover:border-slate-500"
            >
              <span className="inline-flex items-center gap-2">
                <CircleCheckBig className="h-4 w-4 text-cyan-300" />
                Review execution logs and latency
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/jobs"
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-[#0d1522] p-4 text-slate-200 transition hover:border-slate-500"
            >
              <span className="inline-flex items-center gap-2">
                <CircleAlert className="h-4 w-4 text-amber-300" />
                Set failure webhooks for on-call alerts
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
