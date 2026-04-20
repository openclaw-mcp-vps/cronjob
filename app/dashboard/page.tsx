import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePaidUser } from "@/lib/auth";
import { ensureDataFiles, listExecutionLogsByUser, listJobsByUser } from "@/lib/db";

export default async function DashboardPage() {
  const session = await requirePaidUser();
  await ensureDataFiles();

  const [jobs, logs] = await Promise.all([
    listJobsByUser(session.user.id),
    listExecutionLogsByUser(session.user.id, 200)
  ]);

  const activeJobs = jobs.filter((job) => job.active).length;
  const failedRuns = logs.filter((log) => log.status === "failed").length;
  const successfulRuns = logs.filter((log) => log.status === "success").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f6fc]">Overview</h1>
        <p className="mt-2 text-[#8b949e]">
          Monitor your recurring jobs, inspect failures fast, and keep critical automations on schedule.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total jobs</CardDescription>
            <CardTitle>{jobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active jobs</CardDescription>
            <CardTitle>{activeJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Successful runs</CardDescription>
            <CardTitle>{successfulRuns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed runs</CardDescription>
            <CardTitle>{failedRuns}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Create jobs and verify your alerting pipeline in under five minutes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/jobs">
            <Button>Create or manage jobs</Button>
          </Link>
          <Link href="/dashboard/logs">
            <Button variant="secondary">Inspect execution logs</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
