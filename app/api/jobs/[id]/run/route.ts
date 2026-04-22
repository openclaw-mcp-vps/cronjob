import { NextResponse, type NextRequest } from "next/server";
import { assertApiAccess } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { fetchJobById } from "@/lib/jobs";
import { enqueueExecution } from "@/lib/queue";

interface Context {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: Context) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;

  await ensureSchema();
  const job = await fetchJobById(id);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const result = await enqueueExecution({
    jobId: id,
    triggeredBy: "manual"
  });

  return NextResponse.json({
    queued: true,
    mode: result.mode
  });
}
