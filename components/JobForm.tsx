"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobRecord } from "@/lib/types";

type JobPayload = {
  name: string;
  cronExpression: string;
  timezone: string;
  webhookUrl: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body?: string;
  failureWebhookUrl?: string;
  timeoutMs: number;
  maxRetries: number;
  active: boolean;
};

type JobFormState = {
  name: string;
  cronExpression: string;
  timezone: string;
  webhookUrl: string;
  method: JobPayload["method"];
  headersJson: string;
  body: string;
  failureWebhookUrl: string;
  timeoutMs: number;
  maxRetries: number;
  active: boolean;
};

const initialForm: JobFormState = {
  name: "",
  cronExpression: "*/15 * * * *",
  timezone: "UTC",
  webhookUrl: "",
  method: "POST",
  headersJson: "{}",
  body: "",
  failureWebhookUrl: "",
  timeoutMs: 10000,
  maxRetries: 1,
  active: true
};

export function JobForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cronPreview = useMemo(() => {
    if (form.cronExpression === "*/15 * * * *") {
      return "Runs every 15 minutes";
    }

    if (form.cronExpression === "0 * * * *") {
      return "Runs every hour";
    }

    return "Use standard 5-field cron syntax (minute hour day month weekday).";
  }, [form.cronExpression]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    let headers: Record<string, string>;

    try {
      headers = JSON.parse(form.headersJson) as Record<string, string>;
    } catch {
      setError("Headers must be valid JSON, for example {\"Authorization\":\"Bearer ...\"}.");
      setIsSubmitting(false);
      return;
    }

    const payload: JobPayload = {
      name: form.name,
      cronExpression: form.cronExpression,
      timezone: form.timezone,
      webhookUrl: form.webhookUrl,
      method: form.method,
      headers,
      body: form.body || undefined,
      failureWebhookUrl: form.failureWebhookUrl || undefined,
      timeoutMs: Number(form.timeoutMs),
      maxRetries: Number(form.maxRetries),
      active: form.active
    };

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { message?: string; job?: JobRecord };

      if (!response.ok || !data.job) {
        setError(data.message ?? "Unable to create the job.");
        return;
      }

      router.refresh();
      setForm(initialForm);
    } catch {
      setError("Network error while creating job.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Scheduled Job</CardTitle>
        <CardDescription>
          Define a cron expression and webhook endpoint. We will execute it on schedule and alert you on failures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="job-name">Job name</Label>
            <Input
              id="job-name"
              value={form.name}
              placeholder="Nightly backup"
              onChange={(event) => {
                setForm((prev) => ({ ...prev, name: event.target.value }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cron-expression">Cron expression</Label>
              <Input
                id="cron-expression"
                value={form.cronExpression}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, cronExpression: event.target.value }));
                }}
                required
              />
              <p className="text-xs text-[#8b949e]">{cronPreview}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={form.timezone}
                placeholder="UTC"
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, timezone: event.target.value }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              value={form.webhookUrl}
              placeholder="https://api.yourapp.com/internal/jobs/backup"
              onChange={(event) => {
                setForm((prev) => ({ ...prev, webhookUrl: event.target.value }));
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="method">HTTP method</Label>
              <select
                id="method"
                className="h-10 rounded-md border border-[#30363d] bg-[#0d1117] px-3 text-sm text-[#e6edf3]"
                value={form.method}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    method: event.target.value as JobPayload["method"]
                  }));
                }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min={1000}
                max={60000}
                value={form.timeoutMs}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, timeoutMs: Number(event.target.value) }));
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retries">Max retries</Label>
              <Input
                id="retries"
                type="number"
                min={0}
                max={5}
                value={form.maxRetries}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, maxRetries: Number(event.target.value) }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="headers">HTTP headers (JSON)</Label>
            <Textarea
              id="headers"
              value={form.headersJson}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, headersJson: event.target.value }));
              }}
              placeholder='{"Authorization":"Bearer token"}'
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Request body (optional)</Label>
            <Textarea
              id="body"
              value={form.body}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, body: event.target.value }));
              }}
              placeholder='{"action":"backup"}'
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="failure-webhook">Failure notification webhook (optional)</Label>
            <Input
              id="failure-webhook"
              type="url"
              value={form.failureWebhookUrl}
              placeholder="https://hooks.slack.com/services/..."
              onChange={(event) => {
                setForm((prev) => ({ ...prev, failureWebhookUrl: event.target.value }));
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#c9d1d9]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, active: event.target.checked }));
              }}
            />
            Activate immediately
          </label>

          {error ? <p className="text-sm text-[#f85149]">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating job..." : "Create job"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
