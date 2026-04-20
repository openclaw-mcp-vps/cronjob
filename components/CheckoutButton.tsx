"use client";

import { useEffect, useMemo } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CheckoutButtonProps = {
  className?: string;
  email?: string;
};

export function CheckoutButton({ className, email }: CheckoutButtonProps) {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;

  const checkoutUrl = useMemo(() => {
    if (!productId) {
      return "";
    }

    const query = new URLSearchParams({
      embed: "1",
      media: "0",
      logo: "0"
    });

    if (email) {
      query.set("checkout[email]", email);
      query.set("checkout[custom][email]", email);
    }

    if (storeId) {
      query.set("checkout[custom][store_id]", storeId);
    }

    return `https://checkout.lemonsqueezy.com/buy/${productId}?${query.toString()}`;
  }, [email, productId, storeId]);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://assets.lemonsqueezy.com/lemon.js"]');

    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.lemonsqueezy.com/lemon.js";
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  if (!checkoutUrl) {
    return (
      <button className={cn(buttonVariants(), "cursor-not-allowed opacity-60", className)} disabled>
        Configure Lemon Squeezy Product ID
      </button>
    );
  }

  return (
    <a
      href={checkoutUrl}
      className={cn(buttonVariants({ size: "lg" }), "lemonsqueezy-button", className)}
      aria-label="Open checkout"
    >
      Start for $15/month
    </a>
  );
}
