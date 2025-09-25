"use client";

import { useState, useEffect, use } from "react";
import Layout from "../../../components/Layout";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import Link from "next/link";

const ProjectMilestonesPage = ({ params }) => {
  const { id: projectId } = use(params);

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: null,
    status: "not_started",
    progress: 0,
  });

  // Fetch project and milestones on component mount
  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);

        // Extract milestones from project data
        if (projectData.project.milestones) {
          setMilestones(projectData.project.milestones);
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

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setCurrentMilestone(milestone);
      setFormData({
        title: milestone.title,
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

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        dueDate: formData.dueDate?.toISOString(),
      };

      let url, method;

      if (currentMilestone) {
        // Update existing milestone
        url = `/api/projects/${projectId}/milestones/${currentMilestone._id}`;
        method = "PUT";
      } else {
        // Create new milestone
        url = `/api/projects/${projectId}/milestones`;
        method = "POST";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
        handleCloseDialog();
      } else {
        setError(data.error || "Failed to save milestone");
      }
    } catch (err) {
      setError("Error saving milestone: " + err.message);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
      } else {
        setError(data.error || "Failed to delete milestone");
      }
    } catch (err) {
      setError("Error deleting milestone: " + err.message);
    }
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
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium mb-4">
              Project not found or you don't have permission to view it.
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowBackIcon className="mr-2" />
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link
            href="/projects"
            className="hover:text-blue-600 transition-colors"
          >
            Projects
          </Link>
          <span className="text-gray-400">›</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-blue-600 transition-colors"
          >
            {project.name}
          </Link>
          <span className="text-gray-400">›</span>
          <span className="text-gray-900 font-medium">Milestones</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
            Project Milestones
          </h1>
          <button
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            onClick={() => handleOpenDialog()}
          >
            <AddIcon className="mr-2 h-4 w-4" />
            Add Milestone
          </button>
        </div>

        {/* Project Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {project.name}
          </h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                getStatusColor(project.status || "not_started") === "success"
                  ? "bg-green-100 text-green-800"
                  : getStatusColor(project.status || "not_started") ===
                    "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : getStatusColor(project.status || "not_started") === "error"
                  ? "bg-red-100 text-red-800"
                  : getStatusColor(project.status || "not_started") === "info"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {formatStatus(project.status || "not_started")}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Progress: {project.progress || 0}%
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Timeline:</span>{" "}
            {project.startDate
              ? format(parseISO(project.startDate), "MMM d, yyyy")
              : "Not set"}{" "}
            -
            {project.endDate
              ? format(parseISO(project.endDate), "MMM d, yyyy")
              : "Not set"}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Milestones Content */}
        {milestones.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg">
              No milestones found. Add your first milestone to track project
              progress.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {milestones.map((milestone) => (
                  <tr
                    key={milestone._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {milestone.title}
                      </div>
                      {milestone.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {milestone.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {milestone.dueDate
                        ? format(parseISO(milestone.dueDate), "MMM d, yyyy")
                        : "Not set"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusColor(milestone.status || "not_started") ===
                          "success"
                            ? "bg-green-100 text-green-800"
                            : getStatusColor(
                                milestone.status || "not_started"
                              ) === "warning"
                            ? "bg-yellow-100 text-yellow-800"
                            : getStatusColor(
                                milestone.status || "not_started"
                              ) === "error"
                            ? "bg-red-100 text-red-800"
                            : getStatusColor(
                                milestone.status || "not_started"
                              ) === "info"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {formatStatus(milestone.status || "not_started")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${milestone.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 min-w-[3rem]">
                          {milestone.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          onClick={() => handleOpenDialog(milestone)}
                          title="Edit milestone"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          onClick={() => handleDeleteMilestone(milestone._id)}
                          title="Delete milestone"
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {openDialog && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <span
                className="hidden sm:inline-block sm:align-middle sm:h-screen"
                aria-hidden="true"
              >
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentMilestone
                        ? "Edit Milestone"
                        : "Add New Milestone"}
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={handleCloseDialog}
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Milestone Title *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="dueDate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Due Date
                      </label>
                      <input
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={
                          formData.dueDate
                            ? formData.dueDate.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={handleDateChange}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="progress"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Progress: {formData.progress}%
                      </label>
                      <input
                        type="range"
                        id="progress"
                        name="progress"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        min="0"
                        max="100"
                        step="5"
                        value={formData.progress}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6 -mx-4 -mb-4 sm:-mx-6 sm:-mb-4">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                      >
                        {currentMilestone ? "Update" : "Add"}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        onClick={handleCloseDialog}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectMilestonesPage;
