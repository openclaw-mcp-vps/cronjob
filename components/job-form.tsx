"use client";

import { useMemo, useState } from "react";
import type { JobMethod } from "@/lib/types";

interface JobFormProps {
  onJobCreated: () => void;
}

interface FormState {
  name: string;
  schedule: string;
  timezone: string;
  targetUrl: string;
  method: JobMethod;
  payload: string;
  headers: string;
  notifyEmail: string;
  failureWebhookUrl: string;
}

const initialFormState: FormState = {
  name: "",
  schedule: "*/15 * * * *",
  timezone: "UTC",
  targetUrl: "",
  method: "POST",
  payload: "{\n  \"event\": \"sync\"\n}",
  headers: "{\n  \"Authorization\": \"Bearer your-api-key\"\n}",
  notifyEmail: "",
  failureWebhookUrl: ""
};

export function JobForm({ onJobCreated }: JobFormProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const helperText = useMemo(
    () =>
      "Cron format example: '*/15 * * * *' (every 15 minutes) or '0 3 * * *' (daily at 03:00 UTC).",
    []
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const payloadObject = JSON.parse(form.payload || "{}");
      const headersObject = JSON.parse(form.headers || "{}");

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          schedule: form.schedule,
          timezone: form.timezone,
          targetUrl: form.targetUrl,
          method: form.method,
          payload: payloadObject,
          headers: headersObject,
          notifyEmail: form.notifyEmail || null,
          failureWebhookUrl: form.failureWebhookUrl || null,
          active: true
        })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not create job");
        return;
      }

      setSuccessMessage("Job created successfully.");
      setForm(initialFormState);
      onJobCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit job.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-white">Create Scheduled Job</h2>
      <p className="mt-2 text-sm text-slate-400">
        Define a cron expression, request target, payload, and failure channel. Jobs are queued and executed by
        workers.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Job name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Nightly backup"
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">HTTP method</span>
            <select
              value={form.method}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  method: event.target.value as JobMethod
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Cron schedule</span>
          <input
            required
            value={form.schedule}
            onChange={(event) => setForm((previous) => ({ ...previous, schedule: event.target.value }))}
            placeholder="*/15 * * * *"
            className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
          />
          <span className="mt-1 block text-xs text-slate-500">{helperText}</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Timezone</span>
            <input
              value={form.timezone}
              onChange={(event) => setForm((previous) => ({ ...previous, timezone: event.target.value }))}
              placeholder="UTC"
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Target URL</span>
            <input
              type="url"
              required
              value={form.targetUrl}
              onChange={(event) => setForm((previous) => ({ ...previous, targetUrl: event.target.value }))}
              placeholder="https://api.yourapp.com/tasks/backup"
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">JSON payload</span>
            <textarea
              value={form.payload}
              onChange={(event) => setForm((previous) => ({ ...previous, payload: event.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">JSON headers</span>
            <textarea
              value={form.headers}
              onChange={(event) => setForm((previous) => ({ ...previous, headers: event.target.value }))}
              rows={6}
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 font-mono text-xs text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Failure email (optional)</span>
            <input
              type="email"
              value={form.notifyEmail}
              onChange={(event) => setForm((previous) => ({ ...previous, notifyEmail: event.target.value }))}
              placeholder="alerts@yourapp.com"
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Failure webhook URL (optional)</span>
            <input
              type="url"
              value={form.failureWebhookUrl}
              onChange={(event) => setForm((previous) => ({ ...previous, failureWebhookUrl: event.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Creating..." : "Create Job"}
        </button>
      </form>
    </section>
  );
}
