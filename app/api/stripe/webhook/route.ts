import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { ensureSchema, query } from "@/lib/db";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${error instanceof Error ? error.message : "unknown error"}`
      },
      { status: 400 }
    );
  }

  try {
    await ensureSchema();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const email = (session.customer_details?.email ?? session.customer_email ?? "").toLowerCase().trim();

      if (email) {
        await query(
          `
            INSERT INTO paid_customers (email, source, last_event_id, purchased_at, updated_at)
            VALUES ($1, 'stripe-payment-link', $2, NOW(), NOW())
            ON CONFLICT (email)
            DO UPDATE SET
              source = EXCLUDED.source,
              last_event_id = EXCLUDED.last_event_id,
              updated_at = NOW()
          `,
          [email, event.id]
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook handler failed"
      },
      { status: 500 }
    );
  }
}
