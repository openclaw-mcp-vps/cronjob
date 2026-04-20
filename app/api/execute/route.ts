import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { ensureDataFiles, getJobById } from "@/lib/db";
import { runJobById } from "@/lib/executor";

export const runtime = "nodejs";

const executeSchema = z.object({
  jobId: z.string().uuid()
});

export async function POST(request: Request) {
  await ensureDataFiles();
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.paid) {
    return NextResponse.json({ message: "Subscription required" }, { status: 402 });
  }

  const payload = await request.json();
  const parsed = executeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "jobId is required." }, { status: 400 });
  }

  const job = await getJobById(parsed.data.jobId);

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ message: "Job not found." }, { status: 404 });
  }

  const log = await runJobById(job.id, {
    trigger: "manual",
    attempt: 1
  });

  return NextResponse.json({ log });
}
