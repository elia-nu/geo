"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  User,
  Flag,
  Play,
  Pause,
  CheckSquare,
  Eye,
  Search,
} from "lucide-react";
import TaskDetailModal from "./TaskDetailModal";
import Pagination from "./ui/Pagination";

export default function EmployeeTasks({ employeeId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, in_progress, completed, overdue
  const [sortBy, setSortBy] = useState("dueDate"); // dueDate, priority, status, created
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (employeeId) {
      fetchTasks();
    }
  }, [employeeId, filter, sortBy]);

  const fetchTasks = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      let url = `/api/tasks?assignedTo=${employeeId}`;
      if (filter !== "all" && filter !== "overdue") {
        url += `&status=${filter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        setError(data.error || "Failed to load tasks");
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Play className="w-4 h-4" />;
      case "review":
        return <AlertCircle className="w-4 h-4" />;
      case "blocked":
        return <Pause className="w-4 h-4" />;
      default:
        return <CheckSquare className="w-4 h-4" />;
    }
  };

  const getPriorityIcon = (priority) => {
    return <Flag className="w-3 h-3" />;
  };

  const isOverdue = (dueDate, status) => {
    if (status === "completed") return false;
    return dueDate && new Date(dueDate) < new Date();
  };

  const formatDate = (date) => {
    if (!date) return "No due date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewTaskDetails = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
  };

  const handleTaskUpdate = () => {
    // Refresh tasks in background without unmounting modal or flashing full-page skeleton
    fetchTasks({ silent: true });
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem("employeeToken");
      const employeeData = JSON.parse(localStorage.getItem("employeeData") || "{}");
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          updatedBy: employeeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
        // Show success message
        const statusLabels = {
          pending: "Pending",
          in_progress: "In Progress",
          review: "Review",
          completed: "Completed",
          blocked: "Blocked",
          cancelled: "Cancelled",
        };
        // You can add a toast notification here if you have a toast library
        console.log(`Task status updated to ${statusLabels[newStatus]}`);
      } else {
        setError(data.error || "Failed to update task status");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      setError("Error updating task status: " + err.message);
    }
  };

  const handleProgressUpdate = async (taskId, newProgress) => {
    try {
      const token = localStorage.getItem("employeeToken");
      const employeeData = JSON.parse(localStorage.getItem("employeeData") || "{}");
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: Math.min(100, Math.max(0, newProgress)),
          updatedBy: employeeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
        console.log(`Task progress updated to ${newProgress}%`);
      } else {
        setError(data.error || "Failed to update task progress");
      }
    } catch (err) {
      console.error("Error updating task progress:", err);
      setError("Error updating task progress: " + err.message);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (filter === "overdue") {
          return isOverdue(task.dueDate, task.status);
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const titleMatch = task.title?.toLowerCase().includes(q);
          const descMatch = task.description?.toLowerCase().includes(q);
          const projectMatch = task.project?.name?.toLowerCase().includes(q);
          if (!titleMatch && !descMatch && !projectMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "dueDate":
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          case "priority":
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return (
              (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
            );
          case "status":
            return a.status.localeCompare(b.status);
          case "created":
            return new Date(b.createdAt) - new Date(a.createdAt);
          default:
            return 0;
        }
      });
  }, [tasks, filter, sortBy, searchTerm]);

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTasks.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">My Tasks</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">My Tasks</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">My Tasks</h2>
          <p className="text-gray-600 mt-1">
            Track and manage your assigned tasks
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredAndSortedTasks.length} task
          {filteredAndSortedTasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search, Filters and Sort */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks by title, description, or project..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All Tasks" },
              { key: "pending", label: "Pending" },
              { key: "in_progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
              { key: "overdue", label: "Overdue" },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => {
                  setFilter(filterOption.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === filterOption.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="created">Created Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">
            No tasks found
          </h3>
          <p className="text-gray-500 text-xs">
            {filter === "all" && !searchTerm
              ? "You haven't been assigned any tasks yet."
              : `No tasks found matching your criteria.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedTasks.map((task) => (
            <div
              key={task._id}
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {task.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {task.description || "No description available"}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewTaskDetails(task)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    title="View task details"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Details
                  </button>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    {getPriorityIcon(task.priority)}
                    <span className="ml-1 capitalize">{task.priority}</span>
                  </div>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {getStatusIcon(task.status)}
                    <span className="ml-1 capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar with Update */}
              {task.progress !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <div className="flex items-center gap-2">
                      <span>{task.progress}%</span>
                      <button
                        onClick={() => {
                          const newProgress = prompt(
                            "Enter new progress (0-100):",
                            task.progress
                          );
                          if (
                            newProgress !== null &&
                            !isNaN(newProgress) &&
                            newProgress >= 0 &&
                            newProgress <= 100
                          ) {
                            handleProgressUpdate(task._id, parseInt(newProgress));
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        title="Update Progress"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Task Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Due: {formatDate(task.dueDate)}</span>
                </div>

                {task.startDate && (
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Start: {formatDate(task.startDate)}</span>
                  </div>
                )}

                {task.project && (
                  <div className="flex items-center text-gray-600">
                    <Target className="w-4 h-4 mr-2" />
                    <span className="truncate">{task.project.name}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>Created: {formatDateTime(task.createdAt)}</span>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Overdue Warning */}
              {isOverdue(task.dueDate, task.status) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700 font-medium">
                      This task is overdue
                    </span>
                  </div>
                </div>
              )}

              {/* Blocked Warning */}
              {task.isBlocked && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <Pause className="w-4 h-4 text-yellow-500 mr-2" />
                    <span className="text-sm text-yellow-700 font-medium">
                      Task is blocked:{" "}
                      {task.blockReason || "No reason provided"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          <div className="border-t border-slate-100 bg-white rounded-2xl p-2 sm:p-3 shadow-sm border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedTasks.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onUpdate={handleTaskUpdate}
        employeeId={employeeId}
      />
    </div>
  );
}
