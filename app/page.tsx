import Link from "next/link";

import { CheckoutButton } from "@/components/CheckoutButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";

const faqs = [
  {
    question: "How does cronjob prevent silent failures?",
    answer:
      "Every execution is logged with HTTP status, response payload, and duration. Failed runs automatically trigger email or webhook notifications so your team finds out immediately."
  },
  {
    question: "Can I run private API jobs?",
    answer:
      "Yes. Add custom headers per job, including bearer tokens or signed keys. Requests are sent over HTTPS with configurable timeouts and retries."
  },
  {
    question: "Do I need Redis to use this app?",
    answer:
      "No. cronjob works without Redis using direct execution mode. If you connect Redis, Bull queueing adds retries and better worker resilience."
  },
  {
    question: "Who is this built for?",
    answer:
      "Solo developers and small SaaS teams that need reliable scheduling without managing cron daemons, worker nodes, or monitoring systems."
  }
];

export default async function HomePage() {
  const session = await getAuthSession();

  return (
    <main className="min-h-screen bg-transparent">
      <section className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-10 md:px-10 md:pt-14">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[#8b949e]">Scheduling Infrastructure</p>
            <h1 className="text-2xl font-bold text-[#e6edf3]">cronjob</h1>
          </div>
          <div className="flex gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button variant="secondary">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button>Create account</Button>
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <p className="inline-flex rounded-full border border-[#30363d] bg-[#161b22]/70 px-4 py-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[#8b949e]">
              Reliable cloud cron jobs for SaaS products
            </p>
            <div className="space-y-5">
              <h2 className="max-w-3xl text-4xl font-bold leading-tight text-[#f0f6fc] md:text-6xl">
                Stop learning about failed jobs from angry customers.
              </h2>
              <p className="max-w-2xl text-lg text-[#8b949e]">
                cronjob runs your scheduled tasks in the cloud, retries transient failures, and captures full execution logs so critical automations stay on track.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <CheckoutButton email={session?.user?.email ?? undefined} />
              <Link href={session ? "/dashboard" : "/register"}>
                <Button size="lg" variant="secondary">
                  {session ? "Open dashboard" : "Create free account"}
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Retry Engine</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[#8b949e]">Exponential retry support to recover from temporary endpoint outages.</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Alerting</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[#8b949e]">Email and webhook notifications the moment a run fails.</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Execution Logs</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[#8b949e]">Inspect duration, status, and payload output for every invocation.</CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-[#2f81f7]/40 bg-[#0f1726]/75 shadow-[0_0_120px_-70px_rgba(47,129,247,0.9)]">
            <CardHeader>
              <CardTitle>Why teams switch</CardTitle>
              <CardDescription>Running cron on random hosts causes invisible outages and expensive cleanup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#c9d1d9]">
              <p>
                Missed backups, stale analytics, and delayed billing runs usually come from jobs failing silently on servers nobody monitors. cronjob removes that operational blind spot.
              </p>
              <p>
                Set each task once, route to your existing webhook handlers, and watch every run from a dedicated dashboard with clear status history.
              </p>
              <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
                <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[#8b949e]">Price</p>
                <p className="mt-1 text-2xl font-semibold text-[#f0f6fc]">$15/month</p>
                <p className="mt-2 text-sm text-[#8b949e]">Unlimited jobs, dashboard access, and failure notifications.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-[#21262d] bg-[#0f141d]/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3 md:px-10">
          <div>
            <h3 className="text-2xl font-semibold">Problem</h3>
            <p className="mt-3 text-[#8b949e]">
              Developers lose hours diagnosing cron jobs that quietly stopped running because a cheap server rebooted or environment variables drifted.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Solution</h3>
            <p className="mt-3 text-[#8b949e]">
              cronjob centralizes scheduling, retries, and logs in one control plane. Every run is visible, auditable, and recoverable.
            </p>
          </div>
          <div>
            <h3 className="text-2xl font-semibold">Who Pays</h3>
            <p className="mt-3 text-[#8b949e]">
              Bootstrapped startups and solo builders who need production-grade scheduling without hiring dedicated DevOps.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <h3 className="text-3xl font-semibold text-[#f0f6fc]">Frequently Asked Questions</h3>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8b949e]">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
