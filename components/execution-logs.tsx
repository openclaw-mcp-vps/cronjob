"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertOctagon, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface ExecutionLog {
  id: number;
  jobId: string;
  jobName: string;
  status: "running" | "success" | "failed";
  triggeredBy: "scheduler" | "manual" | "webhook";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
}

function prettyDuration(durationMs: number | null): string {
  if (!durationMs) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

function prettyDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function ExecutionLogs() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/logs?limit=100", {
        cache: "no-store"
      });

      const payload = (await response.json()) as { logs?: ExecutionLog[]; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not load logs");
        return;
      }

      setLogs(payload.logs ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchLogs();
    }, 5_000);

    return () => clearInterval(interval);
  }, [fetchLogs]);

  const stats = useMemo(() => {
    return logs.reduce(
      (accumulator, item) => {
        if (item.status === "success") accumulator.success += 1;
        if (item.status === "failed") accumulator.failed += 1;
        if (item.status === "running") accumulator.running += 1;
        return accumulator;
      },
      { success: 0, failed: 0, running: 0 }
    );
  }, [logs]);

  const chartData = useMemo(
    () => [
      { label: "Success", value: stats.success, fill: "#22c55e" },
      { label: "Failed", value: stats.failed, fill: "#ef4444" },
      { label: "Running", value: stats.running, fill: "#38bdf8" }
    ],
    [stats]
  );

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-heading)] text-xl font-bold text-white">Execution Logs</h2>
          <p className="text-sm text-slate-400">Live execution feed with status, latency, and responses.</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLogs()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Success</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-emerald-200">
            <CheckCircle2 className="h-5 w-5" /> {stats.success}
          </p>
        </article>
        <article className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Failed</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-rose-200">
            <AlertOctagon className="h-5 w-5" /> {stats.failed}
          </p>
        </article>
        <article className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Running</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-sky-200">
            <Activity className="h-5 w-5" /> {stats.running}
          </p>
        </article>
      </div>

      <div className="h-64 rounded-xl border border-slate-800 bg-[#0b121d] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="#94a3b8" />
            <YAxis allowDecimals={false} stroke="#94a3b8" />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.08)" }}
              contentStyle={{
                background: "#0f172a",
                borderColor: "#334155",
                borderRadius: 8
              }}
            />
            <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? <p className="text-sm text-slate-400">Loading logs...</p> : null}

      <div className="max-h-[560px] overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-[#0b121d] text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Triggered By</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">HTTP</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="bg-[#0f1722] align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-100">{log.jobName}</p>
                  <p className="font-mono text-xs text-slate-500">{log.jobId}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      log.status === "success"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : log.status === "failed"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-sky-500/20 text-sky-300"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{log.triggeredBy}</td>
                <td className="px-4 py-3 text-slate-300">{prettyDate(log.startedAt)}</td>
                <td className="px-4 py-3 text-slate-300">{prettyDuration(log.durationMs)}</td>
                <td className="px-4 py-3 text-slate-300">{log.responseStatus ?? "-"}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {log.errorMessage ? (
                    <p className="max-w-md whitespace-pre-wrap text-rose-300">{log.errorMessage}</p>
                  ) : (
                    <p className="max-w-md whitespace-pre-wrap">{log.responseBody ?? "No response body captured"}</p>
                  )}
                </td>
              </tr>
            ))}

            {!logs.length && !loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  No execution history yet. Run a job or wait for the scheduler.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
