import Link from "next/link";
import { AlertTriangle, BellRing, Clock3, CloudCog, DatabaseBackup, Logs } from "lucide-react";

const faqs = [
  {
    question: "How is this better than running cron on my VPS?",
    answer:
      "Cronjob separates scheduling from execution and keeps a full audit trail for every run. If a server restarts, your schedule and logs stay intact in PostgreSQL and your jobs are retried by workers."
  },
  {
    question: "Can I trigger jobs from my own app?",
    answer:
      "Yes. Every job has a webhook token and endpoint so your app can trigger runs on demand in addition to the recurring schedule."
  },
  {
    question: "What happens when a task fails?",
    answer:
      "Cronjob records the full error, response payload, duration, and attempt history. You can send failure alerts by email and webhook so your team is informed immediately."
  },
  {
    question: "Who is this built for?",
    answer:
      "Solo founders and lean product teams that need reliable recurring jobs for backups, billing syncs, report generation, and lifecycle automations without hiring DevOps."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <header className="mb-20 flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">cronjob</p>
          <h1 className="font-[var(--font-heading)] text-xl font-bold text-white">Cloud Cron That Does Not Flake</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
          >
            Open Dashboard
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Start for $15/mo
          </a>
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.22em] text-emerald-300">
            Reliable Scheduling for SaaS Teams
          </p>
          <h2 className="font-[var(--font-heading)] text-4xl leading-tight font-extrabold text-white sm:text-5xl">
            Never discover a broken cron job
            <span className="text-emerald-400"> after your customers do.</span>
          </h2>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Cronjob runs recurring tasks in the cloud with durable queues, retries, logs, and alerts. Ship backup
            jobs, reporting tasks, and billing syncs with a scheduler that tells you exactly what happened.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Buy Access - $15/mo
            </a>
            <Link
              href="/paywall"
              className="rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:border-slate-500"
            >
              I Already Purchased
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">At a glance</p>
          <ul className="mt-5 space-y-4 text-sm text-slate-200">
            <li className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-emerald-400" />
              Recurring schedules with cron syntax and next-run visibility.
            </li>
            <li className="flex items-start gap-3">
              <Logs className="mt-0.5 h-4 w-4 text-cyan-300" />
              Execution logs with status, duration, response code, and payload snapshots.
            </li>
            <li className="flex items-start gap-3">
              <BellRing className="mt-0.5 h-4 w-4 text-amber-300" />
              Failure alerts via email and webhook before incidents become outages.
            </li>
            <li className="flex items-start gap-3">
              <CloudCog className="mt-0.5 h-4 w-4 text-violet-300" />
              Background workers and Redis queues without maintaining your own cron servers.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-2">
        <article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h3 className="font-[var(--font-heading)] text-2xl font-bold text-rose-100">The painful reality</h3>
          <ul className="mt-4 space-y-3 text-slate-200">
            <li className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
              Jobs fail silently when a server restarts or an environment variable rotates.
            </li>
            <li className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
              You find out hours later, after backups, emails, or billing syncs already missed.
            </li>
            <li className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" />
              Debugging is guesswork without execution history or failure payloads.
            </li>
          </ul>
        </article>

        <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <h3 className="font-[var(--font-heading)] text-2xl font-bold text-emerald-100">The cronjob way</h3>
          <ul className="mt-4 space-y-3 text-slate-100">
            <li className="flex gap-3">
              <DatabaseBackup className="h-5 w-5 shrink-0 text-emerald-300" />
              Persist schedules and run history in PostgreSQL for durable auditing.
            </li>
            <li className="flex gap-3">
              <CloudCog className="h-5 w-5 shrink-0 text-emerald-300" />
              Queue execution through BullMQ workers for retries and controlled concurrency.
            </li>
            <li className="flex gap-3">
              <BellRing className="h-5 w-5 shrink-0 text-emerald-300" />
              Push alerts instantly to your incident webhook and inbox when runs fail.
            </li>
          </ul>
        </article>
      </section>

      <section id="pricing" className="mt-24 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-300">Pricing</p>
        <h3 className="mt-3 font-[var(--font-heading)] text-3xl font-bold text-white">Simple price for essential reliability</h3>
        <p className="mt-3 max-w-2xl text-slate-300">
          Built for bootstrapped teams that need dependable automation now, not enterprise procurement cycles.
        </p>
        <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-slate-800 bg-[#0c1420] p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-4xl font-black text-white">$15<span className="text-xl font-medium text-slate-400">/month</span></p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Unlimited scheduled jobs</li>
              <li>Failure alerts by email + webhook</li>
              <li>Execution logs and response tracing</li>
              <li>Dashboard + REST API access</li>
            </ul>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
            className="rounded-xl bg-emerald-500 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Go to Secure Stripe Checkout
          </a>
        </div>
      </section>

      <section className="mt-24">
        <h3 className="font-[var(--font-heading)] text-3xl font-bold text-white">Frequently asked questions</h3>
        <div className="mt-6 grid gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-lg font-semibold text-white">{faq.question}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
