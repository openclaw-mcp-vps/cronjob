import cron from "node-cron";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { createJob, ensureDataFiles, listJobsByUser } from "@/lib/db";
import type { HttpMethod } from "@/lib/types";

export const runtime = "nodejs";

const methodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const createJobSchema = z.object({
  name: z.string().min(3).max(80),
  cronExpression: z.string().min(9).max(120),
  timezone: z.string().min(2).max(64).default("UTC"),
  webhookUrl: z.string().url(),
  method: methodSchema.default("POST"),
  headers: z.record(z.string()).default({}),
  body: z.string().max(10_000).optional(),
  failureWebhookUrl: z.string().url().optional(),
  timeoutMs: z.number().int().min(1000).max(60_000).default(10_000),
  maxRetries: z.number().int().min(0).max(5).default(1),
  active: z.boolean().default(true)
});

async function authorizePaidUser() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!session.user.paid) {
    return { error: NextResponse.json({ message: "Subscription required" }, { status: 402 }) };
  }

  return { session };
}

export async function GET() {
  await ensureDataFiles();
  const auth = await authorizePaidUser();

  if (auth.error) {
    return auth.error;
  }

  const jobs = await listJobsByUser(auth.session.user.id);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  await ensureDataFiles();
  const auth = await authorizePaidUser();

  if (auth.error) {
    return auth.error;
  }

  const payload = await request.json();
  const parsed = createJobSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid job payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  if (!cron.validate(parsed.data.cronExpression)) {
    return NextResponse.json(
      {
        message: "Invalid cron expression. Use standard 5-field syntax, such as '*/15 * * * *'."
      },
      { status: 400 }
    );
  }

  const job = await createJob({
    ...parsed.data,
    method: parsed.data.method as HttpMethod,
    userId: auth.session.user.id
  });

  return NextResponse.json({ job }, { status: 201 });
}
