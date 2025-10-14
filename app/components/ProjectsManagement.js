"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus as AddIcon,
  MoreVertical as MoreVertIcon,
  Edit2 as EditIcon,
  Trash as DeleteIcon,
  Users as PeopleIcon,
  Activity as TimelineIcon,
  Bell as NotificationsIcon,
  Calendar as CalendarIcon,
  Search as SearchIcon,
  Flag as FlagIcon,
  Eye as VisibilityIcon,
  DollarSign as CurrencyDollarIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  validateForm,
  hasFormErrors,
} from "../utils/formValidation";
import {
  showValidationErrors,
  handleFormSubmission,
  showDeleteConfirmDialog,
  projectToasts,
} from "../utils/sweetAlert";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const CATEGORY_OPTIONS = [{ value: "all", label: "All Categories" }];

function getStatusColor(status) {
  switch (status) {
    case "not_started":
      return "default";
    case "in_progress":
      return "primary";
    case "completed":
      return "success";
    case "on_hold":
      return "warning";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function formatStatus(status) {
  if (!status || typeof status !== "string") return "";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const initialFormData = {
  name: "",
  description: "",
  category: "",
  categoryId: "",
  startDate: "",
  endDate: "",
};

export default function ProjectsManagement() {
  const [projects, setProjects] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBudgetBanner, setShowBudgetBanner] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedProjectForStatus, setSelectedProjectForStatus] =
    useState(null);
  const [openProgressDialog, setOpenProgressDialog] = useState(false);
  const [selectedProjectForProgress, setSelectedProjectForProgress] =
    useState(null);
  const [progressValue, setProgressValue] = useState(0);

  // For closing menu on outside click
  const menuRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    fetchProjectCategories();

    // Budget banner logic
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get("from") === "budget" ||
      urlParams.get("tab") === "budget"
    ) {
      setShowBudgetBanner(true);
      setTimeout(() => setShowBudgetBanner(false), 5000);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (anchorEl && menuRef.current && !menuRef.current.contains(e.target)) {
        setAnchorEl(null);
        setSelectedProjectId(null);
      }
    }
    if (anchorEl) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorEl]);

  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      setError("Error fetching projects: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjectCategories() {
    try {
      const res = await fetch("/api/project-categories");
      const data = await res.json();
      if (data.success) {
        setProjectCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Error fetching project categories:", err);
    }
  }

  function handleOpenMenu(e, projectId) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setSelectedProjectId(projectId);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
    setSelectedProjectId(null);
  }

  function handleOpenDialog(project = null) {
    if (project) {
      setCurrentProject(project);
      setFormData({
        name: project.name || "",
        description: project.description || "",
        category: project.category || "",
        categoryId: project.categoryId || "",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split("T")[0]
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setCurrentProject(null);
      setFormData(initialFormData);
    }
    setOpenDialog(true);
    handleCloseMenu();
  }

  function handleCloseDialog() {
    setOpenDialog(false);
    setCurrentProject(null);
    setFormData(initialFormData);
    setFormErrors({});
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error on change
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);
    try {
      // Client-side validation
      const validationRules = {
        name: {
          required: true,
          minLength: 3,
          maxLength: 100,
          requiredMessage: "Project name is required",
        },
        description: { maxLength: 500 },
        categoryId: {
          required: false, // Allow projects without categories
        },
        startDate: {
          required: true,
          requiredMessage: "Start date is required",
          custom: (value) => {
            try {
              const start = new Date(value);
              if (isNaN(start.getTime())) return "Invalid start date";
              // Allow past dates for projects that may have already started
            } catch {
              return "Invalid start date";
            }
            return null;
          },
        },
        endDate: {
          required: true,
          requiredMessage: "End date is required",
          custom: (value, fd) => {
            try {
              if (!fd.startDate) return null;
              const end = new Date(value);
              const start = new Date(fd.startDate);
              if (isNaN(end.getTime())) return "Invalid end date";
              if (end <= start) return "End date must be after start date";
            } catch {
              return "Invalid end date";
            }
            return null;
          },
        },
      };

      const errors = validateForm(formData, validationRules);
      if (hasFormErrors(errors)) {
        setFormErrors(errors);
        await showValidationErrors(errors);
        return;
      }

      const payload = {
        ...formData,
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : null,
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : null,
      };
      const url = currentProject
        ? `/api/projects/${currentProject._id}`
        : "/api/projects";
      const method = currentProject ? "PUT" : "POST";
      
      const result = await handleFormSubmission(async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        // Check if response is ok before parsing JSON
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Network error" }));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        return data;
      }, {
        loadingTitle: currentProject ? "Updating Project..." : "Creating Project...",
        successTitle: currentProject ? "Project Updated" : "Project Created",
        successText: currentProject ? "Project details updated successfully." : "Project created successfully.",
        errorTitle: "Save Failed",
        errorText: "Could not save project. Please try again.",
      });
      
      if (result?.success) {
        await fetchProjects();
        handleCloseDialog();
      }
    } catch (err) {
      console.error("Error saving project:", err);
      setError("Error saving project: " + (err?.message || err));
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) return;
    
    // Find the project to get its name for the confirmation dialog
    const project = projects.find((p) => p._id === selectedProjectId);
    const projectName = project?.name || "this project";
    
    try {
      // Show confirmation dialog
      const result = await showDeleteConfirmDialog(
        "Delete Project",
        `Are you sure you want to delete "${projectName}"? This action cannot be undone and will remove all associated data including budgets, expenses, milestones, and tasks.`,
        "Yes, delete it!",
        "Cancel"
      );
      
      // If user confirmed deletion
      if (result.isConfirmed) {
        const res = await fetch(`/api/projects/${selectedProjectId}`, {
          method: "DELETE",
        });
        
        // Check if response is ok before parsing JSON
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Network error" }));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data.success) {
          // Show success toast
          projectToasts.projectDeleted();
          await fetchProjects();
        } else {
          throw new Error(data.error || "Failed to delete project");
        }
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      // Show error toast
      projectToasts.projectError(err.message || "Failed to delete project");
      setError("Error deleting project: " + (err?.message || err));
    }
    handleCloseMenu();
  }

  function handleOpenStatusDialog() {
    const project = projects.find((p) => p._id === selectedProjectId);
    setSelectedProjectForStatus(project);
    setOpenStatusDialog(true);
    handleCloseMenu();
  }

  function handleCloseStatusDialog() {
    setOpenStatusDialog(false);
    setSelectedProjectForStatus(null);
  }

  async function handleStatusChange(newStatus) {
    if (!selectedProjectForStatus) return;
    try {
      setError(null);
      const result = await handleFormSubmission(async () => {
        const res = await fetch(`/api/projects/${selectedProjectForStatus._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        const data = await res.json();
        return data;
      }, {
        loadingTitle: "Updating Status...",
        successTitle: "Status Updated",
        successText: "Project status updated successfully.",
        errorTitle: "Update Failed",
        errorText: "Could not update status.",
      });
      if (result?.success) {
        await fetchProjects();
        handleCloseStatusDialog();
      }
    } catch (err) {
      setError("Error updating project status: " + (err?.message || err));
    }
  }

  function handleOpenProgressDialog() {
    const project = projects.find((p) => p._id === selectedProjectId);
    setSelectedProjectForProgress(project);
    setProgressValue(project?.progress || 0);
    setOpenProgressDialog(true);
    handleCloseMenu();
  }

  function handleCloseProgressDialog() {
    setOpenProgressDialog(false);
    setSelectedProjectForProgress(null);
    setProgressValue(0);
  }

  async function handleProgressUpdate() {
    if (!selectedProjectForProgress) return;
    try {
      setError(null);
      const result = await handleFormSubmission(async () => {
        const res = await fetch(
          `/api/projects/${selectedProjectForProgress._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progress: progressValue }),
          }
        );
        const data = await res.json();
        return data;
      }, {
        loadingTitle: "Updating Progress...",
        successTitle: "Progress Updated",
        successText: "Project progress updated successfully.",
        errorTitle: "Update Failed",
        errorText: "Could not update progress.",
      });
      if (result?.success) {
        await fetchProjects();
        handleCloseProgressDialog();
      }
    } catch (err) {
      setError("Error updating project progress: " + (err?.message || err));
    }
  }

  // Filtering logic
  const filteredProjects = projects
    .filter(
      (project) => statusFilter === "all" || project.status === statusFilter
    )
    .filter(
      (project) =>
        categoryFilter === "all" ||
        project.category === categoryFilter ||
        (project.categoryId &&
          projectCategories.find((cat) => cat._id === project.categoryId)
            ?.name === categoryFilter)
    )
    .filter(
      (project) =>
        searchTerm === "" ||
        (project.name &&
          project.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="border-4 border-gray-200 w-10 h-10 rounded-full border-l-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Budget Management Banner */}
      {showBudgetBanner && (
        <div className="mb-6 bg-gray-50 border border-gray-200 p-4 rounded-lg relative">
          <button
            onClick={() => setShowBudgetBanner(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close budget banner"
          >
            ×
          </button>
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Budget & Financial Management
              </h3>
              <p className="text-gray-600 text-sm">
                Select a project below to manage its budget, track expenses, and
                monitor financial performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage and track your project portfolio
          </p>
        </div>
        <div className="flex gap-3">
          <a
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-blue-200"
            href="/hrm?section=budget-management"
          >
            <CurrencyDollarIcon className="w-4 h-4" />
            Budget
          </a>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            onClick={() => handleOpenDialog()}
            type="button"
          >
            <AddIcon className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Projects
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <SearchIcon className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {projectCategories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          {filteredProjects.length} projects found
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800 font-medium mb-1">
            Error Loading Projects
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* No Projects / Results */}
      {projects.length === 0 && !loading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Projects Found
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first project to get started.
          </p>
          <button
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            type="button"
          >
            Create Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Projects Found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h2>
                    <div className="text-xs text-gray-500 mb-3">
                      #{project._id.slice(-6)}
                    </div>
                  </div>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => handleOpenMenu(e, project._id)}
                    type="button"
                    aria-label="Project menu"
                  >
                    <MoreVertIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Detail Button */}
                <div className="mb-4 flex justify-end">
                  <a
                    className="text-sm bg-blue-900 text-white hover:bg-blue-800 px-2 py-2  rounded-md no-underline flex items-center gap-1 transition-colors"
                    href={`/projects/${project._id}`}
                  >
                    <VisibilityIcon className="w-4 h-4" />
                    <span>View Details</span>
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                    {project.category ||
                      (project.categoryId &&
                        projectCategories.find(
                          (cat) => cat._id === project.categoryId
                        )?.name) ||
                      "Uncategorized"}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-md ${
                      getStatusColor(project.status || "not_started") ===
                      "success"
                        ? "bg-green-100 text-green-700"
                        : getStatusColor(project.status || "not_started") ===
                          "warning"
                        ? "bg-yellow-100 text-yellow-700"
                        : getStatusColor(project.status || "not_started") ===
                          "error"
                        ? "bg-red-100 text-red-700"
                        : getStatusColor(project.status || "not_started") ===
                          "primary"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {formatStatus(project.status || "not_started")}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {project.description || "No description available."}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {project.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {project.assignedEmployees?.length || 0}
                    </div>
                    <div className="text-xs text-gray-500">Team Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {project.startDate
                        ? (() => {
                            try {
                              return format(
                                parseISO(project.startDate),
                                "MMM d, yyyy"
                              );
                            } catch {
                              return "Not set";
                            }
                          })()
                        : "Not set"}
                    </div>
                    <div className="text-xs text-gray-500">Start Date</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {project.endDate
                        ? (() => {
                            try {
                              return format(
                                parseISO(project.endDate),
                                "MMM d, yyyy"
                              );
                            } catch {
                              return "Not set";
                            }
                          })()
                        : "Not set"}
                    </div>
                    <div className="text-xs text-gray-500">End Date</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    className="bg-orange-600 hover:bg-orange-300 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 no-underline border border-gray-300"
                    href={`/projects/${project._id}/milestones`}
                  >
                    <TimelineIcon className="w-4 h-4" />
                    <span>Milestones</span>
                  </a>
                  <a
                    className="bg-blue-800 hover:bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 no-underline border border-gray-300"
                    href={`/projects/${project._id}/team`}
                  >
                    <PeopleIcon className="w-4 h-4" />
                    <span>Team</span>
                  </a>
                  <a
                    className="bg-green-800 hover:bg-green-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 no-underline border border-gray-300"
                    href={`/project-budget/${project._id}`}
                  >
                    <CurrencyDollarIcon className="w-4 h-4" />
                    <span>Budget</span>
                  </a>
                  <a
                    className="bg-red-800 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 no-underline border border-gray-300"
                    href={`/project-alerts?projectId=${project._id}`}
                  >
                    <NotificationsIcon className="w-4 h-4" />
                    <span>Alerts</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Menu */}
      {anchorEl && (
        <div
          ref={menuRef}
          className="bg-white shadow-md border border-gray-100 rounded-md absolute z-50"
          style={{
            top: anchorEl.getBoundingClientRect().bottom + window.scrollY,
            left: anchorEl.getBoundingClientRect().left + window.scrollX,
          }}
        >
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={() => {
              const project = projects.find((p) => p._id === selectedProjectId);
              handleOpenDialog(project);
            }}
          >
            <EditIcon /> Edit
          </div>
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleOpenStatusDialog}
          >
            <FlagIcon /> Change Status
          </div>
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleOpenProgressDialog}
          >
            <TimelineIcon /> Update Progress
          </div>
          <div
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleDeleteProject}
          >
            <DeleteIcon /> Delete
          </div>
        </div>
      )}

      {/* Project Dialog */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentProject ? "Edit Project" : "Create New Project"}
              </h2>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={handleSubmit}
              autoComplete="off"
            >
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="name"
                >
                  Project Name
                </label>
                <input
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    formErrors.name
                      ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter project name..."
                  required
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 resize-vertical ${
                    formErrors.description
                      ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your project..."
                  rows={3}
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="categoryId"
                >
                  Category
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                    formErrors.categoryId
                      ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {projectCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formErrors.categoryId && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.categoryId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="startDate"
                  >
                    Start Date
                  </label>
                  <input
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                      formErrors.startDate
                        ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                    }`}
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    max={formData.endDate || undefined}
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 mb-1"
                    htmlFor="endDate"
                  >
                    End Date
                  </label>
                  <input
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${
                      formErrors.endDate
                        ? "border-red-500 focus:ring-red-400 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                    }`}
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || undefined}
                  />
                  {formErrors.endDate && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                  onClick={handleCloseDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  type="submit"
                >
                  {currentProject ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Context Menu */}
      {anchorEl && (
        <div
          ref={menuRef}
          className="bg-white shadow-md border border-gray-100 rounded-md absolute z-50"
          style={{
            top: anchorEl.getBoundingClientRect().bottom + window.scrollY,
            left: anchorEl.getBoundingClientRect().left + window.scrollX,
          }}
        >
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={() => {
              const project = projects.find((p) => p._id === selectedProjectId);
              handleOpenDialog(project);
            }}
          >
            <EditIcon /> Edit
          </div>
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleOpenStatusDialog}
          >
            <FlagIcon /> Change Status
          </div>
          <div
            className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleOpenProgressDialog}
          >
            <TimelineIcon /> Update Progress
          </div>
          <div
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer transition-colors"
            onClick={handleDeleteProject}
          >
            <DeleteIcon /> Delete
          </div>
        </div>
      )}
      {/* Status Change Dialog */}
      {openStatusDialog && selectedProjectForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FlagIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Change Project Status
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Update the status for "{selectedProjectForStatus.name}"
              </p>
              <div className="space-y-2">
                {STATUS_OPTIONS.filter((o) => o.value !== "all").map(
                  (option) => {
                    const isCurrent =
                      selectedProjectForStatus.status === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`w-full p-3 rounded-md border text-left flex items-center gap-3 transition-colors ${
                          isCurrent
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={() => handleStatusChange(option.value)}
                        disabled={isCurrent}
                        type="button"
                      >
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        {isCurrent && (
                          <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-gray-200">
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                onClick={handleCloseStatusDialog}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Update Dialog */}
      {openProgressDialog && selectedProjectForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TimelineIcon className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Update Project Progress
                </h2>
              </div>
              <p className="text-gray-600 mb-4">
                Update the progress for "{selectedProjectForProgress.name}"
              </p>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">Progress</span>
                  <span className="text-sm font-medium text-gray-900">
                    {progressValue}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${progressValue}%` }}
                  ></div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-gray-200">
              <button
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
                onClick={handleCloseProgressDialog}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                onClick={handleProgressUpdate}
                type="button"
              >
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
