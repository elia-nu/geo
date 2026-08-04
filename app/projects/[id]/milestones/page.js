"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../../components/Layout";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Flag as FlagIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { format, parseISO, isValid } from "date-fns";
import Link from "next/link";
import {
  projectToasts,
  showErrorToast,
  showWarningToast,
  showDeleteConfirmDialog,
} from "../../../utils/sweetAlert";

const STATUS_OPTIONS = [
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
  active: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

const formatStatus = (status) =>
  (status || "not_started")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (dateValue) => {
  if (!dateValue) return "Not set";
  try {
    const date =
      typeof dateValue === "string"
        ? parseISO(dateValue)
        : new Date(dateValue);
    return isValid(date) ? format(date, "MMM d, yyyy") : "Not set";
  } catch {
    return "Not set";
  }
};

const toDateInputValue = (dateValue) => {
  if (!dateValue) return "";
  try {
    const date =
      typeof dateValue === "string"
        ? parseISO(dateValue)
        : new Date(dateValue);
    return isValid(date) ? date.toISOString().split("T")[0] : "";
  } catch {
    return "";
  }
};

const ProjectMilestonesPage = ({ params }) => {
  const { id: projectId } = use(params);

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: null,
    status: "not_started",
    progress: 0,
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);
        setMilestones(projectData.project.milestones || []);
      } else {
        showErrorToast(
          "Load Failed",
          projectData.error || "Failed to fetch project details"
        );
      }
    } catch (err) {
      showErrorToast(
        "Load Failed",
        err.message || "Error fetching project data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setCurrentMilestone(milestone);
      setFormData({
        title: milestone.title || "",
        description: milestone.description || "",
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
        status: milestone.status || "not_started",
        progress: milestone.progress || 0,
      });
    } else {
      setCurrentMilestone(null);
      setFormData({
        title: "",
        description: "",
        dueDate: null,
        status: "not_started",
        progress: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "progress" ? Number(value) : value,
    }));
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value ? new Date(e.target.value) : null;
    setFormData((prev) => ({
      ...prev,
      dueDate: dateValue,
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!formData.title.trim()) {
      showWarningToast("Missing Title", "Please enter a milestone title");
      return;
    }

    if (!formData.dueDate) {
      showWarningToast("Missing Due Date", "Please select a due date");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        title: formData.title.trim(),
        dueDate: formData.dueDate?.toISOString(),
      };

      const url = currentMilestone
        ? `/api/projects/${projectId}/milestones/${currentMilestone._id}`
        : `/api/projects/${projectId}/milestones`;
      const method = currentMilestone ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (currentMilestone) {
          projectToasts.milestoneUpdated();
        } else {
          projectToasts.milestoneCreated();
        }
        await fetchProjectData();
        setOpenDialog(false);
      } else {
        projectToasts.milestoneError(data.error || "Failed to save milestone");
      }
    } catch (err) {
      projectToasts.milestoneError(err.message || "Error saving milestone");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestone) => {
    const result = await showDeleteConfirmDialog(
      "Delete milestone?",
      `Delete "${milestone.title}"? This cannot be undone.`,
      "Yes, delete it"
    );

    if (!result.isConfirmed) return;

    try {
      setDeletingId(milestone._id);

      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestone._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        projectToasts.milestoneDeleted();
        await fetchProjectData();
      } else {
        projectToasts.milestoneError(
          data.error || "Failed to delete milestone"
        );
      }
    } catch (err) {
      projectToasts.milestoneError(err.message || "Error deleting milestone");
    } finally {
      setDeletingId(null);
    }
  };

  const completedCount = milestones.filter(
    (m) => m.status === "completed"
  ).length;
  const avgProgress =
    milestones.length > 0
      ? Math.round(
          milestones.reduce((sum, m) => sum + (m.progress || 0), 0) /
            milestones.length
        )
      : 0;

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex flex-col justify-center items-center min-h-[70vh] gap-3">
          <div className="h-11 w-11 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">
            Loading milestones…
          </p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="p-6 max-w-lg mx-auto mt-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <FlagIcon />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Project not found
          </h2>
          <p className="text-slate-500 mb-6">
            This project may have been removed, or you don’t have permission to
            view it.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-all duration-200"
          >
            <ArrowBackIcon className="mr-2 !text-lg" />
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  const projectStatusKey = (project.status || "active").toLowerCase();

  return (
    <Layout activeSection="projects">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/40">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
              <li className="text-slate-300">/</li>
              <li>
                <Link
                  href={`/projects/${projectId}`}
                  className="rounded-md px-1.5 py-1 hover:bg-white hover:text-blue-900 transition-colors"
                >
                  {project.name}
                </Link>
              </li>
              <li className="text-slate-300">/</li>
              <li className="px-1.5 py-1 font-medium text-slate-700">
                Milestones
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
                  <FlagIcon className="!text-xl" />
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Project Milestones
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Track key deliverables and progress for this project
              </p>
            </div>
            <button
              onClick={() => handleOpenDialog()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-md active:scale-[0.98]"
            >
              <AddIcon className="!text-lg" />
              Add Milestone
            </button>
          </div>

          {/* Project summary */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {project.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="!text-base text-blue-900" />
                    {formatDate(project.startDate)} –{" "}
                    {formatDate(project.endDate)}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  statusBadge[projectStatusKey] || statusBadge.active
                }`}
              >
                {(project.status || "active").replace(/_/g, " ")}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500">Milestones</p>
                <p className="text-lg font-semibold text-slate-900">
                  {milestones.length}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50/80 px-3 py-2.5">
                <p className="text-xs text-emerald-700/70">Completed</p>
                <p className="text-lg font-semibold text-emerald-800">
                  {completedCount}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50/80 px-3 py-2.5">
                <p className="text-xs text-blue-700/70">Avg Progress</p>
                <p className="text-lg font-semibold text-blue-900">
                  {avgProgress}%
                </p>
              </div>
            </div>
          </div>

          {/* Milestones list */}
          {milestones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FlagIcon className="!text-4xl" />
              </div>
              <h3 className="text-lg font-medium text-slate-700">
                No milestones yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Add your first milestone to track project progress and
                deliverables.
              </p>
              <button
                onClick={() => handleOpenDialog()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-blue-900/20 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 transition-all duration-200 hover:bg-blue-100 active:scale-[0.98]"
              >
                <AddIcon className="!text-lg" />
                Add Milestone
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5 text-white">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="!text-xl opacity-90" />
                  <h3 className="font-medium">
                    Milestones
                    <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      {milestones.length}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Progress</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {milestones.map((milestone) => {
                      const isDeleting = deletingId === milestone._id;
                      const statusKey = milestone.status || "not_started";

                      return (
                        <tr
                          key={milestone._id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">
                              {milestone.title}
                            </div>
                            {milestone.description && (
                              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                                {milestone.description}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                            {formatDate(milestone.dueDate)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                statusBadge[statusKey] ||
                                statusBadge.not_started
                              }`}
                            >
                              {formatStatus(statusKey)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex min-w-[8rem] items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                  style={{
                                    width: `${milestone.progress || 0}%`,
                                  }}
                                />
                              </div>
                              <span className="w-9 text-right text-xs font-medium text-slate-600">
                                {milestone.progress || 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleOpenDialog(milestone)}
                                disabled={deletingId !== null}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-700 transition-all duration-200 hover:bg-blue-50 disabled:opacity-50"
                                title="Edit milestone"
                              >
                                <EditIcon className="!text-lg" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteMilestone(milestone)
                                }
                                disabled={isDeleting || deletingId !== null}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete milestone"
                              >
                                {isDeleting ? (
                                  <span className="h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                                ) : (
                                  <DeleteIcon className="!text-lg" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {milestones.map((milestone) => {
                  const isDeleting = deletingId === milestone._id;
                  const statusKey = milestone.status || "not_started";

                  return (
                    <div key={milestone._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">
                            {milestone.title}
                          </p>
                          {milestone.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                              {milestone.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                statusBadge[statusKey] ||
                                statusBadge.not_started
                              }`}
                            >
                              {formatStatus(statusKey)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <CalendarIcon className="!text-sm" />
                              {formatDate(milestone.dueDate)}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                style={{
                                  width: `${milestone.progress || 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600">
                              {milestone.progress || 0}%
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => handleOpenDialog(milestone)}
                            disabled={deletingId !== null}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-700 transition-all hover:bg-blue-50 disabled:opacity-50"
                          >
                            <EditIcon className="!text-lg" />
                          </button>
                          <button
                            onClick={() => handleDeleteMilestone(milestone)}
                            disabled={isDeleting || deletingId !== null}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-all hover:bg-red-50 disabled:opacity-50"
                          >
                            {isDeleting ? (
                              <span className="h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                            ) : (
                              <DeleteIcon className="!text-lg" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Add / Edit modal */}
        {openDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
              onClick={handleCloseDialog}
            />
            <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-lg sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {currentMilestone ? "Edit Milestone" : "Add Milestone"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentMilestone
                      ? "Update milestone details"
                      : "Create a new project milestone"}
                  </p>
                </div>
                <button
                  onClick={handleCloseDialog}
                  disabled={saving}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Milestone Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      disabled={saving}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Design phase complete"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      disabled={saving}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Optional details…"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="dueDate"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Due Date *
                      </label>
                      <input
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        disabled={saving}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        value={toDateInputValue(formData.dueDate)}
                        onChange={handleDateChange}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        disabled={saving}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="progress"
                        className="text-sm font-medium text-slate-700"
                      >
                        Progress
                      </label>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-900">
                        {formData.progress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      id="progress"
                      name="progress"
                      disabled={saving}
                      min="0"
                      max="100"
                      step="5"
                      value={formData.progress}
                      onChange={handleInputChange}
                      className="w-full accent-blue-900 disabled:opacity-60"
                    />
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${formData.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={handleCloseDialog}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.title.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>
                          {currentMilestone ? "Updating…" : "Saving…"}
                        </span>
                      </>
                    ) : currentMilestone ? (
                      "Update"
                    ) : (
                      <>
                        <AddIcon className="!text-lg" />
                        Add Milestone
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectMilestonesPage;
