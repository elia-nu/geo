"use client";

import { useState, useEffect } from "react";
import { showDeleteConfirmDialog } from "../utils/sweetAlert";
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
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(null);
  const [isDeletingSubtask, setIsDeletingSubtask] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

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

  // Filter employees to only show those assigned to the parent task
  const getAssignedEmployees = () => {
    if (!task || !task.assignedTo || !Array.isArray(task.assignedTo)) {
      return [];
    }

    return employees.filter((employee) =>
      task.assignedTo.some(
        (assignedEmp) =>
          assignedEmp._id === employee._id || assignedEmp === employee._id
      )
    );
  };

  const assignedEmployees = getAssignedEmployees();

  // Comprehensive validation function for subtasks
  const validateSubtaskForm = (formData, isEdit = false) => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Title validation
    if (!formData.title || formData.title.trim().length === 0) {
      errors.title = "Subtask title is required";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long";
    } else if (formData.title.trim().length > 100) {
      errors.title = "Title must not exceed 100 characters";
    }

    // Description validation
    if (!formData.description || formData.description.trim().length === 0) {
      errors.description = "Description is required";
    } else if (formData.description.trim().length < 5) {
      errors.description = "Description must be at least 5 characters long";
    } else if (formData.description.trim().length > 500) {
      errors.description = "Description must not exceed 500 characters";
    }

    // Assignment validation
    if (!formData.assignedTo || formData.assignedTo.trim().length === 0) {
      errors.assignedTo = "Please assign the subtask to an employee";
    } else {
      // Check if assigned employee is part of the parent task's assigned employees
      if (task && task.assignedTo && Array.isArray(task.assignedTo)) {
        const isAssignedToTask = task.assignedTo.some(
          (emp) =>
            emp._id === formData.assignedTo || emp === formData.assignedTo
        );
        if (!isAssignedToTask) {
          errors.assignedTo =
            "Subtask can only be assigned to employees who are assigned to the parent task";
        }
      }
    }

    // Priority validation
    if (
      !formData.priority ||
      !["low", "medium", "high", "critical"].includes(formData.priority)
    ) {
      errors.priority = "Please select a valid priority level";
    }

    // Start date validation (mandatory)
    if (!formData.startDate) {
      errors.startDate = "Start date is required for subtasks";
    } else {
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (isNaN(startDate.getTime())) {
        errors.startDate = "Please enter a valid start date";
      } else {
        // Check if start date is not in the past (unless editing)
        if (!isEdit && startDate < today) {
          errors.startDate = "Start date cannot be in the past";
        }

        // Check if start date is within parent task timeline
        if (task) {
          if (task.startDate) {
            const taskStart = new Date(task.startDate);
            taskStart.setHours(0, 0, 0, 0);
            if (startDate < taskStart) {
              errors.startDate = `Start date cannot be before parent task start date (${taskStart.toLocaleDateString()})`;
            }
          }

          if (task.dueDate) {
            const taskEnd = new Date(task.dueDate);
            taskEnd.setHours(0, 0, 0, 0);
            if (startDate > taskEnd) {
              errors.startDate = `Start date cannot be after parent task due date (${taskEnd.toLocaleDateString()})`;
            }
          }
        }
      }
    }

    // Due date validation (mandatory)
    if (!formData.dueDate) {
      errors.dueDate = "Due date is required for subtasks";
    } else {
      const dueDate = new Date(formData.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (isNaN(dueDate.getTime())) {
        errors.dueDate = "Please enter a valid due date";
      } else {
        // Check if due date is not in the past (unless editing)
        if (!isEdit && dueDate < today) {
          errors.dueDate = "Due date cannot be in the past";
        }

        // Check if due date is after start date
        if (formData.startDate) {
          const startDate = new Date(formData.startDate);
          startDate.setHours(0, 0, 0, 0);
          if (dueDate <= startDate) {
            errors.dueDate = "Due date must be after start date";
          }
        }

        // Check if due date is within parent task timeline
        if (task) {
          if (task.startDate) {
            const taskStart = new Date(task.startDate);
            taskStart.setHours(0, 0, 0, 0);
            if (dueDate < taskStart) {
              errors.dueDate = `Due date cannot be before parent task start date (${taskStart.toLocaleDateString()})`;
            }
          }

          if (task.dueDate) {
            const taskEnd = new Date(task.dueDate);
            taskEnd.setHours(0, 0, 0, 0);
            if (dueDate > taskEnd) {
              errors.dueDate = `Due date cannot be after parent task due date (${taskEnd.toLocaleDateString()})`;
            }
          }
        }
      }
    }

    // Estimated hours validation
    if (
      formData.estimatedHours !== undefined &&
      formData.estimatedHours !== null
    ) {
      const hours = parseFloat(formData.estimatedHours);
      if (isNaN(hours) || hours < 0) {
        errors.estimatedHours = "Estimated hours must be a positive number";
      } else if (hours > 100) {
        errors.estimatedHours =
          "Estimated hours cannot exceed 100 hours for a subtask";
      }
    }

    return errors;
  };

  // Helper function to check if there are any validation errors
  const hasValidationErrors = (errors) => {
    return Object.keys(errors).length > 0;
  };

  // Helper function to display validation errors
  const showValidationErrors = (errors) => {
    const errorMessages = Object.values(errors).join("\n");
    setError(errorMessages);
  };

  const handleAddSubtask = async () => {
    setError(null);
    setValidationErrors({});

    // Perform comprehensive validation
    const validationErrors = validateSubtaskForm(formData, false);
    if (hasValidationErrors(validationErrors)) {
      setValidationErrors(validationErrors);
      showValidationErrors(validationErrors);
      return;
    }

    try {
      setIsCreatingSubtask(true);
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
        // Fetch fresh task to get server-assigned ObjectIds for new subtasks
        try {
          const refreshed = await fetch(`/api/tasks/${task._id}`);
          const refreshedJson = await refreshed.json();
          if (refreshedJson.success && refreshedJson.task?.subtasks) {
            setSubtasks(refreshedJson.task.subtasks);
          } else {
            setSubtasks(updatedSubtasks);
          }
        } catch (_) {
          setSubtasks(updatedSubtasks);
        }
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
      setIsCreatingSubtask(false);
    }
  };

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      setIsUpdatingSubtask(subtaskId);
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
        // Refresh from server to ensure we have canonical subtasks with _id
        try {
          const refreshed = await fetch(`/api/tasks/${task._id}`);
          const refreshedJson = await refreshed.json();
          if (refreshedJson.success && refreshedJson.task?.subtasks) {
            setSubtasks(refreshedJson.task.subtasks);
          } else {
            setSubtasks(updatedSubtasks);
          }
        } catch (_) {
          setSubtasks(updatedSubtasks);
        }
        setEditingSubtask(null);
        setSuccess("Subtask updated successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to update subtask");
      }
    } catch (err) {
      setError("Error updating subtask: " + err.message);
    } finally {
      setIsUpdatingSubtask(null);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    const result = await showDeleteConfirmDialog(
      "Delete Subtask",
      "Are you sure you want to delete this subtask? This action cannot be undone.",
      "Yes, delete it!"
    );

    if (!result.isConfirmed) return;

    try {
      setIsDeletingSubtask(subtaskId);
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
        // Refresh from server to ensure we have canonical subtasks with _id
        try {
          const refreshed = await fetch(`/api/tasks/${task._id}`);
          const refreshedJson = await refreshed.json();
          if (refreshedJson.success && refreshedJson.task?.subtasks) {
            setSubtasks(refreshedJson.task.subtasks);
          } else {
            setSubtasks(updatedSubtasks);
          }
        } catch (_) {
          setSubtasks(updatedSubtasks);
        }
        setSuccess("Subtask deleted successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to delete subtask");
      }
    } catch (err) {
      setError("Error deleting subtask: " + err.message);
    } finally {
      setIsDeletingSubtask(null);
    }
  };

  // Enter edit mode with inline form
  const editSubtask = (subtask) => {
    setEditingSubtask(subtask._id);
    // Ensure the add form is closed while editing
    setShowAddForm(false);
    setEditData({
      title: subtask.title || "",
      description: subtask.description || "",
      assignedTo: subtask.assignedTo || "",
      priority: subtask.priority || "medium",
      estimatedHours: subtask.estimatedHours || 0,
      startDate: subtask.startDate
        ? new Date(subtask.startDate).toISOString().split("T")[0]
        : "",
      dueDate: subtask.dueDate
        ? new Date(subtask.dueDate).toISOString().split("T")[0]
        : "",
      status: subtask.status || "pending",
    });
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

  // Handle save edit with validation
  const handleSaveEdit = async (subtaskId) => {
    setError(null);
    setValidationErrors({});

    // Perform comprehensive validation for editing
    const validationErrors = validateSubtaskForm(editData, true);
    if (hasValidationErrors(validationErrors)) {
      setValidationErrors(validationErrors);
      showValidationErrors(validationErrors);
      return;
    }

    // If validation passes, proceed with update
    await handleUpdateSubtask(subtaskId, {
      title: editData.title.trim(),
      description: editData.description.trim(),
      assignedTo: editData.assignedTo || null,
      priority: editData.priority,
      estimatedHours: editData.estimatedHours || 0,
      startDate: editData.startDate || null,
      dueDate: editData.dueDate || null,
      status: editData.status,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
          {showAddForm && !editingSubtask && (
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.title
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Enter subtask title"
                  />
                  {validationErrors.title && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.title}
                    </p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.priority
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  {validationErrors.priority && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.priority}
                    </p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.assignedTo
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">Select Employee</option>
                    {assignedEmployees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.personalDetails?.name ||
                          employee.name ||
                          "Unknown"}
                      </option>
                    ))}
                  </select>
                  {validationErrors.assignedTo && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.assignedTo}
                    </p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.estimatedHours
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    min="0"
                  />
                  {validationErrors.estimatedHours && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.estimatedHours}
                    </p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.startDate
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {validationErrors.startDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.startDate}
                    </p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      validationErrors.dueDate
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                  {validationErrors.dueDate && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.dueDate}
                    </p>
                  )}
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                    validationErrors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  rows="3"
                  placeholder="Enter subtask description"
                />
                {validationErrors.description && (
                  <p className="text-xs text-red-600 mt-1">
                    {validationErrors.description}
                  </p>
                )}
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
                  disabled={isCreatingSubtask}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    isCreatingSubtask
                      ? "bg-blue-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isCreatingSubtask && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {isCreatingSubtask ? "Adding..." : "Add Subtask"}
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
                onClick={() => {
                  if (editingSubtask) return;
                  setShowAddForm(!showAddForm);
                }}
                disabled={!!editingSubtask}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  editingSubtask
                    ? "Finish editing before adding a new subtask"
                    : undefined
                }
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
                  {editingSubtask === subtask._id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Title *
                          </label>
                          <input
                            type="text"
                            value={editData.title}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                title: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.title
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                            placeholder="Enter subtask title"
                          />
                          {validationErrors.title && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.title}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                          </label>
                          <select
                            value={editData.priority}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                priority: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.priority
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                          {validationErrors.priority && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.priority}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assigned To
                          </label>
                          <select
                            value={editData.assignedTo || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                assignedTo: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.assignedTo
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          >
                            <option value="">Select Employee</option>
                            {assignedEmployees.map((employee) => (
                              <option key={employee._id} value={employee._id}>
                                {employee.personalDetails?.name ||
                                  employee.name ||
                                  "Unknown"}
                              </option>
                            ))}
                          </select>
                          {validationErrors.assignedTo && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.assignedTo}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Estimated Hours
                          </label>
                          <input
                            type="number"
                            value={editData.estimatedHours}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                estimatedHours: parseInt(e.target.value) || 0,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.estimatedHours
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                            min="0"
                          />
                          {validationErrors.estimatedHours && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.estimatedHours}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={editData.startDate}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                startDate: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.startDate
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          />
                          {validationErrors.startDate && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.startDate}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={editData.dueDate}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                dueDate: e.target.value,
                              })
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                              validationErrors.dueDate
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          />
                          {validationErrors.dueDate && (
                            <p className="text-xs text-red-600 mt-1">
                              {validationErrors.dueDate}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={editData.description}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              description: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                            validationErrors.description
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                          rows="3"
                          placeholder="Enter subtask description"
                        />
                        {validationErrors.description && (
                          <p className="text-xs text-red-600 mt-1">
                            {validationErrors.description}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setEditingSubtask(null);
                          }}
                          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(subtask._id)}
                          disabled={
                            isUpdatingSubtask === subtask._id ||
                            !editData.title.trim()
                          }
                          className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                            isUpdatingSubtask === subtask._id
                              ? "bg-blue-400"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {isUpdatingSubtask === subtask._id && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          )}
                          {isUpdatingSubtask === subtask._id
                            ? "Saving..."
                            : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
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
                          disabled={isDeletingSubtask === subtask._id}
                          className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center"
                        >
                          {isDeletingSubtask === subtask._id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
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
