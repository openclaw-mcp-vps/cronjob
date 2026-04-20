import Link from "next/link";

import { CheckoutButton } from "@/components/CheckoutButton";
import { SyncPurchaseButton } from "@/components/SyncPurchaseButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export default async function UpgradePage() {
  const session = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <Card className="w-full border-[#2f81f7]/30 bg-[#0f1726]/80">
        <CardHeader>
          <CardTitle>Unlock cronjob Pro</CardTitle>
          <CardDescription>
            Complete checkout to activate dashboard access, live scheduling, and failure alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
            <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.12em] text-[#8b949e]">Plan</p>
            <p className="mt-1 text-2xl font-semibold text-[#f0f6fc]">$15/month</p>
            <p className="mt-2 text-sm text-[#8b949e]">Unlimited scheduled jobs, execution logs, retries, and failure notifications.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CheckoutButton email={session.user.email ?? undefined} />
            <SyncPurchaseButton />
          </div>

          <p className="text-sm text-[#8b949e]">
            Use the same email for checkout: <span className="font-medium text-[#c9d1d9]">{session.user.email}</span>.
            After payment, click <span className="text-[#c9d1d9]">I completed checkout</span> to set your access cookie.
          </p>

          <Link href="/">
            <Button variant="ghost">Back to homepage</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
