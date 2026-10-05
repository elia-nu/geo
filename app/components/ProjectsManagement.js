"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Sliders,
  Wallet,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import Link from "next/link";
import dynamic from "next/dynamic";
import Pagination from "./ui/Pagination";
import { formatCurrency as formatCurrencyUtil, currencyTitle } from "../utils/currency";
import {
  projectToasts,
  showErrorToast,
  showWarningToast,
  showDeleteConfirmDialog,
  showSuccessToast,
} from "../utils/sweetAlert";
import { usePermissions } from "../hooks/usePermissions";

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
  const { hasPermission, user } = usePermissions();
  const canReadAll = hasPermission("project.read") || hasPermission("project.manage");
  const canReadAssigned = canReadAll || hasPermission("project.read.assigned") || hasPermission("project.read.own");
  const isAssignedOnly = !canReadAll && canReadAssigned;

  const [projects, setProjects] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all"); // "all" | "assigned"
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showBudgetBanner, setShowBudgetBanner] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [sortBy, setSortBy] = useState("updated"); // "updated" | "progress_desc" | "progress_asc" | "start_date" | "name"
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

  // Project photo upload states
  const [projectImageFile, setProjectImageFile] = useState(null);
  const [projectImagePreview, setProjectImagePreview] = useState(null);
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const modalFileInputRef = useRef(null);

  const menuRef = useRef(null);

  useEffect(() => {
    if (canReadAssigned) {
      fetchProjects();
      fetchProjectCategories();
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get("from") === "budget" ||
      urlParams.get("tab") === "budget"
    ) {
      setShowBudgetBanner(true);
      setTimeout(() => setShowBudgetBanner(false), 5000);
    }
  }, [canReadAssigned, scopeFilter]);

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

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  async function fetchProjects() {
    try {
      setLoading(true);
      const url = (!canReadAll || scopeFilter === "assigned")
        ? "/api/projects?assignedOnly=true"
        : "/api/projects";
      const res = await fetch(url, {
        headers: { ...getAuthHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects || []);
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
      setProjectImagePreview(project.imageUrl || null);
    } else {
      setCurrentProject(null);
      setFormData(initialFormData);
      setProjectImagePreview(null);
    }
    setProjectImageFile(null);
    setRemoveImageFlag(false);
    setOpenDialog(true);
    handleCloseMenu();
  }

  function handleCloseDialog() {
    if (saving) return;
    setOpenDialog(false);
    setCurrentProject(null);
    setFormData(initialFormData);
    setProjectImageFile(null);
    setProjectImagePreview(null);
    setRemoveImageFlag(false);
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
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        const savedProjectId = currentProject
          ? currentProject._id
          : data.project?._id || data.projectId || data._id;

        if (projectImageFile && savedProjectId) {
          try {
            const imgFormData = new FormData();
            imgFormData.append("image", projectImageFile);
            await fetch(`/api/projects/${savedProjectId}/photo`, {
              method: "POST",
              headers: { ...getAuthHeaders() },
              body: imgFormData,
            });
          } catch (imgErr) {
            console.warn("Failed to upload project photo:", imgErr);
          }
        } else if (removeImageFlag && savedProjectId) {
          try {
            await fetch(`/api/projects/${savedProjectId}/photo`, {
              method: "DELETE",
              headers: { ...getAuthHeaders() },
            });
          } catch (imgErr) {
            console.warn("Failed to delete project photo:", imgErr);
          }
        }

        if (currentProject) {
          projectToasts.projectUpdated();
        } else {
          projectToasts.projectCreated();
        }
        await fetchProjects();
        setOpenDialog(false);
        setCurrentProject(null);
        setFormData(initialFormData);
        setProjectImageFile(null);
        setProjectImagePreview(null);
        setRemoveImageFlag(false);
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
        headers: {
          ...getAuthHeaders(),
        },
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
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
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
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
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

  const projectMetrics = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const onHold = projects.filter((p) => p.status === "on_hold").length;
    const notStarted = projects.filter((p) => !p.status || p.status === "not_started").length;
    const totalTeam = projects.reduce((sum, p) => sum + (p.assignedEmployees?.length || 0), 0);
    const totalBudget = projects.reduce((sum, p) => {
      const b = p.budget?.totalAmount || p.budget?.amount || p.budget || 0;
      return sum + (Number(b) || 0);
    }, 0);
    const budgetedCount = projects.filter((p) => {
      const b = p.budget?.totalAmount || p.budget?.amount || p.budget;
      return Number(b) > 0;
    }).length;
    return { total, inProgress, completed, onHold, notStarted, totalTeam, totalBudget, budgetedCount };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects
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
            project.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (project.description &&
            project.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    if (sortBy === "progress_desc") {
      result.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else if (sortBy === "progress_asc") {
      result.sort((a, b) => (a.progress || 0) - (b.progress || 0));
    } else if (sortBy === "start_date") {
      result.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0)
      );
    }
    return result;
  }, [projects, statusFilter, categoryFilter, searchTerm, sortBy, projectCategories]);

  const totalPages = Math.ceil((filteredProjects.length || 0) / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const getCategoryName = (project) =>
    project.category ||
    (project.categoryId &&
      projectCategories.find((cat) => cat._id === project.categoryId)?.name) ||
    "Uncategorized";

  const getProjectBudgetAmount = (project) => {
    if (!project?.budget) return 0;
    if (typeof project.budget === "number") return project.budget;
    return Number(project.budget.totalAmount || project.budget.amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 -m-6 p-6 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-slate-200" />
              <div className="h-8 w-44 rounded-lg bg-slate-200" />
            </div>
            <div className="h-4 w-72 rounded bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* 4 KPI Metric Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-7 w-7 rounded-lg bg-slate-100" />
              </div>
              <div className="h-7 w-20 bg-slate-200 rounded-md" />
              <div className="h-2 w-full bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>

        {/* Filter Bar Skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
          </div>
        </div>

        {/* 6 Project Cards Grid Skeleton */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="h-5 w-48 bg-slate-200 rounded-md" />
                  <div className="h-3 w-24 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-100 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-slate-100 rounded" />
                <div className="h-3.5 w-4/5 bg-slate-100 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                  <div className="h-3 w-10 bg-slate-100 rounded" />
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5">
                <div className="h-8 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
              <div className="h-9 w-full bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!canReadAssigned) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center max-w-lg mx-auto my-12 border border-slate-100">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-4 text-sm leading-relaxed">
          You do not have permission to view projects. Contact your administrator to request{" "}
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
            project.read
          </code>{" "}
          or{" "}
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
            project.read.assigned
          </code>{" "}
          permission.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 -m-6 p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
            <FolderKanban className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Projects
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                {projects.length} {projects.length === 1 ? "project" : "projects"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Overview and manage organizational projects, timelines, and delivery teams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission("project.create") && (
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-md active:scale-[0.98]"
              onClick={() => handleOpenDialog()}
              type="button"
            >
              <AddIcon className="w-4 h-4" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`text-left p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
            statusFilter === "all"
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Projects
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-800">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {projectMetrics.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across organization</p>
        </button>

        {/* In Progress */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
          className={`text-left p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
            statusFilter === "in_progress"
              ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-500/20"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
              In Progress
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-sky-900 tracking-tight">
            {projectMetrics.inProgress}
          </div>
          <p className="text-[11px] text-sky-600 mt-0.5">Active delivery</p>
        </button>

        {/* Completed */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
          className={`text-left p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
            statusFilter === "completed"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Completed
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 tracking-tight">
            {projectMetrics.completed}
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Successfully delivered</p>
        </button>

        {/* On Hold */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "on_hold" ? "all" : "on_hold")}
          className={`text-left p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
            statusFilter === "on_hold"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              On Hold
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-900 tracking-tight">
            {projectMetrics.onHold}
          </div>
          <p className="text-[11px] text-amber-600 mt-0.5">Pending review</p>
        </button>
      </div>

      {/* Control Bar: Search, Scope, Category, Status, Sort & View Toggle */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, description, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Categories</option>
              {projectCategories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="updated">Recently Updated</option>
              <option value="progress_desc">Progress: High to Low</option>
              <option value="progress_asc">Progress: Low to High</option>
              <option value="start_date">Start Date: Newest</option>
              <option value="name">Name (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Bottom toolbar row: view toggles & active filter chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredProjects.length}</strong> of{" "}
              <strong className="text-slate-800">{projects.length}</strong> projects
            </span>
            {(statusFilter !== "all" || categoryFilter !== "all" || searchTerm || scopeFilter !== "all") && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSearchTerm("");
                  setScopeFilter("all");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-colors"
              >
                <CloseIcon className="w-3 h-3" />
                Reset filters
              </button>
            )}
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-blue-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Projects List: Grid or Table */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FolderKanban className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No projects yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Create your first project to begin tracking milestones, team assignments, and budgets.
          </p>
          {hasPermission("project.create") && (
            <button
              onClick={() => handleOpenDialog()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-800 shadow-sm active:scale-[0.98]"
              type="button"
            >
              <AddIcon className="w-4 h-4" />
              Create Project
            </button>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center space-y-3">
          <h3 className="text-lg font-bold text-slate-800">No matching projects found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or clearing status and category filters.
          </p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setCategoryFilter("all");
              setSearchTerm("");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {paginatedProjects.map((project) => {
              const statusKey = project.status || "not_started";
              const budgetAmt = getProjectBudgetAmount(project);
              return (
                <div
                  key={project._id}
                  className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:shadow-lg hover:border-slate-300 flex flex-col justify-between"
                >
                  {project.imageUrl && (
                    <Link
                      href={`/projects/${project._id}`}
                      className="block relative h-40 w-full overflow-hidden bg-slate-100 group/img"
                    >
                      <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/10 to-transparent" />
                    </Link>
                  )}
                  <div className="p-5 flex-1">
                    {/* Header: Name, code, menu */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/projects/${project._id}`}
                          className="block group-hover:text-blue-900 transition-colors"
                        >
                          <h2 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-900">
                            {project.name}
                          </h2>
                        </Link>
                        <p className="mt-0.5 text-xs font-mono text-slate-400">
                          #{project._id.slice(-6)}
                        </p>
                      </div>

                      {(hasPermission("project.update") || hasPermission("project.delete")) && (
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
                      )}
                    </div>

                    {/* Badges: Category, Interactive Status, Budget */}
                    <div className="mb-3.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {getCategoryName(project)}
                      </span>

                      {/* Interactive Status Pill - click to quick change */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectForStatus(project);
                          setOpenStatusDialog(true);
                        }}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                          statusBadge[statusKey] || statusBadge.not_started
                        }`}
                        title="Click to quickly change status"
                      >
                        {formatStatus(statusKey)}
                      </button>

                      {/* Budget Badge with direct link */}
                      {budgetAmt > 0 ? (
                        <Link
                          href={`/project-budget/${project._id}`}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title="View Budget Hub"
                        >
                          <CurrencyDollarIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatCurrencyUtil(budgetAmt)}</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/project-budget/${project._id}`}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-colors"
                          title="Set Project Budget"
                        >
                          <CurrencyDollarIcon className="w-3 h-3 text-slate-400" />
                          <span>No Budget</span>
                        </Link>
                      )}
                    </div>

                    <p className="mb-4 line-clamp-2 text-xs text-slate-500 leading-relaxed min-h-[2rem]">
                      {project.description || "No description provided for this project."}
                    </p>

                    {/* Progress Bar with quick update button */}
                    <div className="mb-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Progress</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectForProgress(project);
                            setProgressValue(project.progress || 0);
                            setOpenProgressDialog(true);
                          }}
                          className="font-extrabold text-blue-900 hover:underline cursor-pointer flex items-center gap-1"
                          title="Click to update progress"
                        >
                          <span>{project.progress || 0}%</span>
                          <EditIcon className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (project.progress || 0) >= 100
                              ? "bg-emerald-500"
                              : (project.progress || 0) >= 50
                              ? "bg-blue-600"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Metadata bar: Team, Start, End */}
                    <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {project.assignedEmployees?.length || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Team</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700 truncate">
                          {formatDateSafe(project.startDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">Start</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700 truncate">
                          {formatDateSafe(project.endDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">End</div>
                      </div>
                    </div>

                    {/* Primary Button */}
                    <Link
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-blue-800 active:scale-[0.98] shadow-xs"
                      href={`/projects/${project._id}`}
                    >
                      <VisibilityIcon className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </Link>
                  </div>

                  {/* 4 Bottom Quick Action Links */}
                  <div className="grid grid-cols-4 gap-1 border-t border-slate-200 bg-slate-50/70 p-2">
                    <Link
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-2xs hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition-all text-center"
                      href={`/projects/${project._id}/milestones`}
                      title="Milestones"
                    >
                      <TimelineIcon className="h-3 w-3 text-slate-400" />
                      <span>Milestones</span>
                    </Link>

                    <Link
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-2xs hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 transition-all text-center"
                      href={`/projects/${project._id}/team`}
                      title="Team Members"
                    >
                      <PeopleIcon className="h-3 w-3 text-slate-400" />
                      <span>Team</span>
                    </Link>

                    <Link
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-emerald-800 border border-emerald-200 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-all text-center"
                      href={`/project-budget/${project._id}`}
                      title="Project Budget Hub"
                    >
                      <CurrencyDollarIcon className="h-3 w-3 text-emerald-600" />
                      <span>Budget</span>
                    </Link>

                    <Link
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-2xs hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition-all text-center"
                      href={`/project-alerts?projectId=${project._id}`}
                      title="Alerts"
                    >
                      <NotificationsIcon className="h-3 w-3 text-slate-400" />
                      <span>Alerts</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz);
              setCurrentPage(1);
            }}
          />
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Project</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4 text-right">Budget</th>
                  <th className="p-4 text-center">Team</th>
                  <th className="p-4">Timeline</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProjects.map((project) => {
                  const statusKey = project.status || "not_started";
                  const budgetAmt = getProjectBudgetAmount(project);
                  return (
                    <tr key={project._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Link href={`/projects/${project._id}`} className="shrink-0">
                            {project.imageUrl ? (
                              <img
                                src={project.imageUrl}
                                alt={project.name}
                                className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-900 border border-blue-100 flex items-center justify-center font-bold text-xs">
                                {project.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link
                              href={`/projects/${project._id}`}
                              className="font-bold text-slate-900 hover:text-blue-900 block truncate max-w-xs"
                            >
                              {project.name}
                            </Link>
                            <span className="text-[11px] font-mono text-slate-400">
                              #{project._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {getCategoryName(project)}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProjectForStatus(project);
                            setOpenStatusDialog(true);
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            statusBadge[statusKey] || statusBadge.not_started
                          }`}
                          title="Click to change status"
                        >
                          {formatStatus(statusKey)}
                        </button>
                      </td>

                      <td className="p-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{project.progress || 0}%</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectForProgress(project);
                              setProgressValue(project.progress || 0);
                              setOpenProgressDialog(true);
                            }}
                            className="text-slate-400 hover:text-blue-900"
                            title="Edit progress"
                          >
                            <EditIcon className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (project.progress || 0) >= 100
                                ? "bg-emerald-500"
                                : (project.progress || 0) >= 50
                                ? "bg-blue-600"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        {budgetAmt > 0 ? (
                          <Link
                            href={`/project-budget/${project._id}`}
                            className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors inline-block"
                            title={currencyTitle(budgetAmt)}
                          >
                            {formatCurrencyUtil(budgetAmt)}
                          </Link>
                        ) : (
                          <Link
                            href={`/project-budget/${project._id}`}
                            className="text-xs text-slate-400 hover:text-blue-900"
                          >
                            + Set Budget
                          </Link>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                          <PeopleIcon className="w-3 h-3 text-slate-400" />
                          {project.assignedEmployees?.length || 0}
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap text-xs text-slate-600">
                        <div>Start: {formatDateSafe(project.startDate)}</div>
                        <div className="text-slate-400">End: {formatDateSafe(project.endDate)}</div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/projects/${project._id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-900 hover:bg-blue-50 transition-colors"
                            title="View Details"
                          >
                            <VisibilityIcon className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/project-budget/${project._id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Budget Hub"
                          >
                            <CurrencyDollarIcon className="w-4 h-4" />
                          </Link>
                          {(hasPermission("project.update") || hasPermission("project.delete")) && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenMenu(e, project._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="More options"
                            >
                              <MoreVertIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz);
              setCurrentPage(1);
            }}
          />
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
          {hasPermission("project.update") && (
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
          )}
          {hasPermission("project.update") && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              onClick={handleOpenStatusDialog}
            >
              <FlagIcon className="h-4 w-4" /> Change Status
            </button>
          )}
          {hasPermission("project.update") && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              onClick={handleOpenProgressDialog}
            >
              <TimelineIcon className="h-4 w-4" /> Update Progress
            </button>
          )}
          {hasPermission("project.delete") && (
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
          )}
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
                {/* Project Cover Photo */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Cover Photo (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative h-20 w-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                      {projectImagePreview ? (
                        <img
                          src={projectImagePreview}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Camera className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <input
                        type="file"
                        ref={modalFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProjectImageFile(file);
                            setRemoveImageFlag(false);
                            const reader = new FileReader();
                            reader.onload = () => setProjectImagePreview(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => modalFileInputRef.current?.click()}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5 text-slate-500" />
                        {projectImagePreview ? "Change Photo" : "Upload Photo"}
                      </button>
                      {projectImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setProjectImageFile(null);
                            setProjectImagePreview(null);
                            setRemoveImageFlag(true);
                            if (modalFileInputRef.current) modalFileInputRef.current.value = "";
                          }}
                          className="text-xs text-red-600 hover:underline block cursor-pointer"
                        >
                          Remove photo
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400">JPG, PNG, WebP up to 10MB</p>
                    </div>
                  </div>
                </div>

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
