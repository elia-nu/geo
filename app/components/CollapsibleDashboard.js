"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, ChartBarIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import TaskMonitoringDashboard from "./TaskMonitoringDashboard";
import Link from "next/link";

export default function CollapsibleDashboard({ projectId, tasks, employees, teams, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Calculate quick stats for the collapsed view
  const tasksArray = Array.isArray(tasks) ? tasks : [];
  const totalTasks = tasksArray.length;
  const completedTasks = tasksArray.filter(task => task.status === "Completed").length;
  const inProgressTasks = tasksArray.filter(task => task.status === "In Progress").length;
  const overdueTasks = tasksArray.filter(task => {
    if (task.status === "Completed") return false;
    return new Date(task.dueDate) < new Date();
  }).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
      {/* Collapsed Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
            )}
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Task Monitoring Dashboard
            </h3>
          </div>
          
          {/* Quick stats in collapsed view */}
          {!isExpanded && (
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-600">{totalTasks} Total</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-600">{completedTasks} Completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-600">{inProgressTasks} In Progress</span>
              </div>
              {overdueTasks > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-red-600">{overdueTasks} Overdue</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Link to full page */}
          <Link
            href={`/task-monitoring?projectId=${projectId}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            Full View
          </Link>
          
          <div className="text-sm text-gray-500">
            {isExpanded ? "Click to collapse" : "Click to expand"}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <div className="max-h-96 overflow-y-auto">
              <TaskMonitoringDashboard
                projectId={projectId}
                tasks={tasks}
                employees={employees}
                teams={teams}
                onRefresh={onRefresh}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}