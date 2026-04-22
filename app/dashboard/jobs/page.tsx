"use client";

import { useState } from "react";
import { JobForm } from "@/components/job-form";
import { JobList } from "@/components/job-list";

export default function DashboardJobsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <section className="space-y-6">
      <JobForm onJobCreated={() => setRefreshKey((previous) => previous + 1)} />
      <JobList refreshKey={refreshKey} />
    </section>
  );
}
