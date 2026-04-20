import { JobForm } from "@/components/JobForm";
import { JobList } from "@/components/JobList";
import { requirePaidUser } from "@/lib/auth";
import { ensureDataFiles, listJobsByUser } from "@/lib/db";

export default async function DashboardJobsPage() {
  const session = await requirePaidUser();
  await ensureDataFiles();

  const jobs = await listJobsByUser(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#f0f6fc]">Jobs</h1>
        <p className="mt-2 text-[#8b949e]">
          Add recurring tasks, control retry behavior, and pause jobs without touching server infrastructure.
        </p>
      </div>
      <JobForm />
      <JobList initialJobs={jobs} />
    </div>
  );
}
