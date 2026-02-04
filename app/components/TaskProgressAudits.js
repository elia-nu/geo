"use client";

import { useState, useEffect } from "react";
import {
  History as HistoryIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

const TaskProgressAudits = ({ projectId = null }) => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    taskId: "",
    employeeId: "",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchEmployees();
    if (projectId) {
      fetchProjectTasks();
    }
    fetchAudits();
  }, [projectId, filters, pagination.currentPage]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchProjectTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const fetchAudits = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (filters.taskId) params.append("taskId", filters.taskId);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("page", pagination.currentPage);
      params.append("limit", "20");

      const response = await fetch(`/api/tasks/progress-audits?${params}`);
      const data = await response.json();

      if (data.success) {
        setAudits(data.audits || []);
        setPagination(data.pagination || pagination);
      } else {
        setError(data.error || "Failed to fetch audits");
      }
    } catch (err) {
      console.error("Error fetching audits:", err);
      setError("Error fetching progress audits: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressChangeColor = (oldProgress, newProgress) => {
    if (newProgress > oldProgress) {
      return "text-green-600 bg-green-50";
    } else if (newProgress < oldProgress) {
      return "text-red-600 bg-red-50";
    }
    return "text-gray-600 bg-gray-50";
  };

  const getProgressChangeIcon = (oldProgress, newProgress) => {
    if (newProgress > oldProgress) {
      return <TrendingUpIcon className="w-4 h-4" />;
    } else if (newProgress < oldProgress) {
      return <TrendingDownIcon className="w-4 h-4" />;
    }
    return null;
  };

  if (loading && audits.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-black">
            Task Progress Audits
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Track all task progress updates and changes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task
            </label>
            <select
              value={filters.taskId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, taskId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">All Tasks</option>
              {tasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={filters.employeeId}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.personalDetails?.name || emp.name || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() =>
              setFilters({
                taskId: "",
                employeeId: "",
                startDate: "",
                endDate: "",
              })
            }
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={fetchAudits}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <SearchIcon className="w-4 h-4 inline mr-1" />
            Search
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Audits Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <HistoryIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No progress audits found</p>
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
                  <tr key={audit._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {formatDateTime(audit.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      <div className="flex items-center gap-2">
                        <AssignmentIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {audit.task?.title || audit.taskTitle || "Unknown Task"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      <div className="flex items-center gap-2">
                        <PersonIcon className="w-4 h-4 text-gray-400" />
                        <span>
                          {audit.updatedByName || "Unknown Employee"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getProgressChangeColor(
                          audit.previousProgress,
                          audit.newProgress
                        )}`}
                      >
                        {getProgressChangeIcon(
                          audit.previousProgress,
                          audit.newProgress
                        )}
                        <span>
                          {audit.previousProgress}% → {audit.newProgress}%
                        </span>
                        <span className="text-xs">
                          (
                          {audit.newProgress > audit.previousProgress ? "+" : ""}
                          {audit.newProgress - audit.previousProgress}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {audit.project?.name || "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {pagination.currentPage} of {pagination.totalPages} (
              {pagination.totalCount} total audits)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: Math.max(1, prev.currentPage - 1),
                  }))
                }
                disabled={!pagination.hasPrev}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: Math.min(
                      prev.totalPages,
                      prev.currentPage + 1
                    ),
                  }))
                }
                disabled={!pagination.hasNext}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskProgressAudits;

