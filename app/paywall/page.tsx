"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";

export default function PaywallPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClaimAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/paywall/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not verify your purchase.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Network error while claiming access.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-10 sm:px-10">
      <div className="grid w-full gap-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_20px_70px_-40px_rgba(34,197,94,0.45)] sm:p-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section>
          <p className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            Paid Access Required
          </p>
          <h1 className="mt-4 font-[var(--font-heading)] text-4xl font-extrabold text-white">Unlock your Cronjob dashboard</h1>
          <p className="mt-4 text-slate-300">
            Cronjob is a paid developer tool. Purchase access through Stripe, then use the billing email from checkout
            to unlock the dashboard.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-slate-200">
            <li className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0e1624] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
              Access is granted with a secure, signed cookie tied to your verified billing email.
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0e1624] p-4">
              <MailCheck className="mt-0.5 h-5 w-5 text-cyan-300" />
              Stripe webhook confirmations update your account automatically after successful payment.
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#0e1624] p-4">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-violet-300" />
              API routes and dashboard pages are gated behind the same paid-access check.
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Buy Access for $15/mo
            </a>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-slate-500"
            >
              Back to Landing Page
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#0c1420] p-6">
          <h2 className="text-xl font-semibold text-white">Claim your purchase</h2>
          <p className="mt-2 text-sm text-slate-400">Enter the billing email you used in Stripe checkout.</p>

          <form className="mt-6 space-y-4" onSubmit={handleClaimAccess}>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Billing email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-slate-700 bg-[#0b121d] px-3 py-2.5 text-slate-100 outline-none transition focus:border-emerald-400"
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verifying purchase..." : "Unlock Dashboard"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
