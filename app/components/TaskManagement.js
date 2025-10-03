"use client";

import { useState, useEffect } from "react";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import TaskCommunicationPanel from "./TaskCommunicationPanel";
import TaskAssignmentManager from "./TaskAssignmentManager";
import TaskMonitoringDashboard from "./TaskMonitoringDashboard";
import SubtaskManager from "./SubtaskManager";
import TaskDependencyManager from "./TaskDependencyManager";

const TaskManagement = ({ projectId, milestoneId = null }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Current user context (in a real app, this would come from auth context)
  const [currentUser] = useState({
    id: "admin", // This should come from authentication
    name: "Admin User",
    email: "admin@company.com",
  });

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState(0);

  // New dialog states
  const [showAssignmentManager, setShowAssignmentManager] = useState(false);
  const [showMonitoringDashboard, setShowMonitoringDashboard] = useState(false);
  const [showSubtaskManager, setShowSubtaskManager] = useState(false);
  const [showDependencyManager, setShowDependencyManager] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: [],
    assignedTeams: [],
    priority: "medium",
    status: "pending",
    startDate: "",
    dueDate: "",
    estimatedHours: 0,
    tags: [],
    dependencies: [],
    subtasks: [],
    category: "general",
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    if (!projectId) {
      fetchProjects();
    }
  }, [
    projectId,
    selectedProjectId,
    milestoneId,
    statusFilter,
    priorityFilter,
    assigneeFilter,
  ]);

  useEffect(() => {
    setSelectedProjectId(projectId);
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const currentProjectId = projectId || selectedProjectId;
      if (currentProjectId) params.append("projectId", currentProjectId);
      if (milestoneId) params.append("milestoneId", milestoneId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (assigneeFilter !== "all") params.append("assignedTo", assigneeFilter);

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks);
      } else {
        setError(data.error || "Failed to fetch tasks");
      }
    } catch (err) {
      setError("Error fetching tasks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    const currentProjectId = projectId || selectedProjectId;
    if (!currentProjectId) {
      setError("Project ID is required. Please select a project first.");
      return;
    }

    try {
      const payload = {
        ...formData,
        projectId: currentProjectId,
        milestoneId,
        createdBy: "admin", // TODO: Get from auth context
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : null,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      console.log(
        "Creating task with payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
        setShowCreateDialog(false);
        resetForm();
      } else {
        setError(data.error || "Failed to create task");
      }
    } catch (err) {
      setError("Error creating task: " + err.message);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    setError(null);

    try {
      const payload = {
        ...formData,
        updatedBy: "admin", // TODO: Get from auth context
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : null,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      const response = await fetch(`/api/tasks/${selectedTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
        setShowEditDialog(false);
        setSelectedTask(null);
        resetForm();
      } else {
        setError(data.error || "Failed to update task");
      }
    } catch (err) {
      setError("Error updating task: " + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
      } else {
        setError(data.error || "Failed to delete task");
      }
    } catch (err) {
      setError("Error deleting task: " + err.message);
    }
  };

  const handleProgressUpdate = async (taskId, newProgress) => {
    try {
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: Math.min(100, Math.max(0, newProgress)),
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks();
        setShowProgressDialog(false);
        setSelectedTask(null);
        setProgressUpdate(0);
      } else {
        setError(data.error || "Failed to update progress");
      }
    } catch (err) {
      setError("Error updating progress: " + err.message);
    }
  };

  const openProgressDialog = (task) => {
    setSelectedTask(task);
    setProgressUpdate(task.progress || 0);
    setShowProgressDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: [],
      assignedTeams: [],
      priority: "medium",
      status: "pending",
      startDate: "",
      dueDate: "",
      estimatedHours: 0,
      tags: [],
      dependencies: [],
      subtasks: [],
      category: "general",
    });
  };

  const openEditDialog = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo || [],
      assignedTeams: task.assignedTeams || [],
      priority: task.priority,
      status: task.status,
      startDate: task.startDate
        ? new Date(task.startDate).toISOString().split("T")[0]
        : "",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      estimatedHours: task.estimatedHours || 0,
      tags: task.tags || [],
      dependencies: task.dependencies || [],
      subtasks: task.subtasks || [],
      category: task.category || "general",
    });
    setShowEditDialog(true);
  };

  const refreshSelectedTask = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`/api/tasks/${selectedTask._id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedTask(data.task);
        // Also refresh the tasks list to update the counts
        await fetchTasks();
      }
    } catch (err) {
      console.error("Error refreshing task:", err);
    }
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

  const filteredTasks = tasks.filter((task) => {
    const safeTitle = (task?.title || "").toLowerCase();
    const safeDescription = (task?.description || "").toLowerCase();
    const term = (searchTerm || "").toLowerCase();
    const matchesSearch =
      safeTitle.includes(term) || safeDescription.includes(term);
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Task Management
          </h1>
          <p className="text-gray-600 text-sm">
            Assign and monitor tasks with clear ownership and priorities
          </p>
          {!projectId && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Project
              </label>
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 min-w-64"
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={!projectId && !selectedProjectId}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !projectId && !selectedProjectId
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          <AddIcon />
          Create Task
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          >
            <option value="all">All Assignees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.personalDetails?.name || emp.name || "Unknown"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <div
            key={task._id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Task Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {task.title}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetail(true);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Task Details"
                  >
                    <VisibilityIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openEditDialog(task)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Task"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openProgressDialog(task)}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Update Progress"
                  >
                    <TimelineIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Task"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(
                    task.priority
                  )}`}
                >
                  {task.priority}
                </span>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                    task.status
                  )}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">
                {task.description}
              </p>
            </div>

            {/* Task Body */}
            <div className="p-4">
              {/* Assignees */}
              <div className="flex items-center gap-2 mb-3">
                <PersonIcon className="text-gray-400" fontSize="small" />
                {task.assignedEmployees && task.assignedEmployees.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {task.assignedEmployees.slice(0, 3).map((emp, index) => (
                      <div
                        key={emp._id}
                        className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        title={emp.name}
                      >
                        {emp.name.charAt(0)}
                      </div>
                    ))}
                    {task.assignedEmployees.length > 3 && (
                      <span className="text-xs text-gray-500 ml-1">
                        +{task.assignedEmployees.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                    Unassigned
                  </span>
                )}
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center gap-2 mb-3">
                  <ScheduleIcon className="text-gray-400" fontSize="small" />
                  <span className="text-sm text-gray-600">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium">
                    {task.progress || 0}%
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2 cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => openProgressDialog(task)}
                  title="Click to update progress"
                >
                  <div
                    className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <AssignmentIcon className="text-gray-400" fontSize="small" />
                  <span className="text-sm text-gray-600">
                    {
                      task.subtasks.filter((st) => st.status === "completed")
                        .length
                    }
                    /{task.subtasks.length} subtasks
                  </span>
                </div>
              )}

              {/* Time Tracking */}
              <div className="flex items-center gap-2 mb-3">
                <TimeIcon className="text-gray-400" fontSize="small" />
                <span className="text-sm text-gray-600">
                  {task.actualHours || 0}h / {task.estimatedHours || 0}h
                </span>
              </div>

              {/* Comments and Attachments */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <CommentIcon className="text-gray-400" fontSize="small" />
                  <span className="text-sm text-gray-600">
                    {task.comments?.length || 0}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <AttachFileIcon className="text-gray-400" fontSize="small" />
                  <span className="text-sm text-gray-600">
                    {task.attachments?.length || 0}
                  </span>
                </div>
                {task.dependencies && task.dependencies.length > 0 && (
                  <div className="flex items-center gap-1">
                    <TimelineIcon className="text-gray-400" fontSize="small" />
                    <span className="text-sm text-gray-600">
                      {task.dependencies.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-1">
                  {/*<button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowAssignmentManager(true);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Manage Assignment"
                  >
                    <PersonIcon fontSize="small" />
                  </button>*/}
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowSubtaskManager(true);
                    }}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Manage Subtasks"
                  >
                    <AssignmentIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowDependencyManager(true);
                    }}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Manage Dependencies"
                  >
                    <TimelineIcon fontSize="small" />
                  </button>
                </div>
                {/*
                <div className="flex gap-1">
                  <button
                    onClick={() => openTaskDetail(task)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <VisibilityIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openEditDialog(task)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit Task"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openProgressDialog(task)}
                    className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Update Progress"
                  >
                    <TimelineIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Task"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>*/}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tasks found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first task"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowMonitoringDashboard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <TimelineIcon fontSize="small" />
              Monitoring Dashboard
            </button>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Task Dialog */}
      {(showCreateDialog || showEditDialog) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {showCreateDialog ? "Create New Task" : "Edit Task"}
            </h2>

            <form
              onSubmit={showCreateDialog ? handleCreateTask : handleUpdateTask}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedHours: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="testing">Testing</option>
                    <option value="documentation">Documentation</option>
                    <option value="research">Research</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to Employees
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {employees.map((employee) => (
                      <label
                        key={employee._id}
                        className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedTo.includes(employee._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData((prev) => ({
                                ...prev,
                                assignedTo: [...prev.assignedTo, employee._id],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                assignedTo: prev.assignedTo.filter(
                                  (id) => id !== employee._id
                                ),
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {employee.personalDetails?.name ||
                            employee.name ||
                            "Unknown"}
                        </span>
                        <span className="text-xs text-gray-500">
                          (
                          {employee.personalDetails?.email ||
                            employee.email ||
                            "No email"}
                          )
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.assignedTo.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        Selected: {formData.assignedTo.length} employee(s)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                    setSelectedTask(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showCreateDialog ? "Create Task" : "Update Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail View Dialog */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTask.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                      selectedTask.priority
                    )}`}
                  >
                    {selectedTask.priority}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      selectedTask.status
                    )}`}
                  >
                    {selectedTask.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTaskDetail(false);
                  setSelectedTask(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CancelIcon />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedTask.description || "No description provided."}
                  </p>
                </div>

                {/* Communication Panel */}
                <div>
                  <TaskCommunicationPanel
                    taskId={selectedTask._id}
                    currentUser={currentUser}
                    task={selectedTask}
                    onUpdate={refreshSelectedTask}
                  />
                </div>

                {/* Assigned Employees */}
                {selectedTask.assignedEmployees &&
                  selectedTask.assignedEmployees.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Assigned Employees
                      </h3>
                      <div className="space-y-2">
                        {selectedTask.assignedEmployees.map((emp) => (
                          <div
                            key={emp._id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {emp.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedTask.startDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Start Date
                      </h4>
                      <p className="text-gray-600">
                        {new Date(selectedTask.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedTask.dueDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Due Date
                      </h4>
                      <p className="text-gray-600">
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Progress
                    </h3>
                    <button
                      onClick={() => {
                        setShowTaskDetail(false);
                        openProgressDialog(selectedTask);
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Completion</span>
                      <span className="text-sm font-medium">
                        {selectedTask.progress || 0}%
                      </span>
                    </div>
                    <div
                      className="w-full bg-gray-200 rounded-full h-2 cursor-pointer hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setShowTaskDetail(false);
                        openProgressDialog(selectedTask);
                      }}
                      title="Click to update progress"
                    >
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedTask.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Time Tracking */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Time Tracking
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">
                        Estimated
                      </h4>
                      <p className="text-gray-600">
                        {selectedTask.estimatedHours || 0}h
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Actual</h4>
                      <p className="text-gray-600">
                        {selectedTask.actualHours || 0}h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Subtasks (
                      {
                        selectedTask.subtasks.filter(
                          (st) => st.status === "completed"
                        ).length
                      }
                      /{selectedTask.subtasks.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedTask.subtasks.map((subtask, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <CheckCircleIcon
                            className={
                              subtask.status === "completed"
                                ? "text-green-500"
                                : "text-gray-300"
                            }
                            fontSize="small"
                          />
                          <span
                            className={`text-sm ${
                              subtask.status === "completed"
                                ? "line-through text-gray-500"
                                : "text-gray-700"
                            }`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category and Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Details
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium text-gray-700">
                        Category:{" "}
                      </span>
                      <span className="text-gray-600 capitalize">
                        {selectedTask.category}
                      </span>
                    </div>
                    {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">
                          Tags:{" "}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTask.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTaskDetail(false);
                  openEditDialog(selectedTask);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Task
              </button>
              <button
                onClick={() => {
                  setShowTaskDetail(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Dialog */}
      {showProgressDialog && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Update Task Progress
            </h2>

            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">
                {selectedTask.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    selectedTask.priority
                  )}`}
                >
                  {selectedTask.priority}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Progress
                </label>
                <span className="text-sm font-medium text-blue-600">
                  {progressUpdate}%
                </span>
              </div>

              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={progressUpdate}
                onChange={(e) => setProgressUpdate(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progressUpdate}%, #E5E7EB ${progressUpdate}%, #E5E7EB 100%)`,
                }}
              />

              {/* Progress Bar Visual */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-1"
                    style={{ width: `${progressUpdate}%` }}
                  >
                    {progressUpdate > 15 && (
                      <span className="text-xs text-white font-medium">
                        {progressUpdate}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Progress Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setProgressUpdate(0)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  0%
                </button>
                <button
                  onClick={() => setProgressUpdate(25)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setProgressUpdate(50)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setProgressUpdate(75)}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  75%
                </button>
                <button
                  onClick={() => setProgressUpdate(100)}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Progress Status Messages */}
            <div className="mb-4 text-sm">
              {progressUpdate === 0 && (
                <p className="text-gray-600">Task not started</p>
              )}
              {progressUpdate > 0 && progressUpdate < 25 && (
                <p className="text-orange-600">Just getting started</p>
              )}
              {progressUpdate >= 25 && progressUpdate < 50 && (
                <p className="text-yellow-600">Making progress</p>
              )}
              {progressUpdate >= 50 && progressUpdate < 75 && (
                <p className="text-blue-600">Halfway there!</p>
              )}
              {progressUpdate >= 75 && progressUpdate < 100 && (
                <p className="text-purple-600">Almost finished</p>
              )}
              {progressUpdate === 100 && (
                <p className="text-green-600">Task completed! 🎉</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProgressDialog(false);
                  setSelectedTask(null);
                  setProgressUpdate(0);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleProgressUpdate(selectedTask._id, progressUpdate)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Manager */}
      {showAssignmentManager && (
        <TaskAssignmentManager
          task={selectedTask}
          isOpen={showAssignmentManager}
          onClose={() => {
            setShowAssignmentManager(false);
            setSelectedTask(null);
          }}
          onUpdate={async () => {
            await fetchTasks();
            await refreshSelectedTask();
          }}
          employees={employees}
          teams={[]} // TODO: Add teams data
        />
      )}

      {/* Task Monitoring Dashboard */}
      {showMonitoringDashboard && (
        <TaskMonitoringDashboard
          projectId={selectedProjectId}
          tasks={tasks}
          employees={employees}
          teams={[]} // TODO: Add teams data
          onRefresh={fetchTasks}
        />
      )}

      {/* Subtask Manager */}
      {showSubtaskManager && (
        <SubtaskManager
          task={selectedTask}
          isOpen={showSubtaskManager}
          onClose={() => {
            setShowSubtaskManager(false);
            setSelectedTask(null);
          }}
          onUpdate={async () => {
            await fetchTasks();
            await refreshSelectedTask();
          }}
          employees={employees}
        />
      )}

      {/* Task Dependency Manager */}
      {showDependencyManager && (
        <TaskDependencyManager
          task={selectedTask}
          isOpen={showDependencyManager}
          onClose={() => {
            setShowDependencyManager(false);
            setSelectedTask(null);
          }}
          onUpdate={async () => {
            await fetchTasks();
            await refreshSelectedTask();
          }}
          allTasks={tasks}
        />
      )}
    </div>
  );
};

export default TaskManagement;
