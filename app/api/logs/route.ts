import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { ensureDataFiles, listExecutionLogsByUser, listJobsByUser } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  await ensureDataFiles();
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.paid) {
    return NextResponse.json({ message: "Subscription required" }, { status: 402 });
  }

  const [logs, jobs] = await Promise.all([
    listExecutionLogsByUser(session.user.id, 200),
    listJobsByUser(session.user.id)
  ]);

  const jobNameById = new Map(jobs.map((job) => [job.id, job.name]));

  return NextResponse.json({
    logs: logs.map((log) => ({
      ...log,
      jobName: jobNameById.get(log.jobId) ?? "Unknown Job"
    }))
  });
}
