"use client";

import { useState, useEffect } from "react";
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
import { format, parseISO } from "date-fns";

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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    startDate: null,
    endDate: null,
  });

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = await response.json();

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
  };

  const handleOpenMenu = (event, projectId) => {
    setAnchorEl(event.currentTarget);
    setSelectedProjectId(projectId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedProjectId(null);
  };

  const handleOpenDialog = (project = null) => {
    if (project) {
      setCurrentProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        category: project.category,
        startDate: project.startDate ? new Date(project.startDate) : null,
        endDate: project.endDate ? new Date(project.endDate) : null,
      });
    } else {
      setCurrentProject(null);
      setFormData({
        name: "",
        description: "",
        category: "",
        startDate: null,
        endDate: null,
      });
    }
    setOpenDialog(true);
    handleCloseMenu();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate
          ? formData.startDate instanceof Date
            ? formData.startDate.toISOString()
            : formData.startDate
          : null,
        endDate: formData.endDate
          ? formData.endDate instanceof Date
            ? formData.endDate.toISOString()
            : formData.endDate
          : null,
      };

      const url = currentProject
        ? `/api/projects/${currentProject._id}`
        : "/api/projects";

      const method = currentProject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
        handleCloseDialog();
      } else {
        setError(data.error || "Failed to save project");
      }
    } catch (err) {
      setError("Error saving project: " + (err?.message || err));
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;

    try {
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
      } else {
        setError(data.error || "Failed to delete project");
      }
    } catch (err) {
      setError("Error deleting project: " + (err?.message || err));
    }

    handleCloseMenu();
  };

  const getStatusColor = (status) => {
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
  };

  const formatStatus = (status) => {
    if (!status || typeof status !== "string") return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-12 pb-4 sm:pb-6 border-b border-gray-100">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Projects Dashboard
            </h1>
            <p className="text-gray-500 text-sm sm:text-base font-medium">
              Manage and track your project portfolio
            </p>
          </div>
          <button
            className="group relative bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 lg:px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-3 shadow-md hover:shadow-lg w-full sm:w-auto justify-center sm:justify-start"
            onClick={() => handleOpenDialog()}
          >
            <div className="relative flex items-center gap-3">
              <AddIcon className="w-5 h-5" />
              <span>New Project</span>
            </div>
          </button>
        </div>

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
                      {projects.length} projects found
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
                  <option value="all">🏁 All Statuses</option>
                  <option value="not_started">⏸️ Not Started</option>
                  <option value="in_progress">🚀 In Progress</option>
                  <option value="completed">✅ Completed</option>
                  <option value="on_hold">⏳ On Hold</option>
                  <option value="cancelled">❌ Cancelled</option>
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
                  <option value="all">📁 All Categories</option>
                  <option value="development">💻 Development</option>
                  <option value="design">🎨 Design</option>
                  <option value="marketing">📢 Marketing</option>
                  <option value="research">🔬 Research</option>
                  <option value="operations">⚙️ Operations</option>
                </select>
              </div>
            </div>

            {/* Quick Status Filter Chips */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Quick Filters
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "🌟 All", value: "all" },
                  { label: "⏸️ Not Started", value: "not_started" },
                  { label: "🚀 In Progress", value: "in_progress" },
                  { label: "✅ Completed", value: "completed" },
                  { label: "⏳ On Hold", value: "on_hold" },
                  { label: "❌ Cancelled", value: "cancelled" },
                ].map((item) => {
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
                    >
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

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
            >
              ✨ Create First Project
            </button>
          </div>
        ) : (
          <>
            {projects
              .filter(
                (project) =>
                  statusFilter === "all" || project.status === statusFilter
              )
              .filter(
                (project) =>
                  categoryFilter === "all" ||
                  project.category === categoryFilter
              )
              .filter(
                (project) =>
                  searchTerm === "" ||
                  (project.name &&
                    project.name
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()))
              ).length === 0 ? (
              <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-3xl border border-gray-100/50 animate-in fade-in slide-in-from-bottom duration-700">
                <div className="text-6xl mb-4 animate-bounce">🔍</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2 animate-in slide-in-from-left duration-500 delay-200">
                  No Projects Found
                </h3>
                <p className="text-gray-500 mb-6 animate-in slide-in-from-right duration-500 delay-300">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects
                  .filter(
                    (project) =>
                      statusFilter === "all" || project.status === statusFilter
                  )
                  .filter(
                    (project) =>
                      categoryFilter === "all" ||
                      project.category === categoryFilter
                  )
                  .filter(
                    (project) =>
                      searchTerm === "" ||
                      (project.name &&
                        project.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()))
                  )
                  .map((project, index) => (
                    <div
                      key={project._id}
                      className="group relative min-h-[450px] w-full flex flex-col bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden hover:-translate-y-1"
                    >
                      {/* Enhanced Gradient Status Bar */}
                      <div>
                        <div
                          className={`h-1 ${
                            getStatusColor(project.status || "not_started") ===
                            "success"
                              ? "bg-green-500"
                              : getStatusColor(
                                  project.status || "not_started"
                                ) === "warning"
                              ? "bg-amber-500"
                              : getStatusColor(
                                  project.status || "not_started"
                                ) === "error"
                              ? "bg-red-500"
                              : getStatusColor(
                                  project.status || "not_started"
                                ) === "primary"
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                        />
                      </div>

                      <div className="flex-grow p-4 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 mr-4">
                            <h2 className="font-semibold mb-2 text-lg text-gray-900 leading-tight line-clamp-2 min-h-[3rem] group-hover:text-blue-600 transition-colors duration-200">
                              {project.name}
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <span className="font-medium">
                                ID: {project._id.slice(-6)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                              onClick={(e) => handleOpenMenu(e, project._id)}
                            >
                              <MoreVertIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Detail Button */}
                        <div className="mb-3 flex justify-end">
                          <a
                            className="text-xs font-[500] border border-blue-900 border-solid rounded-md px-2 py-1 text-blue-900 hover:text-blue-700 no-underline flex items-center gap-1 transition-colors"
                            href={`/projects/${project._id}`}
                          >
                            View details <VisibilityIcon className="text-sm" />
                          </a>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                            <span
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                                project.category === "development"
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200"
                                  : project.category === "design"
                                  ? "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border-purple-200"
                                  : project.category === "marketing"
                                  ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200"
                                  : project.category === "research"
                                  ? "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-amber-200"
                                  : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200"
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
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            <span
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                                getStatusColor(
                                  project.status || "not_started"
                                ) === "success"
                                  ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-emerald-200"
                                  : getStatusColor(
                                      project.status || "not_started"
                                    ) === "warning"
                                  ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200"
                                  : getStatusColor(
                                      project.status || "not_started"
                                    ) === "error"
                                  ? "bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border-red-200"
                                  : getStatusColor(
                                      project.status || "not_started"
                                    ) === "primary"
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200"
                                  : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200"
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

                        <div className="bg-gray-50 rounded-md p-3 mb-4 border border-gray-100">
                          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 min-h-[63px]">
                            {project.description ||
                              "✨ No description available for this project yet."}
                          </p>
                        </div>

                        <div className="mb-4 bg-white rounded-md p-3 border border-gray-100">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                              <span className="text-sm font-bold text-gray-800">
                                Progress
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-blue-600">
                                {project.progress || 0}%
                              </span>
                              <div className="text-xs text-gray-500">
                                {(project.progress || 0) >= 100
                                  ? "🎉"
                                  : (project.progress || 0) >= 75
                                  ? "🔥"
                                  : (project.progress || 0) >= 50
                                  ? "⚡"
                                  : (project.progress || 0) >= 25
                                  ? "🚀"
                                  : "⏳"}
                              </div>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 relative overflow-hidden ${
                                  (project.progress || 0) >= 90
                                    ? "bg-green-500"
                                    : (project.progress || 0) >= 70
                                    ? "bg-blue-500"
                                    : (project.progress || 0) >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-500"
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

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-blue-50 rounded-md p-2 text-center border border-blue-100">
                            <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center mx-auto mb-2">
                              <PeopleIcon className="text-white text-sm sm:text-lg" />
                            </div>
                            <div className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">
                              Team
                            </div>
                            <div className="text-sm sm:text-lg font-black text-blue-800">
                              {project.assignedEmployees?.length || 0}
                            </div>
                            <div className="text-xs text-blue-500 mt-1 hidden sm:block">
                              {(project.assignedEmployees?.length || 0) === 1
                                ? "member"
                                : "members"}
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-md p-2 text-center border border-green-100">
                            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center mx-auto mb-2">
                              <CalendarIcon className="text-white text-sm sm:text-lg" />
                            </div>
                            <div className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
                              Start
                            </div>
                            <div className="text-sm font-bold text-emerald-800">
                              {project.startDate
                                ? (() => {
                                    try {
                                      return format(
                                        parseISO(project.startDate),
                                        "MMM d"
                                      );
                                    } catch (e) {
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
                                    } catch (e) {
                                      return "";
                                    }
                                  })()
                                : ""}
                            </div>
                          </div>
                          <div className="bg-rose-50 rounded-md p-2 text-center border border-rose-100">
                            <div className="w-8 h-8 bg-rose-500 rounded-md flex items-center justify-center mx-auto mb-2">
                              <FlagIcon className="text-white text-sm sm:text-lg" />
                            </div>
                            <div className="text-xs font-semibold text-rose-600 mb-1 uppercase tracking-wide">
                              End
                            </div>
                            <div className="text-sm font-bold text-rose-800">
                              {project.endDate
                                ? (() => {
                                    try {
                                      return format(
                                        parseISO(project.endDate),
                                        "MMM d"
                                      );
                                    } catch (e) {
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
                                    } catch (e) {
                                      return "";
                                    }
                                  })()
                                : ""}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 p-3 bg-gray-50">
                        <div className="flex gap-2 sm:gap-3">
                          <a
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 no-underline"
                            href={`/projects/${project._id}/milestones`}
                          >
                            <TimelineIcon className="text-sm" />
                            <span className="hidden sm:inline">Milestones</span>
                            <span className="sm:hidden">Miles</span>
                          </a>
                          <a
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 no-underline"
                            href={`/projects/${project._id}/team`}
                          >
                            <PeopleIcon className="text-sm" />
                            <span>Team</span>
                          </a>
                          <a
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium py-2 px-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 no-underline"
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
          </>
        )}

        {/* Project Menu */}
        {anchorEl && (
          <div
            className="bg-white shadow-md border border-gray-100 rounded-md absolute z-50"
            style={{
              top: anchorEl.getBoundingClientRect().bottom,
              left: anchorEl.getBoundingClientRect().left,
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
                <form className="space-y-4 sm:space-y-6">
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
                        value={
                          formData.startDate
                            ? new Date(formData.startDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleDateChange(
                            "startDate",
                            new Date(e.target.value)
                          )
                        }
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
                        value={
                          formData.endDate
                            ? new Date(formData.endDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          handleDateChange("endDate", new Date(e.target.value))
                        }
                        min={
                          formData.startDate
                            ? new Date(formData.startDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 px-4 sm:px-8 pb-4 sm:pb-8 pt-4 sm:pt-6 border-t border-gray-100/50">
                <button
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-all duration-200 border border-gray-200 order-2 sm:order-1"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-all duration-200 order-1 sm:order-2"
                  onClick={handleSubmit}
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
