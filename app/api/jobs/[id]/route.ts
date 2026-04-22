import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { assertApiAccess } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { deleteJob, fetchExecutionsForJob, fetchJobById, updateJob, updateJobSchema } from "@/lib/jobs";

interface Context {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: Context) {
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

  const executions = await fetchExecutionsForJob(id, 25);

  return NextResponse.json({ job, executions });
}

export async function PATCH(request: NextRequest, context: Context) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  try {
    const { id } = await context.params;

    await ensureSchema();

    const body = await request.json();
    const parsed = updateJobSchema.parse(body);
    const job = await updateJob(id, parsed);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten()
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not update job"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;

  await ensureSchema();
  const deleted = await deleteJob(id);

  if (!deleted) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
