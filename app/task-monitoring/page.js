"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import TaskMonitoringDashboard from "../components/TaskMonitoringDashboard";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function TaskMonitoringPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch tasks
  const fetchTasks = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to load tasks");
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Failed to load employees");
    }
  };

  // Fetch project details
  const fetchProject = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
      setError("Failed to load project details");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchEmployees(), fetchProject()]);
      setLoading(false);
    };

    if (projectId) {
      loadData();
    } else {
      setLoading(false);
      setError("No project selected");
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-4">
            {error}
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href={`/task-management?projectId=${projectId}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Tasks
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Task Monitoring Dashboard
                </h1>
                {project && (
                  <p className="text-sm text-gray-600">{project.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projectId ? (
          <TaskMonitoringDashboard
            projectId={projectId}
            tasks={tasks}
            employees={employees}
            teams={[]} // TODO: Add teams data
            onRefresh={fetchTasks}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No project selected</p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Select a Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}