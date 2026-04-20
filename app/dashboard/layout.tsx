import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#21262d] bg-[#0d1117]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-lg font-semibold text-[#f0f6fc]">
              cronjob
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="rounded px-2 py-1 text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]">
                Overview
              </Link>
              <Link
                href="/dashboard/jobs"
                className="rounded px-2 py-1 text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
              >
                Jobs
              </Link>
              <Link
                href="/dashboard/logs"
                className="rounded px-2 py-1 text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3]"
              >
                Logs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="text-[#8b949e]">{session.user.email}</Badge>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
