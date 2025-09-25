"use client";

import { useState, useEffect } from "react";
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

const TaskReporting = ({ projectId = null }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30"); // days
  const [selectedMetric, setSelectedMetric] = useState("overview");

  useEffect(() => {
    fetchReportData();
  }, [projectId, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      params.append("dateRange", dateRange);

      const response = await fetch(`/api/tasks/reports?${params}`);
      const data = await response.json();

      if (data.success) {
        setReportData(data.report);
      } else {
        setError(data.error || "Failed to fetch report data");
      }
    } catch (err) {
      setError("Error fetching report data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      params.append("dateRange", dateRange);
      params.append("format", "csv");

      const response = await fetch(`/api/tasks/reports/export?${params}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `task-report-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Error exporting report: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <AssignmentIcon
          className="mx-auto text-gray-400 mb-4"
          style={{ fontSize: 64 }}
        />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No data available
        </h3>
        <p className="text-gray-600">
          No task data found for the selected period
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Task Analytics & Reporting
          </h1>
          <p className="text-gray-600">
            Monitor task progress, team performance, and project insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={fetchReportData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshIcon fontSize="small" />
            Refresh
          </button>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DownloadIcon fontSize="small" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">
                {reportData.totalTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <AssignmentIcon className="text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <TrendingUpIcon
                className="text-green-500 mr-1"
                fontSize="small"
              />
              <span className="text-sm text-green-600 font-medium">
                +{reportData.newTasksThisPeriod} this period
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {reportData.completedTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {(
                  (reportData.completedTasks / reportData.totalTasks) *
                  100
                ).toFixed(1)}
                % completion rate
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">
                {reportData.inProgressTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TimelineIcon className="text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {reportData.blockedTasks} blocked tasks
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600">
                {reportData.overdueTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <WarningIcon className="text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                {reportData.dueSoonTasks} due soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Task Status Distribution
            </h3>
            <PieChartIcon className="text-gray-400" />
          </div>

          <div className="space-y-4">
            {Object.entries(reportData.statusDistribution || {}).map(
              ([status, count]) => {
                const percentage = (count / reportData.totalTasks) * 100;
                const statusColors = {
                  pending: "bg-yellow-500",
                  in_progress: "bg-blue-500",
                  review: "bg-purple-500",
                  completed: "bg-green-500",
                  blocked: "bg-red-500",
                  cancelled: "bg-gray-500",
                };

                return (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          statusColors[status] || "bg-gray-400"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            statusColors[status] || "bg-gray-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Priority Distribution
            </h3>
            <FlagIcon className="text-gray-400" />
          </div>

          <div className="space-y-4">
            {Object.entries(reportData.priorityDistribution || {}).map(
              ([priority, count]) => {
                const percentage = (count / reportData.totalTasks) * 100;
                const priorityColors = {
                  low: "bg-green-500",
                  medium: "bg-yellow-500",
                  high: "bg-orange-500",
                  critical: "bg-red-500",
                };

                return (
                  <div
                    key={priority}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          priorityColors[priority] || "bg-gray-400"
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            priorityColors[priority] || "bg-gray-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Performers */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Top Performers
            </h3>
            <PersonIcon className="text-gray-400" />
          </div>

          <div className="space-y-4">
            {(reportData.topPerformers || []).map((performer, index) => (
              <div key={performer.userId} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {performer.userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {performer.userName}
                    </span>
                    <span className="text-sm text-gray-600">
                      {performer.completedTasks} completed
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            (performer.completedTasks /
                              Math.max(
                                ...(reportData.topPerformers || []).map(
                                  (p) => p.completedTasks
                                )
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {performer.avgHoursPerTask}h avg
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(!reportData.topPerformers ||
              reportData.topPerformers.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                No performance data available
              </p>
            )}
          </div>
        </div>

        {/* Time Tracking Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Time Tracking Summary
            </h3>
            <ScheduleIcon className="text-gray-400" />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.totalHoursLogged || 0}h
                </p>
                <p className="text-sm text-gray-600">Total Logged</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reportData.totalHoursEstimated || 0}h
                </p>
                <p className="text-sm text-gray-600">Total Estimated</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Time Accuracy</span>
                <span className="text-sm font-medium">
                  {reportData.timeAccuracy
                    ? `${reportData.timeAccuracy.toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (reportData.timeAccuracy || 0) >= 90
                      ? "bg-green-500"
                      : (reportData.timeAccuracy || 0) >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(reportData.timeAccuracy || 0, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-orange-600">
                  {reportData.avgTaskDuration || 0}h
                </p>
                <p className="text-xs text-gray-600">Avg Task Duration</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-purple-600">
                  {reportData.productivityScore || 0}%
                </p>
                <p className="text-xs text-gray-600">Productivity Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Task Activity
          </h3>
          <TimelineIcon className="text-gray-400" />
        </div>

        <div className="space-y-4">
          {(reportData.recentActivity || []).map((activity, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {activity.userName?.charAt(0) || "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.userName}</span>{" "}
                  {activity.action}
                  <span className="font-medium"> "{activity.taskTitle}"</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.action.includes("completed")
                      ? "bg-green-100 text-green-800"
                      : activity.action.includes("created")
                      ? "bg-blue-100 text-blue-800"
                      : activity.action.includes("updated")
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {activity.action}
                </span>
              </div>
            </div>
          ))}
          {(!reportData.recentActivity ||
            reportData.recentActivity.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskReporting;
