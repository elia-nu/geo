"use client";

import { useState, useEffect } from "react";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Timeline as TimelineIcon,
  ArrowBack as ArrowBackIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import TaskCommunicationPanel from "./TaskCommunicationPanel";
import TaskAssignmentManager from "./TaskAssignmentManager";
import TaskMonitoringDashboard from "./TaskMonitoringDashboard";
import TaskProgressAudits from "./TaskProgressAudits";
import SubtaskManager from "./SubtaskManager";
import TaskDependencyManager from "./TaskDependencyManager";
import Link from "next/link";
import {
  projectToasts,
  showErrorToast,
  showWarningToast,
  showSuccessToast,
  showDeleteConfirmDialog,
} from "../utils/sweetAlert";

const TaskManagement = ({ projectId, milestoneId = null }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingProgress, setUpdatingProgress] = useState(false);

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
  const [showProgressAudits, setShowProgressAudits] = useState(false);
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
    tags: [],
    dependencies: [],
    subtasks: [],
    category: "general",
    categoryId: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchTaskCategories();
    if (!projectId) {
      fetchProjects();
    }
    const currentProjectId = projectId || selectedProjectId;
    if (currentProjectId) {
      fetchProjectMembers(currentProjectId);
    } else {
      setProjectMembers([]);
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

  useEffect(() => {
    if (!showTaskDetail) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowTaskDetail(false);
        setSelectedTask(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showTaskDetail]);

  const fetchTasks = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
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
        const msg = data.error || "Failed to fetch tasks";
        setError(msg);
        showErrorToast("Load Failed", msg);
      }
    } catch (err) {
      const msg = "Error fetching tasks: " + err.message;
      setError(msg);
      showErrorToast("Load Failed", msg);
    } finally {
      if (!silent) {
        setLoading(false);
      }
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

  const fetchTaskCategories = async () => {
    try {
      const response = await fetch("/api/task-categories");
      const data = await response.json();
      if (data.success) {
        setTaskCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching task categories:", err);
    }
  };

  const fetchProjectMembers = async (projectIdToFetch) => {
    try {
      const response = await fetch(
        `/api/projects/${projectIdToFetch}/assign-employees`
      );
      const data = await response.json();
      if (data.success) {
        setProjectMembers(data.assignedEmployees || []);
      }
    } catch (err) {
      console.error("Error fetching project members:", err);
      setProjectMembers([]);
    }
  };

  // Keep current project details for breadcrumb
  useEffect(() => {
    const currentProjectId = projectId || selectedProjectId;
    if (!currentProjectId) {
      setCurrentProject(null);
      return;
    }

    // Try to resolve from loaded list first
    const inList = projects.find((p) => p._id === currentProjectId);
    if (inList) {
      setCurrentProject(inList);
      return;
    }

    // Fallback: fetch single project detail
    (async () => {
      try {
        const res = await fetch(`/api/projects/${currentProjectId}`);
        const data = await res.json();
        if (data?.success && data.project) {
          setCurrentProject(data.project);
        }
      } catch (e) {
        // ignore breadcrumb fetch errors
      }
    })();
  }, [projectId, selectedProjectId, projects]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const currentProjectId = projectId || selectedProjectId;
    if (!currentProjectId) {
      const msg = "Project ID is required. Please select a project first.";
      setError(msg);
      showWarningToast("Warning", msg);
      return;
    }

    if (!formData.title?.trim()) {
      showWarningToast("Missing Title", "Please enter a task title");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        title: formData.title.trim(),
        projectId: currentProjectId,
        milestoneId,
        createdBy: "admin",
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : null,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString()
          : null,
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks({ silent: true });
        setShowCreateDialog(false);
        resetForm();
        projectToasts.taskCreated();
      } else {
        const msg = data.error || "Failed to create task";
        setError(msg);
        projectToasts.taskError(msg);
      }
    } catch (err) {
      const msg = "Error creating task: " + err.message;
      setError(msg);
      projectToasts.taskError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!selectedTask || saving) return;

    setError(null);

    if (currentProject) {
      const projectStart = currentProject.startDate
        ? new Date(currentProject.startDate).toISOString().split("T")[0]
        : null;
      const projectEnd = currentProject.endDate
        ? new Date(currentProject.endDate).toISOString().split("T")[0]
        : null;

      if (formData.startDate) {
        if (projectStart && formData.startDate < projectStart) {
          const msg = `Task start date must be on or after project start date (${new Date(
            currentProject.startDate
          ).toLocaleDateString()})`;
          setError(msg);
          showWarningToast("Invalid Date", msg);
          return;
        }
        if (projectEnd && formData.startDate > projectEnd) {
          const msg = `Task start date must be on or before project end date (${new Date(
            currentProject.endDate
          ).toLocaleDateString()})`;
          setError(msg);
          showWarningToast("Invalid Date", msg);
          return;
        }
      }

      if (formData.dueDate) {
        if (projectStart && formData.dueDate < projectStart) {
          const msg = `Task due date must be on or after project start date (${new Date(
            currentProject.startDate
          ).toLocaleDateString()})`;
          setError(msg);
          showWarningToast("Invalid Date", msg);
          return;
        }
        if (projectEnd && formData.dueDate > projectEnd) {
          const msg = `Task due date must be on or before project end date (${new Date(
            currentProject.endDate
          ).toLocaleDateString()})`;
          setError(msg);
          showWarningToast("Invalid Date", msg);
          return;
        }
      }

      if (
        formData.startDate &&
        formData.dueDate &&
        formData.dueDate < formData.startDate
      ) {
        const msg = "Due date must be on or after start date";
        setError(msg);
        showWarningToast("Invalid Date", msg);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        updatedBy: "admin",
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
        await fetchTasks({ silent: true });
        setShowEditDialog(false);
        setSelectedTask(null);
        resetForm();
        projectToasts.taskUpdated();
      } else {
        const msg = data.error || "Failed to update task";
        setError(msg);
        projectToasts.taskError(msg);
      }
    } catch (err) {
      const msg = "Error updating task: " + err.message;
      setError(msg);
      projectToasts.taskError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    const result = await showDeleteConfirmDialog(
      "Delete task?",
      `Delete "${taskTitle || "this task"}"? This cannot be undone.`,
      "Yes, delete it"
    );
    if (!result.isConfirmed) return;

    try {
      setDeletingId(taskId);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks({ silent: true });
        projectToasts.taskDeleted();
      } else {
        const msg = data.error || "Failed to delete task";
        setError(msg);
        projectToasts.taskError(msg);
      }
    } catch (err) {
      const msg = "Error deleting task: " + err.message;
      setError(msg);
      projectToasts.taskError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleProgressUpdate = async (taskId, newProgress) => {
    if (updatingProgress) return;
    try {
      setUpdatingProgress(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: Math.min(100, Math.max(0, newProgress)),
          updatedBy: "admin",
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTasks({ silent: true });
        setShowProgressDialog(false);
        setSelectedTask(null);
        setProgressUpdate(0);
        showSuccessToast("Progress Updated!", `Progress set to ${newProgress}%`);
      } else {
        const msg = data.error || "Failed to update progress";
        setError(msg);
        projectToasts.taskError(msg);
      }
    } catch (err) {
      const msg = "Error updating progress: " + err.message;
      setError(msg);
      projectToasts.taskError(msg);
    } finally {
      setUpdatingProgress(false);
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
      tags: [],
      dependencies: [],
      subtasks: [],
      category: "general",
      categoryId: "",
    });
  };

  const openEditDialog = (task) => {
    setSelectedTask(task);
    // Normalize assignedTo IDs to strings for consistent comparison
    const normalizedAssignedTo = (task.assignedTo || []).map((id) =>
      id?.toString ? id.toString() : String(id)
    );
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: normalizedAssignedTo,
      assignedTeams: task.assignedTeams || [],
      priority: task.priority,
      status: task.status,
      startDate: task.startDate
        ? new Date(task.startDate).toISOString().split("T")[0]
        : "",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      tags: task.tags || [],
      dependencies: task.dependencies || [],
      subtasks: task.subtasks || [],
      category: task.category || "general",
      categoryId: task.categoryId || "",
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
        await fetchTasks({ silent: true });
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
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-3">
        <div className="h-11 w-11 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 -m-6 p-6">
      {/* Breadcrumb */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-white hover:text-blue-900 transition-colors"
            >
              <ArrowBackIcon className="!text-base" />
              Projects
            </Link>
          </li>
          {(projectId || selectedProjectId) && (
            <>
              <li className="text-slate-300">/</li>
              <li>
                <Link
                  href={`/projects/${projectId || selectedProjectId}`}
                  className="rounded-md px-1.5 py-1 hover:bg-white hover:text-blue-900 transition-colors"
                >
                  {currentProject?.name || "Project"}
                </Link>
              </li>
            </>
          )}
          <li className="text-slate-300">/</li>
          <li className="px-1.5 py-1 font-medium text-slate-700">
            {milestoneId ? "Milestone Tasks" : "Tasks"}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
              <AssignmentIcon className="!text-xl" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Task Management
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Assign and monitor tasks with clear ownership and priorities
          </p>
          {!projectId && (
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Select Project
              </label>
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowMonitoringDashboard(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <TimelineIcon fontSize="small" />
            Monitoring
          </button>
          <button
            onClick={() => setShowProgressAudits(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            <HistoryIcon fontSize="small" />
            Audits
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            disabled={!projectId && !selectedProjectId}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
              !projectId && !selectedProjectId
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-blue-900 text-white shadow-sm shadow-blue-900/20 hover:bg-blue-800"
            }`}
          >
            <AddIcon />
            Create Task
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 !-translate-y-1/2 !text-lg text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <div
            key={task._id}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Task Header */}
            <div className="border-b border-slate-100 p-4">
              <div className="mb-2 flex justify-between items-start">
                <h3 className="truncate text-lg font-semibold text-slate-900">
                  {task.title}
                </h3>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskDetail(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    title="View Task Details"
                  >
                    <VisibilityIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openEditDialog(task)}
                    disabled={deletingId !== null}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                    title="Edit Task"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => openProgressDialog(task)}
                    disabled={deletingId !== null}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                    title="Update Progress"
                  >
                    <TimelineIcon fontSize="small" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task._id, task.title)}
                    disabled={deletingId !== null}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Delete Task"
                  >
                    {deletingId === task._id ? (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
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
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowSubtaskManager(true);
                    }}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
                    title="Manage Subtasks"
                  >
                    <AssignmentIcon className="!text-sm" />
                    Subtasks
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowDependencyManager(true);
                    }}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
                    title="Manage Dependencies"
                  >
                    <TimelineIcon className="!text-sm" />
                    Dependencies
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
                    onClick={() => handleDeleteTask(task._id, task.title)}
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <AssignmentIcon className="!text-4xl" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">No tasks found</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by creating your first task"}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              disabled={!projectId && !selectedProjectId}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 active:scale-[0.98]"
            >
              <AddIcon className="!text-lg" />
              Create Task
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Task Dialog */}
      {(showCreateDialog || showEditDialog) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => {
              if (saving) return;
              setShowCreateDialog(false);
              setShowEditDialog(false);
              setSelectedTask(null);
              resetForm();
            }}
          />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:mx-4 sm:max-w-2xl sm:rounded-2xl">
            <h2 className="mb-1 text-xl font-semibold text-slate-900">
              {showCreateDialog ? "Create New Task" : "Edit Task"}
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              {showCreateDialog
                ? "Add a new task to this project"
                : "Update task details"}
            </p>

            <form
              onSubmit={showCreateDialog ? handleCreateTask : handleUpdateTask}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start Date
                    {currentProject?.startDate && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (Project:{" "}
                        {new Date(
                          currentProject.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {currentProject.endDate
                          ? new Date(
                              currentProject.endDate
                            ).toLocaleDateString()
                          : "N/A"}
                        )
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    min={
                      currentProject?.startDate
                        ? new Date(currentProject.startDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined
                    }
                    max={
                      currentProject?.endDate
                        ? new Date(currentProject.endDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined
                    }
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const projectStart = currentProject?.startDate
                        ? new Date(currentProject.startDate)
                            .toISOString()
                            .split("T")[0]
                        : null;
                      const projectEnd = currentProject?.endDate
                        ? new Date(currentProject.endDate)
                            .toISOString()
                            .split("T")[0]
                        : null;

                      // Validate date is within project range
                      if (projectStart && selectedDate < projectStart) {
                        setError(
                          `Start date must be on or after project start date (${new Date(
                            currentProject.startDate
                          ).toLocaleDateString()})`
                        );
                        return;
                      }
                      if (projectEnd && selectedDate > projectEnd) {
                        setError(
                          `Start date must be on or before project end date (${new Date(
                            currentProject.endDate
                          ).toLocaleDateString()})`
                        );
                        return;
                      }

                      // If due date is set and is before new start date, clear it
                      if (formData.dueDate && selectedDate > formData.dueDate) {
                        setFormData((prev) => ({
                          ...prev,
                          startDate: selectedDate,
                          dueDate: "",
                        }));
                        setError(null);
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        startDate: selectedDate,
                      }));
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Due Date
                    {currentProject?.startDate && (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (Project:{" "}
                        {new Date(
                          currentProject.startDate
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {currentProject.endDate
                          ? new Date(
                              currentProject.endDate
                            ).toLocaleDateString()
                          : "N/A"}
                        )
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    min={
                      formData.startDate
                        ? formData.startDate
                        : currentProject?.startDate
                        ? new Date(currentProject.startDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined
                    }
                    max={
                      currentProject?.endDate
                        ? new Date(currentProject.endDate)
                            .toISOString()
                            .split("T")[0]
                        : undefined
                    }
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const projectStart = currentProject?.startDate
                        ? new Date(currentProject.startDate)
                            .toISOString()
                            .split("T")[0]
                        : null;
                      const projectEnd = currentProject?.endDate
                        ? new Date(currentProject.endDate)
                            .toISOString()
                            .split("T")[0]
                        : null;

                      // Validate date is within project range
                      if (projectStart && selectedDate < projectStart) {
                        setError(
                          `Due date must be on or after project start date (${new Date(
                            currentProject.startDate
                          ).toLocaleDateString()})`
                        );
                        return;
                      }
                      if (projectEnd && selectedDate > projectEnd) {
                        setError(
                          `Due date must be on or before project end date (${new Date(
                            currentProject.endDate
                          ).toLocaleDateString()})`
                        );
                        return;
                      }

                      // Validate due date is after start date
                      if (
                        formData.startDate &&
                        selectedDate < formData.startDate
                      ) {
                        setError("Due date must be on or after start date");
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        dueDate: selectedDate,
                      }));
                      setError(null);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Category</option>
                    {taskCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Assign to Employees
                    {projectId || selectedProjectId ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        (Project members only)
                      </span>
                    ) : null}
                  </label>
                  {projectId || selectedProjectId ? (
                    projectMembers.length > 0 ? (
                      <>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                          {projectMembers.map((employee) => {
                            const employeeId = employee._id?.toString
                              ? employee._id.toString()
                              : String(employee._id);
                            const isChecked = formData.assignedTo.some(
                              (id) => String(id) === employeeId
                            );
                            return (
                              <label
                                key={employeeId}
                                className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        assignedTo: [
                                          ...prev.assignedTo,
                                          employeeId,
                                        ],
                                      }));
                                    } else {
                                      setFormData((prev) => ({
                                        ...prev,
                                        assignedTo: prev.assignedTo.filter(
                                          (id) => String(id) !== employeeId
                                        ),
                                      }));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-200"
                                />
                                <span className="text-sm text-slate-700">
                                  {employee.name || "Unknown"}
                                </span>
                                <span className="text-xs text-slate-400">
                                  ({employee.email || "No email"})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {formData.assignedTo.length > 0 && (
                          <p className="mt-2 text-xs text-slate-500">
                            Selected: {formData.assignedTo.length} employee(s)
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                        <p className="text-sm text-slate-500">
                          No team members assigned to this project yet. Please
                          assign employees to the project first.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-sm text-slate-500">
                        Please select a project first to assign employees to
                        tasks.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (saving) return;
                    setShowCreateDialog(false);
                    setShowEditDialog(false);
                    setSelectedTask(null);
                    resetForm();
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title?.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {showCreateDialog ? "Creating…" : "Updating…"}
                    </>
                  ) : showCreateDialog ? (
                    "Create Task"
                  ) : (
                    "Update Task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail View Dialog */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px] transition-opacity"
            onClick={() => {
              setShowTaskDetail(false);
              setSelectedTask(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            className="relative z-10 flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-5xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Task details
                  </p>
                  <h2
                    id="task-detail-title"
                    className="text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {selectedTask.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${getStatusColor(
                        selectedTask.status
                      )}`}
                    >
                      {selectedTask.status.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${getPriorityColor(
                        selectedTask.priority
                      )}`}
                    >
                      {selectedTask.priority} priority
                    </span>
                    {selectedTask.category && (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600">
                        {selectedTask.category}
                      </span>
                    )}
                    {(selectedTask.comments?.length > 0 ||
                      selectedTask.attachments?.length > 0) && (
                      <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CommentIcon className="!text-sm" />
                          {selectedTask.comments?.length || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <AttachFileIcon className="!text-sm" />
                          {selectedTask.attachments?.length || 0}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close"
                >
                  <CancelIcon />
                </button>
              </div>

              {/* Quick actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    openEditDialog(selectedTask);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-900/15 transition-all hover:bg-blue-800 active:scale-[0.98]"
                >
                  <EditIcon className="!text-base" />
                  Edit task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    openProgressDialog(selectedTask);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
                >
                  <TimelineIcon className="!text-base" />
                  Update progress
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    setShowSubtaskManager(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
                >
                  <AssignmentIcon className="!text-base" />
                  Subtasks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    setShowDependencyManager(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 active:scale-[0.98]"
                >
                  <TimelineIcon className="!text-base" />
                  Dependencies
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
                {/* Main column */}
                <div className="space-y-5 px-4 py-5 sm:px-6 lg:col-span-7 xl:col-span-8">
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Description
                    </h3>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 sm:p-5">
                      {selectedTask.description ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {selectedTask.description}
                        </p>
                      ) : (
                        <p className="text-sm italic text-slate-400">
                          No description provided for this task.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Mobile progress strip */}
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:hidden">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Progress
                      </h3>
                      <span className="text-lg font-semibold tabular-nums text-blue-900">
                        {selectedTask.progress || 0}%
                      </span>
                    </div>
                    <div
                      className="h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-slate-100"
                      onClick={() => {
                        setShowTaskDetail(false);
                        openProgressDialog(selectedTask);
                      }}
                    >
                      <div
                        className="h-full rounded-full bg-blue-900 transition-all duration-500"
                        style={{ width: `${selectedTask.progress || 0}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Start
                        </p>
                        <p className="mt-0.5 font-medium text-slate-700">
                          {selectedTask.startDate
                            ? new Date(
                                selectedTask.startDate
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Due
                        </p>
                        <p
                          className={`mt-0.5 font-medium ${
                            selectedTask.dueDate &&
                            new Date(selectedTask.dueDate) < new Date() &&
                            selectedTask.status !== "completed"
                              ? "text-red-600"
                              : "text-slate-700"
                          }`}
                        >
                          {selectedTask.dueDate
                            ? new Date(
                                selectedTask.dueDate
                              ).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <TaskCommunicationPanel
                      taskId={selectedTask._id}
                      currentUser={currentUser}
                      task={selectedTask}
                      onUpdate={refreshSelectedTask}
                    />
                  </section>
                </div>

                {/* Sticky sidebar */}
                <aside className="border-t border-slate-100 bg-slate-50/70 px-4 py-5 sm:px-5 lg:col-span-5 lg:border-l lg:border-t-0 xl:col-span-4">
                  <div className="space-y-4 lg:sticky lg:top-0">
                    {/* Progress card — desktop */}
                    <div className="hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:block">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Progress
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskDetail(false);
                            openProgressDialog(selectedTask);
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-50"
                        >
                          Update
                        </button>
                      </div>
                      <div className="mb-3 flex items-end gap-3">
                        <span className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                          {selectedTask.progress || 0}
                          <span className="text-lg text-slate-400">%</span>
                        </span>
                        <span className="mb-1 text-xs text-slate-400">
                          complete
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-slate-100 transition-colors hover:bg-slate-200"
                        onClick={() => {
                          setShowTaskDetail(false);
                          openProgressDialog(selectedTask);
                        }}
                        title="Click to update progress"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-800 to-blue-600 transition-all duration-500"
                          style={{
                            width: `${selectedTask.progress || 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <ScheduleIcon className="!text-base text-slate-400" />
                        Schedule
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">
                            Start date
                          </span>
                          <span className="text-sm font-medium text-slate-800">
                            {selectedTask.startDate
                              ? new Date(
                                  selectedTask.startDate
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Not set"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">
                            Due date
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              selectedTask.dueDate &&
                              new Date(selectedTask.dueDate) < new Date() &&
                              selectedTask.status !== "completed"
                                ? "text-red-600"
                                : "text-slate-800"
                            }`}
                          >
                            {selectedTask.dueDate
                              ? new Date(
                                  selectedTask.dueDate
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Not set"}
                          </span>
                        </div>
                        {selectedTask.dueDate &&
                          new Date(selectedTask.dueDate) < new Date() &&
                          selectedTask.status !== "completed" && (
                            <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                              This task is overdue
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Team */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <PersonIcon className="!text-base text-slate-400" />
                        Team
                      </h3>
                      {selectedTask.assignedEmployees &&
                      selectedTask.assignedEmployees.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedTask.assignedEmployees.map((emp) => (
                            <li
                              key={emp._id}
                              className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">
                                {emp.name?.charAt(0) || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {emp.name}
                                </p>
                                <p className="truncate text-[11px] text-slate-400">
                                  {emp.email}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                          No one assigned yet
                        </p>
                      )}
                    </div>

                    {/* Subtasks */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          <AssignmentIcon className="!text-base text-slate-400" />
                          Subtasks
                        </h3>
                        {selectedTask.subtasks?.length > 0 && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {
                              selectedTask.subtasks.filter(
                                (st) => st.status === "completed"
                              ).length
                            }
                            /{selectedTask.subtasks.length}
                          </span>
                        )}
                      </div>
                      {selectedTask.subtasks &&
                      selectedTask.subtasks.length > 0 ? (
                        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                          {selectedTask.subtasks.map((subtask, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 rounded-lg px-1 py-1.5"
                            >
                              <CheckCircleIcon
                                className={`mt-0.5 shrink-0 ${
                                  subtask.status === "completed"
                                    ? "text-emerald-500"
                                    : "text-slate-300"
                                }`}
                                fontSize="small"
                              />
                              <span
                                className={`text-sm leading-snug ${
                                  subtask.status === "completed"
                                    ? "text-slate-400 line-through"
                                    : "text-slate-700"
                                }`}
                              >
                                {subtask.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTaskDetail(false);
                            setShowSubtaskManager(true);
                          }}
                          className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs font-medium text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-800"
                        >
                          Add subtasks
                        </button>
                      )}
                    </div>

                    {/* Meta */}
                    {(selectedTask.tags?.length > 0 ||
                      selectedTask.dependencies?.length > 0) && (
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <h3 className="mb-3 text-sm font-semibold text-slate-900">
                          More info
                        </h3>
                        {selectedTask.dependencies?.length > 0 && (
                          <div className="mb-3 flex items-center justify-between text-sm">
                            <span className="text-slate-500">Dependencies</span>
                            <span className="font-medium text-slate-800">
                              {selectedTask.dependencies.length}
                            </span>
                          </div>
                        )}
                        {selectedTask.tags?.length > 0 && (
                          <div>
                            <p className="mb-1.5 text-xs text-slate-500">Tags</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTask.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6">
              <p className="hidden text-xs text-slate-400 sm:block">
                Press Esc to close
              </p>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Dialog */}
      {showProgressDialog && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => {
              if (updatingProgress) return;
              setShowProgressDialog(false);
              setSelectedTask(null);
              setProgressUpdate(0);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:mx-4 sm:rounded-2xl">
            <h2 className="mb-1 text-xl font-semibold text-slate-900">
              Update Progress
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              Adjust completion and save when ready
            </p>

            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <h3 className="mb-2 text-sm font-medium text-slate-800">
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
                  if (updatingProgress) return;
                  setShowProgressDialog(false);
                  setSelectedTask(null);
                  setProgressUpdate(0);
                }}
                disabled={updatingProgress}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleProgressUpdate(selectedTask._id, progressUpdate)
                }
                disabled={updatingProgress}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
              >
                {updatingProgress ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update Progress"
                )}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setShowMonitoringDashboard(false)}
          />
          <div className="relative z-10 m-0 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:m-4 sm:max-w-7xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Monitoring
                </h2>
                <p className="text-xs text-slate-500">
                  Track task health across the project
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMonitoringDashboard(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <CancelIcon />
              </button>
            </div>
            <TaskMonitoringDashboard
              projectId={selectedProjectId}
              tasks={tasks}
              employees={employees}
              teams={[]}
              onRefresh={() => fetchTasks({ silent: true })}
            />
          </div>
        </div>
      )}

      {/* Task Progress Audits */}
      {showProgressAudits && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setShowProgressAudits(false)}
          />
          <div className="relative z-10 m-0 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:m-4 sm:max-w-7xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  Progress Audits
                </h2>
                <p className="text-xs text-slate-500">
                  Review historical progress changes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProgressAudits(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <CancelIcon />
              </button>
            </div>
            <TaskProgressAudits projectId={selectedProjectId} />
          </div>
        </div>
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
