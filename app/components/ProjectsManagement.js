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
  Search as SearchIcon,
  Flag as FlagIcon,
  Eye as VisibilityIcon,
  DollarSign as CurrencyDollarIcon,
  FolderKanban,
  X as CloseIcon,
  Loader2,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import {
  projectToasts,
  showErrorToast,
  showWarningToast,
  showDeleteConfirmDialog,
  showSuccessToast,
} from "../utils/sweetAlert";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const statusBadge = {
  not_started: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  in_progress: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  cancelled: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function formatStatus(status) {
  if (!status || typeof status !== "string") return "";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDateSafe(dateValue) {
  if (!dateValue) return "Not set";
  try {
    const date =
      typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    return isValid(date) ? format(date, "MMM d, yyyy") : "Not set";
  } catch {
    return "Not set";
  }
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
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBudgetBanner, setShowBudgetBanner] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedProjectForStatus, setSelectedProjectForStatus] =
    useState(null);
  const [openProgressDialog, setOpenProgressDialog] = useState(false);
  const [selectedProjectForProgress, setSelectedProjectForProgress] =
    useState(null);
  const [progressValue, setProgressValue] = useState(0);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    fetchProjectCategories();

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
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        showErrorToast(
          "Load Failed",
          data.error || "Failed to fetch projects"
        );
      }
    } catch (err) {
      showErrorToast(
        "Load Failed",
        "Error fetching projects: " + (err?.message || err)
      );
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
    if (saving) return;
    setOpenDialog(false);
    setCurrentProject(null);
    setFormData(initialFormData);
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (saving) return;

    if (!formData.name.trim()) {
      showWarningToast("Missing Name", "Please enter a project name");
      return;
    }
    if (!formData.categoryId) {
      showWarningToast("Missing Category", "Please select a category");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        name: formData.name.trim(),
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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (currentProject) {
          projectToasts.projectUpdated();
        } else {
          projectToasts.projectCreated();
        }
        await fetchProjects();
        setOpenDialog(false);
        setCurrentProject(null);
        setFormData(initialFormData);
      } else {
        projectToasts.projectError(data.error || "Failed to save project");
      }
    } catch (err) {
      projectToasts.projectError(
        "Error saving project: " + (err?.message || err)
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) return;

    const project = projects.find((p) => p._id === selectedProjectId);
    const result = await showDeleteConfirmDialog(
      "Delete project?",
      `Delete "${project?.name || "this project"}"? This cannot be undone.`,
      "Yes, delete it"
    );

    if (!result.isConfirmed) {
      handleCloseMenu();
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        projectToasts.projectDeleted();
        await fetchProjects();
      } else {
        projectToasts.projectError(data.error || "Failed to delete project");
      }
    } catch (err) {
      projectToasts.projectError(
        "Error deleting project: " + (err?.message || err)
      );
    } finally {
      setDeleting(false);
      handleCloseMenu();
    }
  }

  function handleOpenStatusDialog() {
    const project = projects.find((p) => p._id === selectedProjectId);
    setSelectedProjectForStatus(project);
    setOpenStatusDialog(true);
    handleCloseMenu();
  }

  function handleCloseStatusDialog() {
    if (updatingStatus) return;
    setOpenStatusDialog(false);
    setSelectedProjectForStatus(null);
  }

  async function handleStatusChange(newStatus) {
    if (!selectedProjectForStatus || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/projects/${selectedProjectForStatus._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast(
          "Status Updated!",
          `Project status changed to ${formatStatus(newStatus)}`
        );
        await fetchProjects();
        setOpenStatusDialog(false);
        setSelectedProjectForStatus(null);
      } else {
        projectToasts.projectError(
          data.error || "Failed to update project status"
        );
      }
    } catch (err) {
      projectToasts.projectError(
        "Error updating project status: " + (err?.message || err)
      );
    } finally {
      setUpdatingStatus(false);
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
    if (updatingProgress) return;
    setOpenProgressDialog(false);
    setSelectedProjectForProgress(null);
    setProgressValue(0);
  }

  async function handleProgressUpdate() {
    if (!selectedProjectForProgress || updatingProgress) return;
    try {
      setUpdatingProgress(true);
      const res = await fetch(
        `/api/projects/${selectedProjectForProgress._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress: progressValue }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast(
          "Progress Updated!",
          `Progress set to ${progressValue}%`
        );
        await fetchProjects();
        setOpenProgressDialog(false);
        setSelectedProjectForProgress(null);
        setProgressValue(0);
      } else {
        projectToasts.projectError(
          data.error || "Failed to update project progress"
        );
      }
    } catch (err) {
      projectToasts.projectError(
        "Error updating project progress: " + (err?.message || err)
      );
    } finally {
      setUpdatingProgress(false);
    }
  }

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

  const getCategoryName = (project) =>
    project.category ||
    (project.categoryId &&
      projectCategories.find((cat) => cat._id === project.categoryId)?.name) ||
    "Uncategorized";

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-3">
        <div className="h-11 w-11 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
        <p className="text-sm text-slate-500 animate-pulse">Loading projects…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 -m-6 p-6">
      {showBudgetBanner && (
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
          <button
            onClick={() => setShowBudgetBanner(false)}
            className="absolute top-3 right-3 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600 transition-colors"
            aria-label="Close budget banner"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
              <CurrencyDollarIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Budget & Financial Management
              </h3>
              <p className="text-sm text-slate-600">
                Select a project below to manage its budget and track expenses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
              <FolderKanban className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Projects
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage and track your project portfolio
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 transition-all hover:bg-blue-100"
            href="/hrm?section=budget-management"
          >
            <CurrencyDollarIcon className="w-4 h-4" />
            Budget
          </a>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-md active:scale-[0.98]"
            onClick={() => handleOpenDialog()}
            type="button"
          >
            <AddIcon className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Search
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Categories</option>
              {projectCategories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">
            {filteredProjects.length}
          </span>{" "}
          project{filteredProjects.length === 1 ? "" : "s"} found
        </p>
      </div>

      {/* Empty / list */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FolderKanban className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">No projects yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create your first project to get started.
          </p>
          <button
            onClick={() => handleOpenDialog()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-blue-900/20 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 transition-all hover:bg-blue-100 active:scale-[0.98]"
            type="button"
          >
            <AddIcon className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
          <h3 className="text-lg font-medium text-slate-700">No matches</h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your filters or search terms.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredProjects.map((project) => {
            const statusKey = project.status || "not_started";
            return (
              <div
                key={project._id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold text-slate-900">
                        {project.name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        #{project._id.slice(-6)}
                      </p>
                    </div>
                    <button
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                      onClick={(e) => handleOpenMenu(e, project._id)}
                      type="button"
                      disabled={deleting}
                      aria-label="Project menu"
                    >
                      {deleting && selectedProjectId === project._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {getCategoryName(project)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        statusBadge[statusKey] || statusBadge.not_started
                      }`}
                    >
                      {formatStatus(statusKey)}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm text-slate-500">
                    {project.description || "No description available."}
                  </p>

                  <div className="mb-4">
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-slate-600">
                        Progress
                      </span>
                      <span className="font-semibold text-slate-900">
                        {project.progress || 0}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-center">
                      <div className="text-base font-semibold text-slate-900">
                        {project.assignedEmployees?.length || 0}
                      </div>
                      <div className="text-[11px] text-slate-500">Team</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-slate-800">
                        {formatDateSafe(project.startDate)}
                      </div>
                      <div className="text-[11px] text-slate-500">Start</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-slate-800">
                        {formatDateSafe(project.endDate)}
                      </div>
                      <div className="text-[11px] text-slate-500">End</div>
                    </div>
                  </div>

                  <a
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-3 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 active:scale-[0.98]"
                    href={`/projects/${project._id}`}
                  >
                    <VisibilityIcon className="h-4 w-4" />
                    View Details
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-3">
                  <a
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 hover:shadow active:scale-[0.98]"
                    href={`/projects/${project._id}/milestones`}
                  >
                    <TimelineIcon className="h-3.5 w-3.5" />
                    Milestones
                  </a>
                  <a
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 hover:shadow active:scale-[0.98]"
                    href={`/projects/${project._id}/team`}
                  >
                    <PeopleIcon className="h-3.5 w-3.5" />
                    Team
                  </a>
                  <a
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 hover:shadow active:scale-[0.98]"
                    href={`/project-budget/${project._id}`}
                  >
                    <CurrencyDollarIcon className="h-3.5 w-3.5" />
                    Budget
                  </a>
                  <a
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-900 hover:bg-blue-50 hover:text-blue-900 hover:shadow active:scale-[0.98]"
                    href={`/project-alerts?projectId=${project._id}`}
                  >
                    <NotificationsIcon className="h-3.5 w-3.5" />
                    Alerts
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {anchorEl && (
        <div
          ref={menuRef}
          className="absolute z-50 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          style={{
            top: anchorEl.getBoundingClientRect().bottom + window.scrollY + 4,
            left: Math.min(
              anchorEl.getBoundingClientRect().left + window.scrollX,
              window.innerWidth - 200
            ),
          }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => {
              const project = projects.find((p) => p._id === selectedProjectId);
              handleOpenDialog(project);
            }}
          >
            <EditIcon className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            onClick={handleOpenStatusDialog}
          >
            <FlagIcon className="h-4 w-4" /> Change Status
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            onClick={handleOpenProgressDialog}
          >
            <TimelineIcon className="h-4 w-4" /> Update Progress
          </button>
          <button
            type="button"
            disabled={deleting}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            onClick={handleDeleteProject}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DeleteIcon className="h-4 w-4" />
            )}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}

      {/* Create / Edit modal */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={handleCloseDialog}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {currentProject ? "Edit Project" : "Create Project"}
                </h2>
                <p className="text-xs text-slate-500">
                  {currentProject
                    ? "Update project details"
                    : "Add a new project to your portfolio"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={saving}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-1 flex-col overflow-hidden"
              autoComplete="off"
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="name"
                  >
                    Project Name *
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter project name…"
                    required
                    disabled={saving}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your project…"
                    rows={3}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="categoryId"
                  >
                    Category *
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select Category</option>
                    {projectCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="startDate"
                    >
                      Start Date
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      max={formData.endDate || undefined}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="endDate"
                    >
                      End Date
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || undefined}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                  onClick={handleCloseDialog}
                  type="button"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {currentProject ? "Updating…" : "Creating…"}
                    </>
                  ) : currentProject ? (
                    "Update"
                  ) : (
                    <>
                      <AddIcon className="h-4 w-4" />
                      Create
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status dialog */}
      {openStatusDialog && selectedProjectForStatus && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={handleCloseStatusDialog}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:rounded-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <FlagIcon className="h-5 w-5 text-blue-900" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Change Status
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Update status for &quot;{selectedProjectForStatus.name}&quot;
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              {STATUS_OPTIONS.filter((o) => o.value !== "all").map((option) => {
                const isCurrent =
                  selectedProjectForStatus.status === option.value;
                return (
                  <button
                    key={option.value}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all disabled:opacity-60 ${
                      isCurrent
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isCurrent || updatingStatus}
                    type="button"
                  >
                    {updatingStatus && !isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
                    ) : null}
                    <span className="font-medium">{option.label}</span>
                    {isCurrent && (
                      <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <button
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={handleCloseStatusDialog}
                type="button"
                disabled={updatingStatus}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress dialog */}
      {openProgressDialog && selectedProjectForProgress && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={handleCloseProgressDialog}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:rounded-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <TimelineIcon className="h-5 w-5 text-blue-900" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Update Progress
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Update progress for &quot;{selectedProjectForProgress.name}
                &quot;
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
                  {progressValue}%
                </span>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progressValue}
                onChange={(e) => setProgressValue(parseInt(e.target.value, 10))}
                disabled={updatingProgress}
                className="w-full accent-blue-900 disabled:opacity-60"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={handleCloseProgressDialog}
                type="button"
                disabled={updatingProgress}
              >
                Cancel
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
                onClick={handleProgressUpdate}
                type="button"
                disabled={updatingProgress}
              >
                {updatingProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  );
}
