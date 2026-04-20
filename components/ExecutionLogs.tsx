"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { ExecutionLogRecord } from "@/lib/types";

type ExecutionLogWithJobName = ExecutionLogRecord & {
  jobName: string;
};

type ExecutionLogsProps = {
  initialLogs: ExecutionLogWithJobName[];
};

export function ExecutionLogs({ initialLogs }: ExecutionLogsProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const success = logs.filter((log) => log.status === "success").length;
    const failed = logs.filter((log) => log.status === "failed").length;
    return { success, failed };
  }, [logs]);

  async function refreshLogs() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/logs", { cache: "no-store" });
      const data = (await response.json()) as { logs?: ExecutionLogWithJobName[]; message?: string };

      if (!response.ok || !data.logs) {
        setError(data.message ?? "Unable to load execution logs.");
        return;
      }

      setLogs(data.logs);
    } catch {
      setError("Network error while refreshing logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <CardTitle>Execution Logs</CardTitle>
          <CardDescription>
            {stats.success} successful runs and {stats.failed} failed runs in the recent history.
          </CardDescription>
        </div>
        <Button variant="secondary" onClick={refreshLogs} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-4 text-sm text-[#f85149]">{error}</p> : null}
        {!logs.length ? (
          <p className="text-sm text-[#8b949e]">No executions yet. Trigger a run from Jobs to see data here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#30363d] text-xs uppercase tracking-wider text-[#8b949e]">
                  <th className="py-3 pr-4">Job</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Trigger</th>
                  <th className="py-3 pr-4">Started</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3 pr-4">HTTP</th>
                  <th className="py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#21262d] align-top text-[#c9d1d9]">
                    <td className="py-3 pr-4 font-medium text-[#e6edf3]">{log.jobName}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={
                          log.status === "success"
                            ? "border-[#238636] text-[#3fb950]"
                            : log.status === "failed"
                              ? "border-[#da3633] text-[#f85149]"
                              : "text-[#8b949e]"
                        }
                      >
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{log.trigger}</td>
                    <td className="py-3 pr-4">{formatDateTime(log.startedAt)}</td>
                    <td className="py-3 pr-4">{typeof log.durationMs === "number" ? `${log.durationMs} ms` : "-"}</td>
                    <td className="py-3 pr-4">{log.httpStatus ?? "-"}</td>
                    <td className="max-w-sm py-3 text-xs text-[#8b949e]">{log.error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
