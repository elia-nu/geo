"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../../components/Layout";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import Link from "next/link";
import {
  showDeleteConfirmDialog,
  projectToasts,
} from "../../../utils/sweetAlert";

const ProjectTeamPage = ({ params }) => {
  const { id: projectId } = use(params);

  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // New state for project owner management
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerLoading, setOwnerLoading] = useState(false);

  // Fetch project and team data on component mount
  useEffect(() => {
    fetchProjectData();
    fetchAvailableEmployees();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);

        // Fetch assigned employees
        const teamResponse = await fetch(
          `/api/projects/${projectId}/assign-employees`
        );
        const teamData = await teamResponse.json();

        if (teamData.success) {
          setAssignedEmployees(teamData.assignedEmployees || []);
        }
      } else {
        setError(projectData.error || "Failed to fetch project details");
      }
    } catch (err) {
      setError("Error fetching project data: " + err.message);
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
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleEmployeeSelection = (event, newValue) => {
    setSelectedEmployees(newValue);
  };

  // New functions for owner management
  const handleEditOwner = () => {
    setSelectedOwner(project.ownerDetails || null);
    setIsEditingOwner(true);
  };

  const handleCancelEditOwner = () => {
    setSelectedOwner(null);
    setIsEditingOwner(false);
  };

  const handleOwnerSelection = (event, newValue) => {
    setSelectedOwner(newValue);
  };

  const handleSaveOwner = async () => {
    try {
      setOwnerLoading(true);

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: selectedOwner ? selectedOwner._id : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the project state with new owner
        setProject((prev) => ({
          ...prev,
          ownerId: selectedOwner ? selectedOwner._id : null,
          ownerDetails: selectedOwner || null,
        }));

        setIsEditingOwner(false);
        setSelectedOwner(null);

        projectToasts.success("Project owner updated successfully!");
      } else {
        projectToasts.error(data.error || "Failed to update project owner");
      }
    } catch (err) {
      console.error("Error updating project owner:", err);
      projectToasts.error("Error updating project owner: " + err.message);
    } finally {
      setOwnerLoading(false);
    }
  };

  const handleAssignEmployees = async () => {
    if (selectedEmployees.length === 0) {
      handleCloseDialog();
      return;
    }

    try {
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
        fetchProjectData();
        handleCloseDialog();
        // Show success toast with count of assigned employees
        const count = selectedEmployees.length;
        if (count === 1) {
          projectToasts.teamMemberAdded();
        } else {
          projectToasts.teamMemberAdded();
        }
        setSelectedEmployees([]); // Clear selection
      } else {
        const errorMessage = data.error || "Failed to assign employees";
        setError(errorMessage);
        projectToasts.teamError(errorMessage);
      }
    } catch (err) {
      const errorMessage = "Error assigning employees: " + err.message;
      setError(errorMessage);
      projectToasts.teamError(errorMessage);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    // Find employee name for confirmation dialog
    const employee = assignedEmployees.find((emp) => emp._id === employeeId);
    const employeeName = employee?.name || "this employee";

    // Show confirmation dialog
    const result = await showDeleteConfirmDialog({
      title: "Remove Team Member",
      text: `Do you want to remove ${employeeName} from team?`,
      confirmButtonText: "Yes, remove them",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return; // User cancelled
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/assign-employees?employeeId=${employeeId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
        projectToasts.teamMemberRemoved();
      } else {
        const errorMessage = data.error || "Failed to remove employee";
        setError(errorMessage);
        projectToasts.teamError(errorMessage);
      }
    } catch (err) {
      const errorMessage = "Error removing employee: " + err.message;
      setError(errorMessage);
      projectToasts.teamError(errorMessage);
    }
  };

  // Filter out already assigned employees from the available list
  const getFilteredEmployees = () => {
    const assignedIds = assignedEmployees.map((emp) => emp._id);
    return availableEmployees.filter((emp) => !assignedIds.includes(emp._id));
  };

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="p-6">
          <p className="text-red-600 mb-4">
            Project not found or you don't have permission to view it.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowBackIcon className="mr-2" />
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <div className="p-6 bg-gray-50 min-h-screen">
        <nav className="flex mb-4" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                href="/projects"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                <ArrowBackIcon className="mr-1 text-sm" />
                Projects
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <Link
                  href={`/projects/${projectId}`}
                  className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                >
                  {project.name}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 6 10"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 9 4-4-4-4"
                  />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                  Team
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-3xl font-semibold text-blue-900">Project Team</h1>
          <button
            onClick={handleOpenDialog}
            className="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
          >
            <AddIcon className="mr-2" />
            Assign Employees
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-3">
            <h2 className="text-xl font-semibold text-blue-900 mr-4">
              {project.name}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : project.status === "on_hold"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {project.status || "Active"}
            </span>
          </div>
          <p className="text-gray-600 mb-4">{project.description}</p>

          {/* Project Owner Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">
                Project Owner
              </h3>
              {!isEditingOwner && (
                <button
                  onClick={handleEditOwner}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <EditIcon className="w-4 h-4 mr-1" />
                  Edit
                </button>
              )}
            </div>

            {isEditingOwner ? (
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <select
                    value={selectedOwner ? selectedOwner._id : ""}
                    onChange={(e) => {
                      const ownerId = e.target.value;
                      const owner = ownerId
                        ? availableEmployees.find((emp) => emp._id === ownerId)
                        : null;
                      setSelectedOwner(owner);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Project Owner</option>
                    {availableEmployees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.personalDetails?.name ||
                          employee.name ||
                          `${
                            employee.personalDetails?.firstName ||
                            employee.firstName ||
                            ""
                          } ${
                            employee.personalDetails?.lastName ||
                            employee.lastName ||
                            ""
                          }`.trim() ||
                          `Employee ${employee._id.slice(-6)}`}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSaveOwner}
                  disabled={ownerLoading}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <SaveIcon className="w-4 h-4 mr-1" />
                  {ownerLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancelEditOwner}
                  disabled={ownerLoading}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <CancelIcon className="w-4 h-4 mr-1" />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                {project.ownerDetails ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <PersonIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {project.ownerDetails.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {project.ownerDetails.email}
                      </p>
                      {project.ownerDetails.department && (
                        <p className="text-sm text-gray-500">
                          {project.ownerDetails.department}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-500">
                    <PersonIcon className="w-5 h-5 mr-2" />
                    <span>No owner assigned</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {assignedEmployees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <PersonIcon className="text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-4">
              No employees assigned to this project yet.
            </h3>
            <button
              onClick={handleOpenDialog}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <AddIcon className="mr-2" />
              Assign Employees
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-blue-900 text-white p-4 flex items-center">
              <PersonIcon className="mr-2" />
              <h3 className="text-lg font-medium">
                Team Members ({assignedEmployees.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedEmployees.map((employee) => (
                    <tr
                      key={employee._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-medium">
                              {employee.name ? (
                                employee.name.charAt(0).toUpperCase()
                              ) : (
                                <PersonIcon className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.name || "Unknown Employee"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {employee.designation ||
                            employee.position ||
                            "Not Assigned"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveEmployee(employee._id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-full transition-colors"
                          title="Remove from project"
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Assign Employees Modal */}
        {openDialog && (
          <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Assign Employees to Project
                </h3>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employees
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {getFilteredEmployees().map((employee) => {
                      const isSelected = selectedEmployees.some(
                        (emp) => emp._id === employee._id
                      );
                      return (
                        <div
                          key={employee._id}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 border-blue-200"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedEmployees(
                                selectedEmployees.filter(
                                  (emp) => emp._id !== employee._id
                                )
                              );
                            } else {
                              setSelectedEmployees([
                                ...selectedEmployees,
                                employee,
                              ]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-shrink-0 h-8 w-8 mr-3">
                            <div className="h-8 w-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-sm font-medium">
                              {(() => {
                                const displayName =
                                  employee.personalDetails?.name ||
                                  employee.name ||
                                  employee.personalDetails?.fullName ||
                                  employee.fullName ||
                                  (employee.personalDetails?.firstName &&
                                  employee.personalDetails?.lastName
                                    ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
                                    : null) ||
                                  (employee.firstName && employee.lastName
                                    ? `${employee.firstName} ${employee.lastName}`
                                    : null) ||
                                  `Employee ${
                                    employee._id?.slice(-6) || "Unknown"
                                  }`;
                                return displayName ? (
                                  displayName.charAt(0).toUpperCase()
                                ) : (
                                  <PersonIcon className="h-4 w-4" />
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.personalDetails?.name ||
                                employee.name ||
                                employee.personalDetails?.fullName ||
                                employee.fullName ||
                                (employee.personalDetails?.firstName &&
                                employee.personalDetails?.lastName
                                  ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
                                  : null) ||
                                (employee.firstName && employee.lastName
                                  ? `${employee.firstName} ${employee.lastName}`
                                  : null) ||
                                `Employee ${
                                  employee._id?.slice(-6) || "Unknown"
                                }`}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.designation ||
                                employee.position ||
                                "Not Assigned"}{" "}
                              • {employee.department || "Not Assigned"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedEmployees.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">
                        Selected employees:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployees.map((employee) => (
                          <span
                            key={employee._id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {employee.personalDetails?.name ||
                              employee.name ||
                              employee.personalDetails?.fullName ||
                              employee.fullName ||
                              (employee.personalDetails?.firstName &&
                              employee.personalDetails?.lastName
                                ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
                                : null) ||
                              (employee.firstName && employee.lastName
                                ? `${employee.firstName} ${employee.lastName}`
                                : null) ||
                              `Employee ${
                                employee._id?.slice(-6) || "Unknown"
                              }`}
                            <button
                              onClick={() =>
                                setSelectedEmployees(
                                  selectedEmployees.filter(
                                    (emp) => emp._id !== employee._id
                                  )
                                )
                              }
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCloseDialog}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignEmployees}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectTeamPage;
