"use client";

import { useState, useEffect } from "react";
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
  Flag as FlagIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";

const TaskMonitoringDashboard = ({
  projectId,
  tasks = [],
  employees = [],
  teams = [],
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState("overview");
  const [timeRange, setTimeRange] = useState("week"); // week, month, quarter
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Calculate dashboard metrics
  const metrics = calculateMetrics(tasks);
  const overdueTasks = getOverdueTasks(tasks);
  const upcomingDeadlines = getUpcomingDeadlines(tasks);
  const dependencyIssues = getDependencyIssues(tasks);
  const workloadDistribution = getWorkloadDistribution(tasks, employees);

  const handleRefresh = async () => {
    setLoading(true);
    if (onRefresh) {
      await onRefresh();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <DashboardIcon className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Task Monitoring Dashboard
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshIcon className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          {
            id: "overview",
            label: "Overview",
            icon: <DashboardIcon fontSize="small" />,
          },
          {
            id: "deadlines",
            label: "Deadlines",
            icon: <ScheduleIcon fontSize="small" />,
          },
          {
            id: "dependencies",
            label: "Dependencies",
            icon: <TimelineIcon fontSize="small" />,
          },
          {
            id: "workload",
            label: "Workload",
            icon: <PersonIcon fontSize="small" />,
          },
          {
            id: "alerts",
            label: "Alerts",
            icon: <WarningIcon fontSize="small" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              selectedView === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Overview View */}
        {selectedView === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Tasks"
                value={metrics.totalTasks}
                icon={<AssignmentIcon className="text-blue-600" />}
                trend={metrics.tasksTrend}
              />
              <MetricCard
                title="Completed"
                value={metrics.completedTasks}
                icon={<CheckCircleIcon className="text-green-600" />}
                trend={metrics.completionTrend}
                percentage={metrics.completionRate}
              />
              <MetricCard
                title="Overdue"
                value={metrics.overdueTasks}
                icon={<WarningIcon className="text-red-600" />}
                trend={metrics.overdueTrend}
                alert={metrics.overdueTasks > 0}
              />
              <MetricCard
                title="In Progress"
                value={metrics.inProgressTasks}
                icon={<TrendingUpIcon className="text-orange-600" />}
                trend={metrics.progressTrend}
              />
            </div>

            {/* Priority Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Priority Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      priority: "critical",
                      label: "Critical",
                      color: "bg-red-500",
                    },
                    { priority: "high", label: "High", color: "bg-orange-500" },
                    {
                      priority: "medium",
                      label: "Medium",
                      color: "bg-yellow-500",
                    },
                    { priority: "low", label: "Low", color: "bg-green-500" },
                  ].map(({ priority, label, color }) => (
                    <div
                      key={priority}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {metrics.priorityDistribution[priority] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Status Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      status: "pending",
                      label: "Pending",
                      color: "bg-gray-500",
                    },
                    {
                      status: "in_progress",
                      label: "In Progress",
                      color: "bg-blue-500",
                    },
                    {
                      status: "review",
                      label: "Review",
                      color: "bg-purple-500",
                    },
                    {
                      status: "completed",
                      label: "Completed",
                      color: "bg-green-500",
                    },
                    {
                      status: "blocked",
                      label: "Blocked",
                      color: "bg-red-500",
                    },
                  ].map(({ status, label, color }) => (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {metrics.statusDistribution[status] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deadlines View */}
        {selectedView === "deadlines" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overdue Tasks */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <WarningIcon className="text-red-600" />
                  Overdue Tasks ({overdueTasks.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {overdueTasks.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-lg p-3 border border-red-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {task.title}
                        </h4>
                        <span className="text-xs text-red-600 font-medium">
                          {Math.ceil(
                            (new Date() - new Date(task.dueDate)) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          days overdue
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span
                          className={`px-2 py-1 rounded ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center gap-2">
                  <ScheduleIcon className="text-orange-600" />
                  Upcoming Deadlines ({upcomingDeadlines.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {upcomingDeadlines.map((task) => (
                    <div
                      key={task._id}
                      className="bg-white rounded-lg p-3 border border-orange-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {task.title}
                        </h4>
                        <span className="text-xs text-orange-600 font-medium">
                          {Math.ceil(
                            (new Date(task.dueDate) - new Date()) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          days left
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span
                          className={`px-2 py-1 rounded ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dependencies View */}
        {selectedView === "dependencies" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dependency Issues */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                  <WarningIcon className="text-yellow-600" />
                  Dependency Issues ({dependencyIssues.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {dependencyIssues.map((issue) => (
                    <div
                      key={issue.taskId}
                      className="bg-white rounded-lg p-3 border border-yellow-200"
                    >
                      <h4 className="font-medium text-gray-900 text-sm mb-2">
                        {issue.taskTitle}
                      </h4>
                      <p className="text-xs text-yellow-800">{issue.issue}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks with Dependencies */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <TimelineIcon className="text-blue-600" />
                  Tasks with Dependencies
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {tasks
                    .filter(
                      (task) =>
                        task.dependencies && task.dependencies.length > 0
                    )
                    .map((task) => (
                      <div
                        key={task._id}
                        className="bg-white rounded-lg p-3 border border-blue-200"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-2">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{task.dependencies.length} dependencies</span>
                          <span
                            className={`px-2 py-1 rounded ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workload View */}
        {selectedView === "workload" && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Workload Distribution
              </h3>
              <div className="space-y-4">
                {workloadDistribution.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-white rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <PersonIcon className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {employee.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {employee.taskCount} tasks
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          employee.taskCount > 10
                            ? "bg-red-500"
                            : employee.taskCount > 5
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            (employee.taskCount / 15) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      <span>0</span>
                      <span>15</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alerts View */}
        {selectedView === "alerts" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {[
                ...overdueTasks.map((task) => ({
                  type: "overdue",
                  severity: "high",
                  title: "Overdue Task",
                  message: `${task.title} is overdue by ${Math.ceil(
                    (new Date() - new Date(task.dueDate)) /
                      (1000 * 60 * 60 * 24)
                  )} days`,
                  taskId: task._id,
                })),
                ...dependencyIssues.map((issue) => ({
                  type: "dependency",
                  severity: "medium",
                  title: "Dependency Issue",
                  message: issue.issue,
                  taskId: issue.taskId,
                })),
                ...tasks
                  .filter((task) => task.isBlocked)
                  .map((task) => ({
                    type: "blocked",
                    severity: "high",
                    title: "Blocked Task",
                    message: `${task.title} is blocked: ${
                      task.blockReason || "No reason provided"
                    }`,
                    taskId: task._id,
                  })),
              ].map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    alert.severity === "high"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <WarningIcon
                      className={`${
                        alert.severity === "high"
                          ? "text-red-600"
                          : "text-yellow-600"
                      } mt-0.5`}
                      fontSize="small"
                    />
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          alert.severity === "high"
                            ? "text-red-900"
                            : "text-yellow-900"
                        }`}
                      >
                        {alert.title}
                      </h4>
                      <p
                        className={`text-sm ${
                          alert.severity === "high"
                            ? "text-red-800"
                            : "text-yellow-800"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <VisibilityIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, icon, trend, percentage, alert }) => (
  <div
    className={`p-6 rounded-lg border ${
      alert ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${alert ? "bg-red-100" : "bg-white"}`}>
        {icon}
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-sm ${
            trend > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? (
            <TrendingUpIcon fontSize="small" />
          ) : (
            <TrendingDownIcon fontSize="small" />
          )}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p
        className={`text-2xl font-bold ${
          alert ? "text-red-900" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      <p className={`text-sm ${alert ? "text-red-700" : "text-gray-600"}`}>
        {title}
        {percentage && ` (${percentage}%)`}
      </p>
    </div>
  </div>
);

// Helper Functions
const calculateMetrics = (tasks) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const overdueTasks = getOverdueTasks(tasks).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress"
  ).length;

  const priorityDistribution = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {});

  const statusDistribution = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    inProgressTasks,
    completionRate:
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    priorityDistribution,
    statusDistribution,
    // Mock trends - in real app, these would be calculated from historical data
    tasksTrend: 5,
    completionTrend: 12,
    overdueTrend: -8,
    progressTrend: 3,
  };
};

const getOverdueTasks = (tasks) => {
  const now = new Date();
  return tasks.filter(
    (task) =>
      task.dueDate &&
      new Date(task.dueDate) < now &&
      task.status !== "completed"
  );
};

const getUpcomingDeadlines = (tasks) => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return tasks.filter(
    (task) =>
      task.dueDate &&
      new Date(task.dueDate) > now &&
      new Date(task.dueDate) <= nextWeek &&
      task.status !== "completed"
  );
};

const getDependencyIssues = (tasks) => {
  const issues = [];
  tasks.forEach((task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      // Check if any dependencies are incomplete
      const incompleteDeps = task.dependencies.filter((depId) => {
        const depTask = tasks.find((t) => t._id === depId);
        return depTask && depTask.status !== "completed";
      });

      if (incompleteDeps.length > 0) {
        issues.push({
          taskId: task._id,
          taskTitle: task.title,
          issue: `${incompleteDeps.length} incomplete dependencies blocking this task`,
        });
      }
    }
  });
  return issues;
};

const getWorkloadDistribution = (tasks, employees) => {
  return employees
    .map((employee) => {
      const taskCount = tasks.filter(
        (task) => task.assignedTo && task.assignedTo.includes(employee._id)
      ).length;

      return {
        id: employee._id,
        name: employee.personalDetails?.name || employee.name || "Unknown",
        taskCount,
      };
    })
    .sort((a, b) => b.taskCount - a.taskCount);
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "critical":
      return "text-red-600 bg-red-100";
    case "high":
      return "text-orange-600 bg-orange-100";
    case "medium":
      return "text-yellow-600 bg-yellow-100";
    case "low":
      return "text-green-600 bg-green-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-100";
    case "in_progress":
      return "text-blue-600 bg-blue-100";
    case "review":
      return "text-purple-600 bg-purple-100";
    case "blocked":
      return "text-red-600 bg-red-100";
    case "cancelled":
      return "text-gray-600 bg-gray-100";
    default:
      return "text-yellow-600 bg-yellow-100";
  }
};

export default TaskMonitoringDashboard;
