"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "../components/Layout";
import TaskManagement from "../components/TaskManagement";

const TaskManagementContent = () => {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  return <TaskManagement projectId={projectId} />;
};

const TaskManagementPage = () => {
  return (
    <Layout activeSection="projects">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <div className="h-11 w-11 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
            <p className="animate-pulse text-sm text-slate-500">
              Loading tasks…
            </p>
          </div>
        }
      >
        <TaskManagementContent />
      </Suspense>
    </Layout>
  );
};

export default TaskManagementPage;
