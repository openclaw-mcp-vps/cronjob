import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureSchema, query } from "@/lib/db";
import { enqueueExecution } from "@/lib/queue";

const triggerSchema = z.object({
  jobId: z.string().min(1),
  token: z.string().min(8)
});

interface JobRow {
  id: string;
}

export async function POST(request: NextRequest) {
  const sharedSecret = process.env.WEBHOOK_EXECUTE_SECRET;

  if (sharedSecret) {
    const providedSecret = request.headers.get("x-cronjob-secret");
    if (providedSecret !== sharedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
    }
  }

  try {
    await ensureSchema();

    const body = await request.json();
    const parsed = triggerSchema.parse(body);

    const jobResult = await query<JobRow>(
      `
        SELECT id
        FROM jobs
        WHERE id = $1
          AND webhook_token = $2
          AND active = TRUE
        LIMIT 1
      `,
      [parsed.jobId, parsed.token]
    );

    if (!jobResult.rows.length) {
      return NextResponse.json({ error: "Invalid job ID or token" }, { status: 401 });
    }

    const result = await enqueueExecution({
      jobId: parsed.jobId,
      triggeredBy: "webhook"
    });

    return NextResponse.json({
      queued: true,
      mode: result.mode
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook execution failed"
      },
      { status: 400 }
    );
  }
}
