import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { getAccessEmailFromCookies, requireDashboardAccess } from "@/lib/auth";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireDashboardAccess();
  const email = await getAccessEmailFromCookies();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10">
      <header className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">cronjob dashboard</p>
            <h1 className="font-[var(--font-heading)] text-2xl font-bold text-white">Reliable task scheduling control center</h1>
            <p className="mt-1 text-sm text-slate-400">Signed in as {email ?? "unknown"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/jobs"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500"
            >
              Jobs
            </Link>
            <Link
              href="/dashboard/logs"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500"
            >
              Logs
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
