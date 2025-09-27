"use client";

import { useState } from "react";
import Layout from "../components/Layout";
import TaskReporting from "../components/TaskReporting";

const TaskReportsPage = () => {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <Layout>
      <TaskReporting projectId={selectedProject} />
    </Layout>
  );
};

export default TaskReportsPage;
