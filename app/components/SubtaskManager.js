"use client";

import { useState, useEffect } from "react";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

const SubtaskManager = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  employees = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Subtask state
  const [subtasks, setSubtasks] = useState([]);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    estimatedHours: 0,
    startDate: "",
    dueDate: "",
    status: "pending",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    estimatedHours: 0,
    startDate: "",
    dueDate: "",
  });

  useEffect(() => {
    if (task && isOpen) {
      setSubtasks(task.subtasks || []);
    }
  }, [task, isOpen]);

  const handleAddSubtask = async () => {
    if (!formData.title.trim()) {
      setError("Subtask title is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const newSubtask = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedTo: formData.assignedTo ? formData.assignedTo : null,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours || 0,
        actualHours: 0,
        startDate: formData.startDate ? new Date(formData.startDate) : null,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        status: "pending",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSubtasks = [...subtasks, newSubtask];

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtasks: updatedSubtasks,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubtasks(updatedSubtasks);
        setFormData({
          title: "",
          description: "",
          assignedTo: "",
          priority: "medium",
          estimatedHours: 0,
          startDate: "",
          dueDate: "",
        });
        setShowAddForm(false);
        setSuccess("Subtask added successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to add subtask");
      }
    } catch (err) {
      setError("Error adding subtask: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      setLoading(true);
      setError(null);

      const updatedSubtasks = subtasks.map((subtask) =>
        subtask._id === subtaskId
          ? { ...subtask, ...updates, updatedAt: new Date() }
          : subtask
      );

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtasks: updatedSubtasks,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubtasks(updatedSubtasks);
        setEditingSubtask(null);
        setSuccess("Subtask updated successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to update subtask");
      }
    } catch (err) {
      setError("Error updating subtask: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!confirm("Are you sure you want to delete this subtask?")) return;

    try {
      setLoading(true);
      setError(null);

      const updatedSubtasks = subtasks.filter(
        (subtask) => subtask._id !== subtaskId
      );

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtasks: updatedSubtasks,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubtasks(updatedSubtasks);
        setSuccess("Subtask deleted successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to delete subtask");
      }
    } catch (err) {
      setError("Error deleting subtask: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick inline edit using prompts (minimal UI to unblock editing)
  const editSubtask = async (subtask) => {
    try {
      const title = window.prompt("Title", subtask.title || "");
      if (title === null) return;
      const description = window.prompt(
        "Description",
        subtask.description || ""
      );
      if (description === null) return;
      const priority = window.prompt(
        "Priority (low|medium|high|critical)",
        subtask.priority || "medium"
      );
      if (priority === null) return;
      const estimatedHoursStr = window.prompt(
        "Estimated hours",
        String(subtask.estimatedHours || 0)
      );
      if (estimatedHoursStr === null) return;
      const estimatedHours = parseInt(estimatedHoursStr) || 0;
      const startDate = window.prompt(
        "Start date (YYYY-MM-DD)",
        subtask.startDate
          ? new Date(subtask.startDate).toISOString().split("T")[0]
          : ""
      );
      if (startDate === null) return;
      const dueDate = window.prompt(
        "Due date (YYYY-MM-DD)",
        subtask.dueDate
          ? new Date(subtask.dueDate).toISOString().split("T")[0]
          : ""
      );
      if (dueDate === null) return;

      await handleUpdateSubtask(subtask._id, {
        title: title.trim(),
        description: description.trim(),
        priority: (priority || "medium").toLowerCase(),
        estimatedHours,
        startDate: startDate || null,
        dueDate: dueDate || null,
      });
    } catch (e) {
      // noop - errors handled in handleUpdateSubtask
    }
  };

  const handleToggleStatus = async (subtaskId) => {
    const subtask = subtasks.find((st) => st._id === subtaskId);
    if (!subtask) return;

    const newStatus = subtask.status === "completed" ? "pending" : "completed";
    const newProgress = newStatus === "completed" ? 100 : 0;

    await handleUpdateSubtask(subtaskId, {
      status: newStatus,
      progress: newProgress,
    });
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Unassigned";
    const employee = employees.find((emp) => emp._id === employeeId);
    return employee
      ? employee.personalDetails?.name || employee.name || "Unknown"
      : "Unknown";
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
      case "pending":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const completedCount = subtasks.filter(
    (st) => st.status === "completed"
  ).length;
  const totalCount = subtasks.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AssignmentIcon className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Subtask Management
              </h2>
              <p className="text-sm text-gray-600">{task.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CancelIcon />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="text-green-600" fontSize="small" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <DeleteIcon className="text-red-600" fontSize="small" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Progress Overview
              </h3>
              <span className="text-sm text-gray-600">
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {completionPercentage}% complete
            </p>
          </div>

          {/* Add Subtask Form */}
          {showAddForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                Add New Subtask
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter subtask title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.personalDetails?.name ||
                          employee.name ||
                          "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedHours: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter subtask description"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      title: "",
                      description: "",
                      assignedTo: "",
                      priority: "medium",
                      estimatedHours: 0,
                      startDate: "",
                      dueDate: "",
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubtask}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Subtask"}
                </button>
              </div>
            </div>
          )}

          {/* Subtasks List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Subtasks ({totalCount})
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <AddIcon fontSize="small" />
                Add Subtask
              </button>
            </div>

            <div className="space-y-3">
              {subtasks.map((subtask) => (
                <div
                  key={subtask._id}
                  className={`p-4 rounded-lg border ${
                    subtask.status === "completed"
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleStatus(subtask._id)}
                      className="mt-1 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      {subtask.status === "completed" ? (
                        <CheckCircleIcon className="text-green-600" />
                      ) : (
                        <UncheckedIcon />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4
                          className={`font-medium ${
                            subtask.status === "completed"
                              ? "line-through text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {subtask.title}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getPriorityColor(
                            subtask.priority
                          )}`}
                        >
                          {subtask.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(
                            subtask.status
                          )}`}
                        >
                          {subtask.status}
                        </span>
                      </div>

                      {subtask.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {subtask.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <PersonIcon fontSize="small" />
                          <span>{getEmployeeName(subtask.assignedTo)}</span>
                        </div>
                        {subtask.estimatedHours > 0 && (
                          <div className="flex items-center gap-1">
                            <ScheduleIcon fontSize="small" />
                            <span>{subtask.estimatedHours}h estimated</span>
                          </div>
                        )}
                        {subtask.dueDate && (
                          <div className="flex items-center gap-1">
                            <FlagIcon fontSize="small" />
                            <span>
                              Due:{" "}
                              {new Date(subtask.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editSubtask(subtask)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubtask(subtask._id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {subtasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AssignmentIcon className="mx-auto mb-2 text-gray-300" />
                  <p>No subtasks yet. Add one to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubtaskManager;
