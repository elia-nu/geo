"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../../components/Layout";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Groups as GroupsIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import Link from "next/link";
import {
  projectToasts,
  showErrorToast,
  showConfirmDialog,
  showWarningToast,
} from "../../../utils/sweetAlert";

const getEmployeeDisplayName = (employee) => {
  return (
    employee?.personalDetails?.name ||
    employee?.name ||
    employee?.personalDetails?.fullName ||
    employee?.fullName ||
    (employee?.personalDetails?.firstName && employee?.personalDetails?.lastName
      ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
      : null) ||
    (employee?.firstName && employee?.lastName
      ? `${employee.firstName} ${employee.lastName}`
      : null) ||
    `Employee ${employee?._id?.slice(-6) || "Unknown"}`
  );
};

const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

const statusStyles = {
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  active: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
};

const ProjectTeamPage = ({ params }) => {
  const { id: projectId } = use(params);

  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProjectData();
    fetchAvailableEmployees();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);

        const teamResponse = await fetch(
          `/api/projects/${projectId}/assign-employees`
        );
        const teamData = await teamResponse.json();

        if (teamData.success) {
          setAssignedEmployees(teamData.assignedEmployees || []);
        }
      } else {
        showErrorToast(
          "Load Failed",
          projectData.error || "Failed to fetch project details"
        );
      }
    } catch (err) {
      showErrorToast("Load Failed", err.message || "Error fetching project data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();

      if (data.success) {
        setAvailableEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching available employees:", err);
    }
  };

  const handleOpenDialog = () => {
    setSelectedEmployees([]);
    setSearchQuery("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    if (assigning) return;
    setOpenDialog(false);
    setSearchQuery("");
  };

  const toggleEmployeeSelection = (employee) => {
    const isSelected = selectedEmployees.some((emp) => emp._id === employee._id);
    if (isSelected) {
      setSelectedEmployees(
        selectedEmployees.filter((emp) => emp._id !== employee._id)
      );
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const handleAssignEmployees = async () => {
    if (selectedEmployees.length === 0) {
      showWarningToast("No Selection", "Please select at least one employee");
      return;
    }

    try {
      setAssigning(true);
      const employeeIds = selectedEmployees.map((emp) => emp._id);

      const response = await fetch(
        `/api/projects/${projectId}/assign-employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds }),
        }
      );

      const data = await response.json();

      if (data.success) {
        projectToasts.teamMemberAdded();
        await fetchProjectData();
        setOpenDialog(false);
        setSearchQuery("");
        setSelectedEmployees([]);
      } else {
        projectToasts.teamError(data.error || "Failed to assign employees");
      }
    } catch (err) {
      projectToasts.teamError(err.message || "Error assigning employees");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveEmployee = async (employee) => {
    const name = getEmployeeDisplayName(employee);
    const result = await showConfirmDialog(
      "Remove team member?",
      `Remove ${name} from this project?`,
      "Yes, remove"
    );

    if (!result.isConfirmed) return;

    try {
      setRemovingId(employee._id);

      const response = await fetch(
        `/api/projects/${projectId}/assign-employees?employeeId=${employee._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        projectToasts.teamMemberRemoved();
        await fetchProjectData();
      } else {
        projectToasts.teamError(data.error || "Failed to remove employee");
      }
    } catch (err) {
      projectToasts.teamError(err.message || "Error removing employee");
    } finally {
      setRemovingId(null);
    }
  };

  const getFilteredEmployees = () => {
    const assignedIds = assignedEmployees.map((emp) => emp._id);
    const query = searchQuery.trim().toLowerCase();

    return availableEmployees
      .filter((emp) => !assignedIds.includes(emp._id))
      .filter((emp) => {
        if (!query) return true;
        const name = getEmployeeDisplayName(emp).toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const position = (emp.position || "").toLowerCase();
        const department = (emp.department || "").toLowerCase();
        return (
          name.includes(query) ||
          email.includes(query) ||
          position.includes(query) ||
          department.includes(query)
        );
      });
  };

  const filteredEmployees = getFilteredEmployees();
  const statusKey = (project?.status || "active").toLowerCase();
  const statusClass =
    statusStyles[statusKey] || statusStyles.active;

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex flex-col justify-center items-center min-h-[70vh] gap-3">
          <div className="h-11 w-11 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Loading team…</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="p-6 max-w-lg mx-auto mt-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <GroupsIcon />
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
              <li className="px-1.5 py-1 font-medium text-slate-700">Team</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-white shadow-sm shadow-blue-900/20">
                  <GroupsIcon className="!text-xl" />
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Project Team
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Manage who is assigned to this project
              </p>
            </div>
            <button
              onClick={handleOpenDialog}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-900/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-md active:scale-[0.98]"
            >
              <AddIcon className="!text-lg" />
              Assign Employees
            </button>
          </div>

          {/* Project summary */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {project.name}
                </h2>
                {project.description && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}
              >
                {(project.status || "active").replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <PersonIcon className="!text-base text-blue-900" />
              <span>
                <span className="font-semibold text-slate-900">
                  {assignedEmployees.length}
                </span>{" "}
                team member{assignedEmployees.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Team list */}
          {assignedEmployees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <PersonIcon className="!text-4xl" />
              </div>
              <h3 className="text-lg font-medium text-slate-700">
                No team members yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Assign employees to collaborate on this project.
              </p>
              <button
                onClick={handleOpenDialog}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-blue-900/20 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-900 transition-all duration-200 hover:bg-blue-100 active:scale-[0.98]"
              >
                <AddIcon className="!text-lg" />
                Assign Employees
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5 text-white">
                <div className="flex items-center gap-2">
                  <PersonIcon className="!text-xl opacity-90" />
                  <h3 className="font-medium">
                    Team Members
                    <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      {assignedEmployees.length}
                    </span>
                  </h3>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedEmployees.map((employee) => {
                      const name = getEmployeeDisplayName(employee);
                      const isRemoving = removingId === employee._id;

                      return (
                        <tr
                          key={employee._id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-sm font-semibold text-white shadow-sm">
                                {getInitial(name)}
                              </div>
                              <span className="font-medium text-slate-900">
                                {name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {employee.email || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                              {employee.position || "N/A"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {employee.department || "N/A"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleRemoveEmployee(employee)}
                              disabled={isRemoving || removingId !== null}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-all duration-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Remove from project"
                            >
                              {isRemoving ? (
                                <span className="h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                              ) : (
                                <DeleteIcon className="!text-lg" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {assignedEmployees.map((employee) => {
                  const name = getEmployeeDisplayName(employee);
                  const isRemoving = removingId === employee._id;

                  return (
                    <div key={employee._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-sm font-semibold text-white">
                            {getInitial(name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                              <EmailIcon className="!text-sm" />
                              {employee.email || "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                                <WorkIcon className="!text-sm" />
                                {employee.position || "N/A"}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                <BusinessIcon className="!text-sm" />
                                {employee.department || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveEmployee(employee)}
                          disabled={isRemoving || removingId !== null}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition-all duration-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <span className="h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                          ) : (
                            <DeleteIcon className="!text-lg" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Assign modal */}
        {openDialog && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
              onClick={handleCloseDialog}
            />
            <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:max-w-xl sm:rounded-2xl animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Assign Employees
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select people to add to this project
                  </p>
                </div>
                <button
                  onClick={handleCloseDialog}
                  disabled={assigning}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="border-b border-slate-100 px-5 py-3">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 !-translate-y-1/2 !text-lg text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, role…"
                    disabled={assigning}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2">
                {filteredEmployees.length === 0 ? (
                  <div className="px-3 py-12 text-center">
                    <PersonIcon className="mx-auto mb-2 !text-4xl text-slate-300" />
                    <p className="text-sm text-slate-500">
                      {searchQuery
                        ? "No employees match your search"
                        : "All employees are already assigned"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredEmployees.map((employee) => {
                      const name = getEmployeeDisplayName(employee);
                      const isSelected = selectedEmployees.some(
                        (emp) => emp._id === employee._id
                      );

                      return (
                        <button
                          key={employee._id}
                          type="button"
                          disabled={assigning}
                          onClick={() => toggleEmployeeSelection(employee)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150 disabled:opacity-60 ${
                            isSelected
                              ? "bg-blue-50 ring-1 ring-blue-200"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-blue-700 text-xs font-semibold text-white">
                            {getInitial(name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {employee.position || "N/A"} ·{" "}
                              {employee.department || "N/A"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedEmployees.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Selected ({selectedEmployees.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployees.map((employee) => (
                      <span
                        key={employee._id}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-1 pl-2.5 pr-1 text-xs font-medium text-blue-900"
                      >
                        {getEmployeeDisplayName(employee)}
                        <button
                          type="button"
                          disabled={assigning}
                          onClick={() =>
                            setSelectedEmployees(
                              selectedEmployees.filter(
                                (emp) => emp._id !== employee._id
                              )
                            )
                          }
                          className="rounded-full p-0.5 hover:bg-blue-200 disabled:opacity-50"
                        >
                          <CloseIcon className="!text-sm" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  disabled={assigning}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignEmployees}
                  disabled={assigning || selectedEmployees.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/50 active:scale-[0.98]"
                >
                  {assigning ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Assigning…</span>
                    </>
                  ) : (
                    <>
                      <AddIcon className="!text-lg" />
                      Assign
                      {selectedEmployees.length > 0
                        ? ` (${selectedEmployees.length})`
                        : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectTeamPage;
