import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { ensureDataFiles, markUserPaidByEmail } from "@/lib/db";

export const runtime = "nodejs";

function safeCompare(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  await ensureDataFiles();

  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ message: "Webhook secret is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  const rawBody = await request.text();
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (!safeCompare(digest, signature)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }

  const data = (payload.data ?? {}) as { attributes?: Record<string, unknown> };
  const meta = (payload.meta ?? {}) as { custom_data?: Record<string, unknown> };

  const email =
    (meta.custom_data?.email as string | undefined) ??
    (meta.custom_data?.user_email as string | undefined) ??
    (data.attributes?.user_email as string | undefined) ??
    (data.attributes?.customer_email as string | undefined);

  if (email) {
    await markUserPaidByEmail(email);
  }

  return NextResponse.json({ received: true, matchedUser: Boolean(email) });
}
