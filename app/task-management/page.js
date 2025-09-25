"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "../components/Layout";
import TaskManagement from "../components/TaskManagement";
import TaskDetailView from "../components/TaskDetailView";

const TaskManagementContent = () => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleTaskUpdate = () => {
    // Refresh task list when task is updated
    window.location.reload(); // Simple approach - could be optimized
  };

  return (
    <>
      <TaskManagement projectId={projectId} onTaskSelect={handleTaskSelect} />

      <TaskDetailView
        task={selectedTask}
        isOpen={showTaskDetail}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
      />
    </>
  );
};

const TaskManagementPage = () => {
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <TaskManagementContent />
      </Suspense>
    </Layout>
  );
};

export default TaskManagementPage;
