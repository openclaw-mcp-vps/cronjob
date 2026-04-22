"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayCircle, RefreshCw, Trash2, Webhook } from "lucide-react";
import type { JobRecord } from "@/lib/types";

interface JobListProps {
  refreshKey: number;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export function JobList({ refreshKey }: JobListProps) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  const totalActiveJobs = useMemo(() => jobs.filter((job) => job.active).length, [jobs]);

  const fetchJobs = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const payload = (await response.json()) as { jobs?: JobRecord[]; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not load jobs.");
        return;
      }

      setJobs(payload.jobs ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function runJob(jobId: string) {
    setPendingJobId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    } finally {
      setPendingJobId(null);
    }
  }

  async function toggleJob(jobId: string, active: boolean) {
    setPendingJobId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active: !active })
      });
      await fetchJobs();
    } finally {
      setPendingJobId(null);
    }
  }

  async function removeJob(jobId: string) {
    setPendingJobId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE"
      });
      await fetchJobs();
    } finally {
      setPendingJobId(null);
    }
  }

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs, refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchJobs();
    }, 6_000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchJobs]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-bold text-white">Scheduled Jobs</h2>
          <p className="text-sm text-slate-400">
            {jobs.length} total jobs, {totalActiveJobs} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchJobs()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading jobs...</p>
      ) : (
        <div className="mt-5 space-y-4">
          {jobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              No jobs created yet. Use the form above to schedule your first task.
            </p>
          ) : null}

          {jobs.map((job) => (
            <article key={job.id} className="rounded-xl border border-slate-800 bg-[#0c1420] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{job.name}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-400">{job.id}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    job.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-600/30 text-slate-300"
                  }`}
                >
                  {job.active ? "Active" : "Paused"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <p>
                  <span className="text-slate-500">Schedule:</span> {job.schedule}
                </p>
                <p>
                  <span className="text-slate-500">Method:</span> {job.method}
                </p>
                <p>
                  <span className="text-slate-500">Next run:</span> {formatDate(job.nextRunAt)}
                </p>
                <p>
                  <span className="text-slate-500">Last run:</span> {formatDate(job.lastRunAt)}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-slate-500">Target:</span> {job.targetUrl}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-slate-500">Webhook trigger:</span>
                  <code className="ml-2 rounded bg-slate-800 px-2 py-1 text-xs text-slate-200">
                    /api/webhooks/execute token={job.webhookToken}
                  </code>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pendingJobId === job.id}
                  onClick={() => void runJob(job.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-70"
                >
                  <PlayCircle className="h-4 w-4" /> Run now
                </button>
                <button
                  type="button"
                  disabled={pendingJobId === job.id}
                  onClick={() => void toggleJob(job.id, job.active)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:opacity-70"
                >
                  {job.active ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  disabled={pendingJobId === job.id}
                  onClick={() => void removeJob(job.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-400 disabled:opacity-70"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Webhook className="h-4 w-4" /> Keep this token private.
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
