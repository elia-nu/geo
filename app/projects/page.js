"use client";

import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Flag as FlagIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";

const STATUS_OPTIONS = [
  { value: "all", label: "🏁 All Statuses" },
  { value: "not_started", label: "⏸️ Not Started" },
  { value: "in_progress", label: "🚀 In Progress" },
  { value: "completed", label: "✅ Completed" },
  { value: "on_hold", label: "⏳ On Hold" },
  { value: "cancelled", label: "❌ Cancelled" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "📁 All Categories" },
  { value: "development", label: "💻 Development" },
  { value: "design", label: "🎨 Design" },
  { value: "marketing", label: "📢 Marketing" },
  { value: "research", label: "🔬 Research" },
  { value: "operations", label: "⚙️ Operations" },
];

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
  startDate: "",
  endDate: "",
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
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

  // For closing menu on outside click
  const menuRef = useRef(null);

  useEffect(() => {
    fetchProjects();

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
    setError(null);
    try {
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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        handleCloseDialog();
      } else {
        setError(data.error || "Failed to save project");
      }
    } catch (err) {
      setError("Error saving project: " + (err?.message || err));
    }
  }

  async function handleDeleteProject() {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
      } else {
        setError(data.error || "Failed to delete project");
      }
    } catch (err) {
      setError("Error deleting project: " + (err?.message || err));
    }
    handleCloseMenu();
  }

  // Filtering logic
  const filteredProjects = projects
    .filter(
      (project) => statusFilter === "all" || project.status === statusFilter
    )
    .filter(
      (project) =>
        categoryFilter === "all" || project.category === categoryFilter
    )
    .filter(
      (project) =>
        searchTerm === "" ||
        (project.name &&
          project.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex justify-center items-center h-screen">
          <div className="border-4 border-gray-200 w-10 h-10 rounded-full border-l-blue-600 animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <div className="p-6 bg-white min-h-screen transition-all duration-500">
        {/* Budget Management Banner */}
        {showBudgetBanner && (
          <div className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg relative">
            <button
              onClick={() => setShowBudgetBanner(false)}
              className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
              aria-label="Close budget banner"
            >
              ×
            </button>
            <div className="flex items-center gap-3">
              <CurrencyDollarIcon className="w-8 h-8 text-white" />
              <div>
                <h3 className="text-lg font-semibold">
                  Budget & Financial Management
                </h3>
                <p className="text-purple-100">
                  Select a project below to manage its budget, track expenses,
                  and monitor financial performance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-12 pb-4 sm:pb-6 border-b border-gray-100">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Projects Dashboard
            </h1>
            <p className="text-gray-500 text-sm sm:text-base font-medium">
              Manage and track your project portfolio
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              className="group relative bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 lg:px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-3 shadow-md hover:shadow-lg justify-center sm:justify-start"
              onClick={() => (window.location.href = "/budget-management")}
              type="button"
            >
              <div className="relative flex items-center gap-3">
                <CurrencyDollarIcon className="w-5 h-5" />
                <span>Budget Management</span>
              </div>
            </button>
            <button
              className="group relative bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 lg:px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-3 shadow-md hover:shadow-lg justify-center sm:justify-start"
              onClick={() => handleOpenDialog()}
              type="button"
            >
              <div className="relative flex items-center gap-3">
                <AddIcon className="w-5 h-5" />
                <span>New Project</span>
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="relative bg-white border border-gray-100 rounded-lg p-6 mb-8 shadow-sm">
          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <SearchIcon className="text-blue-600" /> Filter Projects
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-700 font-semibold text-sm">
                      {filteredProjects.length} projects found
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Search Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  🔍 Search Projects
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-12 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  📊 Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  🏷️ Category Filter
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Status Filter Chips */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Filters
              </h3>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((item) => {
                  const isActive = statusFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                      }`}
                      onClick={() => setStatusFilter(item.value)}
                      type="button"
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-2 p-4 bg-red-50 rounded-lg text-red-700 animate-in fade-in slide-in-from-top duration-500">
            <div className="text-red-600 text-lg font-semibold mb-2 animate-bounce">
              ⚠️ Error Loading Projects
            </div>
            <p className="text-red-500 text-sm animate-in fade-in duration-700 delay-300">
              {error}
            </p>
          </div>
        )}

        {/* No Projects */}
        {projects.length === 0 && !loading ? (
          <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-3xl border border-gray-100/50 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="text-6xl mb-4 animate-bounce">📋</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2 animate-in slide-in-from-left duration-500 delay-200">
              No Projects Found
            </h3>
            <p className="text-gray-500 mb-6 animate-in slide-in-from-right duration-500 delay-300">
              Create your first project to get started!
            </p>
            <button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-200/50 animate-in zoom-in duration-500 delay-500"
              type="button"
            >
              ✨ Create First Project
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white/30 backdrop-blur-sm rounded-3xl border border-gray-100/50 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="text-6xl mb-4 animate-bounce">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2 animate-in slide-in-from-left duration-500 delay-200">
              No Projects Found
            </h3>
            <p className="text-gray-500 mb-6 animate-in slide-in-from-right duration-500 delay-300">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                className="group relative min-h-[600px] w-full flex flex-col bg-gradient-to-br from-white via-blue-50 to-slate-100 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1"
              >
                {/* Status Bar */}
                <div>
                  <div
                    className={`h-1 ${
                      getStatusColor(project.status || "not_started") ===
                      "success"
                        ? "bg-gradient-to-r from-green-400 to-emerald-500"
                        : getStatusColor(project.status || "not_started") ===
                          "warning"
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                        : getStatusColor(project.status || "not_started") ===
                          "error"
                        ? "bg-gradient-to-r from-red-400 to-pink-500"
                        : getStatusColor(project.status || "not_started") ===
                          "primary"
                        ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                        : "bg-gradient-to-r from-gray-300 to-slate-400"
                    }`}
                  />
                </div>

                <div className="flex-grow p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 mr-4">
                      <h2 className="font-extrabold mb-2 text-xl text-gray-900 leading-tight line-clamp-2 min-h-[3rem] group-hover:text-blue-700 transition-colors duration-200">
                        {project.name}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <span className="font-medium tracking-widest">
                          #{project._id.slice(-6)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all duration-200"
                        onClick={(e) => handleOpenMenu(e, project._id)}
                        type="button"
                        aria-label="Project menu"
                      >
                        <MoreVertIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Detail Button */}
                  <div className="mb-3 flex justify-end">
                    <a
                      className="text-xs font-semibold border border-blue-700 border-solid rounded-lg px-3 py-1 text-blue-700 hover:text-white hover:bg-blue-700 no-underline flex items-center gap-1 transition-all duration-200 shadow-sm"
                      href={`/projects/${project._id}`}
                    >
                      <VisibilityIcon className="text-sm" />
                      <span>Details</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                          project.category === "development"
                            ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                            : project.category === "design"
                            ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                            : project.category === "marketing"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200"
                            : project.category === "research"
                            ? "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-amber-200"
                            : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {project.category === "development"
                          ? "💻"
                          : project.category === "design"
                          ? "🎨"
                          : project.category === "marketing"
                          ? "📢"
                          : project.category === "research"
                          ? "🔬"
                          : "📁"}{" "}
                        {project.category || "Uncategorized"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                          getStatusColor(project.status || "not_started") ===
                          "success"
                            ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border-emerald-200"
                            : getStatusColor(
                                project.status || "not_started"
                              ) === "warning"
                            ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200"
                            : getStatusColor(
                                project.status || "not_started"
                              ) === "error"
                            ? "bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200"
                            : getStatusColor(
                                project.status || "not_started"
                              ) === "primary"
                            ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                            : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {project.status === "completed"
                          ? "✅"
                          : project.status === "in_progress"
                          ? "🚀"
                          : project.status === "on_hold"
                          ? "⏸️"
                          : project.status === "cancelled"
                          ? "❌"
                          : "⏸️"}{" "}
                        {formatStatus(project.status || "not_started")}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-4 mb-4 border border-gray-100 shadow-inner">
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 min-h-[63px]">
                      {project.description ||
                        "✨ No description available for this project yet."}
                    </p>
                  </div>

                  <div className="mb-4 bg-gradient-to-r from-white via-blue-50 to-slate-50 rounded-xl p-4 border border-gray-100 shadow">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                        <span className="text-sm font-bold text-gray-800">
                          Progress
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-blue-700">
                          {project.progress || 0}%
                        </span>
                        <span className="text-xs text-gray-400">
                          {(project.progress || 0) >= 100
                            ? "🎉"
                            : (project.progress || 0) >= 75
                            ? "🔥"
                            : (project.progress || 0) >= 50
                            ? "⚡"
                            : (project.progress || 0) >= 25
                            ? "🚀"
                            : "⏳"}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 relative overflow-hidden ${
                            (project.progress || 0) >= 90
                              ? "bg-gradient-to-r from-green-400 to-emerald-500"
                              : (project.progress || 0) >= 70
                              ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                              : (project.progress || 0) >= 40
                              ? "bg-gradient-to-r from-yellow-400 to-amber-500"
                              : "bg-gradient-to-r from-red-400 to-pink-500"
                          }`}
                          style={{ width: `${project.progress || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>0%</span>
                        <span className="font-medium">Target: 100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-100 rounded-xl p-3 text-center border border-blue-200 shadow-sm">
                      <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        <PeopleIcon className="text-white text-base" />
                      </div>
                      <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
                        Team
                      </div>
                      <div className="text-base font-black text-blue-900">
                        {project.assignedEmployees?.length || 0}
                      </div>
                      <div className="text-xs text-blue-500 mt-1 hidden sm:block">
                        {(project.assignedEmployees?.length || 0) === 1
                          ? "member"
                          : "members"}
                      </div>
                    </div>
                    <div className="bg-green-100 rounded-xl p-3 text-center border border-green-200 shadow-sm">
                      <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        <CalendarIcon className="text-white text-base" />
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 mb-1 uppercase tracking-wide">
                        Start
                      </div>
                      <div className="text-base font-bold text-emerald-900">
                        {project.startDate
                          ? (() => {
                              try {
                                return format(
                                  parseISO(project.startDate),
                                  "MMM d"
                                );
                              } catch {
                                return "Not set";
                              }
                            })()
                          : "Not set"}
                      </div>
                      <div className="text-xs text-emerald-500 mt-1">
                        {project.startDate
                          ? (() => {
                              try {
                                return format(
                                  parseISO(project.startDate),
                                  "yyyy"
                                );
                              } catch {
                                return "";
                              }
                            })()
                          : ""}
                      </div>
                    </div>
                    <div className="bg-rose-100 rounded-xl p-3 text-center border border-rose-200 shadow-sm">
                      <div className="w-9 h-9 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        <FlagIcon className="text-white text-base" />
                      </div>
                      <div className="text-xs font-semibold text-rose-700 mb-1 uppercase tracking-wide">
                        End
                      </div>
                      <div className="text-base font-bold text-rose-900">
                        {project.endDate
                          ? (() => {
                              try {
                                return format(
                                  parseISO(project.endDate),
                                  "MMM d"
                                );
                              } catch {
                                return "Not set";
                              }
                            })()
                          : "Not set"}
                      </div>
                      <div className="text-xs text-rose-500 mt-1">
                        {project.endDate
                          ? (() => {
                              try {
                                return format(
                                  parseISO(project.endDate),
                                  "yyyy"
                                );
                              } catch {
                                return "";
                              }
                            })()
                          : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 p-4 bg-gradient-to-r from-white via-blue-50 to-slate-50 rounded-b-2xl">
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                    <a
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 no-underline shadow"
                      href={`/projects/${project._id}/milestones`}
                    >
                      <TimelineIcon className="text-sm" />
                      <span className="hidden sm:inline">Milestones</span>
                      <span className="sm:hidden">Miles</span>
                    </a>
                    <a
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 no-underline shadow"
                      href={`/projects/${project._id}/team`}
                    >
                      <PeopleIcon className="text-sm" />
                      <span>Team</span>
                    </a>
                    <a
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 no-underline shadow"
                      href={`/project-budget/${project._id}`}
                    >
                      <CurrencyDollarIcon className="text-sm" />
                      <span>Budget</span>
                    </a>
                    <a
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 no-underline shadow"
                      href={`/project-alerts?projectId=${project._id}`}
                    >
                      <NotificationsIcon className="text-sm" />
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
                const project = projects.find(
                  (p) => p._id === selectedProjectId
                );
                handleOpenDialog(project);
              }}
            >
              <EditIcon /> Edit
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
            <div className="bg-white rounded-lg shadow-md max-w-sm sm:max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100">
              <div className="p-4 sm:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    {currentProject ? "Edit Project" : "Create New Project"}
                  </h2>
                </div>
              </div>
              <div className="px-4 sm:px-8 pb-4">
                <form
                  className="space-y-4 sm:space-y-6"
                  onSubmit={handleSubmit}
                  autoComplete="off"
                >
                  <div className="space-y-2 sm:space-y-3">
                    <label
                      className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-2"
                      htmlFor="name"
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
                      📝 Project Name
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter project name..."
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <label
                      className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                      htmlFor="description"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      📄 Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical"
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe your project..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-3">
                    <label
                      className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                      htmlFor="category"
                    >
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      🏷️ Category
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">🎯 Select Category</option>
                      <option value="development">💻 Development</option>
                      <option value="design">🎨 Design</option>
                      <option value="marketing">📢 Marketing</option>
                      <option value="research">🔬 Research</option>
                      <option value="operations">⚙️ Operations</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3">
                      <label
                        className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        htmlFor="startDate"
                      >
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        📅 Start Date
                      </label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        max={formData.endDate || undefined}
                      />
                    </div>

                    <div className="space-y-3">
                      <label
                        className="block text-sm font-bold text-gray-800 flex items-center gap-2"
                        htmlFor="endDate"
                      >
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        🏁 End Date
                      </label>
                      <input
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || undefined}
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 px-4 sm:px-8 pb-4 sm:pb-8 pt-4 sm:pt-6 border-t border-gray-100/50">
                <button
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-all duration-200 border border-gray-200 order-2 sm:order-1"
                  onClick={handleCloseDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 order-1 sm:order-2"
                  onClick={handleSubmit}
                  type="submit"
                >
                  {currentProject ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectsPage;
