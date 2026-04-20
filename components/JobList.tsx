"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { JobRecord } from "@/lib/types";

type JobListProps = {
  initialJobs: JobRecord[];
};

export function JobList({ initialJobs }: JobListProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [jobs]
  );

  async function toggleJob(job: JobRecord) {
    setBusyJobId(job.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ active: !job.active })
      });

      const data = (await response.json()) as { message?: string; job?: JobRecord };

      if (!response.ok || !data.job) {
        setMessage(data.message ?? "Unable to update job status.");
        return;
      }

      setJobs((prev) => prev.map((item) => (item.id === job.id ? data.job! : item)));
    } finally {
      setBusyJobId(null);
    }
  }

  async function runNow(job: JobRecord) {
    setBusyJobId(job.id);
    setMessage(null);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ jobId: job.id })
      });

      const data = (await response.json()) as { message?: string; log?: { status: string } };

      if (!response.ok) {
        setMessage(data.message ?? "Job execution failed to start.");
        return;
      }

      setMessage(
        data.log?.status === "success"
          ? `Executed ${job.name} successfully.`
          : `${job.name} executed but returned a failure. Check logs.`
      );

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                lastRunAt: new Date().toISOString()
              }
            : item
        )
      );
    } finally {
      setBusyJobId(null);
    }
  }

  async function removeJob(job: JobRecord) {
    const confirmed = window.confirm(`Delete ${job.name}? This also removes its execution logs.`);

    if (!confirmed) {
      return;
    }

    setBusyJobId(job.id);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        setMessage("Unable to delete job.");
        return;
      }

      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      setMessage(`Deleted ${job.name}.`);
    } finally {
      setBusyJobId(null);
    }
  }

  if (!sortedJobs.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No jobs yet</CardTitle>
          <CardDescription>Create your first recurring task to start monitoring scheduled work.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-[#8b949e]">{message}</p> : null}
      {sortedJobs.map((job) => (
        <Card key={job.id}>
          <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base md:text-lg">{job.name}</CardTitle>
              <CardDescription className="break-all">{job.webhookUrl}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={job.active ? "border-[#238636] text-[#3fb950]" : "text-[#8b949e]"}>
                {job.active ? "Active" : "Paused"}
              </Badge>
              <Badge>{job.method}</Badge>
              <Badge>{job.cronExpression}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#8b949e]">
            <div className="grid gap-1 md:grid-cols-2">
              <p>
                Timezone: <span className="text-[#c9d1d9]">{job.timezone}</span>
              </p>
              <p>
                Last run:{" "}
                <span className="text-[#c9d1d9]">
                  {job.lastRunAt ? formatDateTime(job.lastRunAt) : "No executions yet"}
                </span>
              </p>
              <p>
                Timeout: <span className="text-[#c9d1d9]">{job.timeoutMs}ms</span>
              </p>
              <p>
                Retries: <span className="text-[#c9d1d9]">{job.maxRetries}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={busyJobId === job.id}
                onClick={() => {
                  void toggleJob(job);
                }}
              >
                {job.active ? "Pause" : "Activate"}
              </Button>
              <Button
                size="sm"
                disabled={busyJobId === job.id}
                onClick={() => {
                  void runNow(job);
                }}
              >
                Run now
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busyJobId === job.id}
                onClick={() => {
                  void removeJob(job);
                }}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
