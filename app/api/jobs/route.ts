import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { assertApiAccess } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { createJob, createJobSchema, fetchJobs } from "@/lib/jobs";

export async function GET(request: NextRequest) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  await ensureSchema();
  const jobs = await fetchJobs();

  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const authError = assertApiAccess(request);
  if (authError) {
    return authError;
  }

  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = createJobSchema.parse(body);
    const job = await createJob(parsed);

    return NextResponse.json({ job }, { status: 201 });
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
        error: error instanceof Error ? error.message : "Could not create job"
      },
      { status: 500 }
    );
  }
}
