"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SyncPurchaseButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/paywall/sync", { method: "POST" });
      const data = (await response.json()) as { paid?: boolean };

      if (data.paid) {
        setMessage("Payment confirmed. Redirecting to dashboard...");
        router.push("/dashboard");
        router.refresh();
      } else {
        setMessage("Payment not detected yet. It can take up to one minute after checkout.");
      }
    } catch {
      setMessage("Unable to verify payment right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={onClick} disabled={loading} variant="secondary">
        {loading ? "Checking payment..." : "I completed checkout"}
      </Button>
      {message ? <p className="text-sm text-[#8b949e]">{message}</p> : null}
    </div>
  );
}
