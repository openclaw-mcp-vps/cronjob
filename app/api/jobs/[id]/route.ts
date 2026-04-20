import cron from "node-cron";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { deleteJob, ensureDataFiles, getJobById, updateJob } from "@/lib/db";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    name: z.string().min(3).max(80).optional(),
    cronExpression: z.string().min(9).max(120).optional(),
    timezone: z.string().min(2).max(64).optional(),
    webhookUrl: z.string().url().optional(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    headers: z.record(z.string()).optional(),
    body: z.string().max(10_000).optional(),
    failureWebhookUrl: z.string().url().optional(),
    timeoutMs: z.number().int().min(1000).max(60_000).optional(),
    maxRetries: z.number().int().min(0).max(5).optional(),
    active: z.boolean().optional()
  })
  .strict();

async function authorize(id: string) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!session.user.paid) {
    return { error: NextResponse.json({ message: "Subscription required" }, { status: 402 }) };
  }

  const job = await getJobById(id);

  if (!job || job.userId !== session.user.id) {
    return { error: NextResponse.json({ message: "Job not found" }, { status: 404 }) };
  }

  return { session, job };
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  await ensureDataFiles();
  const { id } = await params;
  const result = await authorize(id);

  if (result.error) {
    return result.error;
  }

  return NextResponse.json({ job: result.job });
}

export async function PUT(request: Request, { params }: Params) {
  await ensureDataFiles();
  const { id } = await params;
  const result = await authorize(id);

  if (result.error) {
    return result.error;
  }

  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid job payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  if (parsed.data.cronExpression && !cron.validate(parsed.data.cronExpression)) {
    return NextResponse.json({ message: "Invalid cron expression." }, { status: 400 });
  }

  const updated = await updateJob(id, parsed.data);

  return NextResponse.json({ job: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  await ensureDataFiles();
  const { id } = await params;
  const result = await authorize(id);

  if (result.error) {
    return result.error;
  }

  await deleteJob(id);

  return NextResponse.json({ deleted: true });
}
