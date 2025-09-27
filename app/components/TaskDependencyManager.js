"use client";

import { useState, useEffect } from "react";
import {
  Timeline as TimelineIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";

const TaskDependencyManager = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  allTasks = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dependency state
  const [dependencies, setDependencies] = useState([]);
  const [newDependency, setNewDependency] = useState("");
  const [dependencyIssues, setDependencyIssues] = useState([]);

  useEffect(() => {
    if (task && isOpen) {
      setDependencies(task.dependencies || []);
      checkDependencyIssues();
    }
  }, [task, isOpen, allTasks]);

  const checkDependencyIssues = () => {
    const issues = [];
    const taskDeps = task?.dependencies || [];

    taskDeps.forEach((depId) => {
      const depTask = allTasks.find((t) => t._id === depId);
      if (!depTask) {
        issues.push({
          type: "missing",
          message: `Dependency task not found (ID: ${depId})`,
          taskId: depId,
        });
      } else if (depTask.status !== "completed") {
        issues.push({
          type: "incomplete",
          message: `Dependency "${depTask.title}" is not completed`,
          taskId: depId,
          taskTitle: depTask.title,
          status: depTask.status,
        });
      }
    });

    // Check for circular dependencies
    const circularDeps = checkCircularDependencies(
      task?._id,
      taskDeps,
      allTasks
    );
    issues.push(...circularDeps);

    setDependencyIssues(issues);
  };

  const checkCircularDependencies = (taskId, deps, allTasks) => {
    const issues = [];
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (currentTaskId, path = []) => {
      if (recursionStack.has(currentTaskId)) {
        issues.push({
          type: "circular",
          message: `Circular dependency detected: ${path.join(
            " → "
          )} → ${currentTaskId}`,
          taskId: currentTaskId,
          path: [...path, currentTaskId],
        });
        return true;
      }

      if (visited.has(currentTaskId)) return false;

      visited.add(currentTaskId);
      recursionStack.add(currentTaskId);

      const currentTask = allTasks.find((t) => t._id === currentTaskId);
      if (currentTask && currentTask.dependencies) {
        for (const depId of currentTask.dependencies) {
          if (hasCycle(depId, [...path, currentTaskId])) {
            return true;
          }
        }
      }

      recursionStack.delete(currentTaskId);
      return false;
    };

    deps.forEach((depId) => {
      hasCycle(depId, [taskId]);
    });

    return issues;
  };

  const handleAddDependency = async () => {
    if (!newDependency) {
      setError("Please select a task to add as dependency");
      return;
    }

    if (dependencies.includes(newDependency)) {
      setError("This task is already a dependency");
      return;
    }

    if (newDependency === task._id) {
      setError("A task cannot depend on itself");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedDependencies = [...dependencies, newDependency];

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dependencies: updatedDependencies,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDependencies(updatedDependencies);
        setNewDependency("");
        setSuccess("Dependency added successfully");
        checkDependencyIssues();
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to add dependency");
      }
    } catch (err) {
      setError("Error adding dependency: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDependency = async (dependencyId) => {
    try {
      setLoading(true);
      setError(null);

      const updatedDependencies = dependencies.filter(
        (dep) => dep !== dependencyId
      );

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dependencies: updatedDependencies,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDependencies(updatedDependencies);
        setSuccess("Dependency removed successfully");
        checkDependencyIssues();
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to remove dependency");
      }
    } catch (err) {
      setError("Error removing dependency: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTitle = (taskId) => {
    const task = allTasks.find((t) => t._id === taskId);
    return task ? task.title : "Unknown Task";
  };

  const getTaskStatus = (taskId) => {
    const task = allTasks.find((t) => t._id === taskId);
    return task ? task.status : "unknown";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "review":
        return "text-purple-600 bg-purple-100";
      case "blocked":
        return "text-red-600 bg-red-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case "circular":
        return <WarningIcon className="text-red-600" />;
      case "incomplete":
        return <WarningIcon className="text-orange-600" />;
      case "missing":
        return <WarningIcon className="text-red-600" />;
      default:
        return <InfoIcon className="text-blue-600" />;
    }
  };

  const getIssueColor = (type) => {
    switch (type) {
      case "circular":
        return "bg-red-50 border-red-200";
      case "incomplete":
        return "bg-orange-50 border-orange-200";
      case "missing":
        return "bg-red-50 border-red-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  // Filter out current task and already added dependencies
  const availableTasks = allTasks.filter(
    (t) =>
      t._id !== task._id &&
      !dependencies.includes(t._id) &&
      t.projectId === task.projectId // Only show tasks from same project
  );

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <TimelineIcon className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Task Dependencies
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
                <WarningIcon className="text-red-600" fontSize="small" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Dependency Issues */}
          {dependencyIssues.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <WarningIcon className="text-yellow-600" />
                Dependency Issues ({dependencyIssues.length})
              </h3>
              <div className="space-y-2">
                {dependencyIssues.map((issue, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getIssueColor(
                      issue.type
                    )}`}
                  >
                    <div className="flex items-start gap-2">
                      {getIssueIcon(issue.type)}
                      <p className="text-sm text-gray-800">{issue.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Dependency */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Add Dependency
            </h3>
            <div className="flex gap-3">
              <select
                value={newDependency}
                onChange={(e) => setNewDependency(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a task to depend on</option>
                {availableTasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.title} ({task.status})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddDependency}
                disabled={loading || !newDependency}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <AddIcon fontSize="small" />
              </button>
            </div>
            {availableTasks.length === 0 && (
              <p className="text-sm text-gray-600 mt-2">
                No available tasks to add as dependencies
              </p>
            )}
          </div>

          {/* Current Dependencies */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Current Dependencies ({dependencies.length})
            </h3>

            {dependencies.length > 0 ? (
              <div className="space-y-3">
                {dependencies.map((dependencyId) => {
                  const depTask = allTasks.find((t) => t._id === dependencyId);
                  const isCompleted = depTask?.status === "completed";
                  const isBlocked = depTask?.status === "blocked";

                  return (
                    <div
                      key={dependencyId}
                      className={`p-4 rounded-lg border ${
                        isCompleted
                          ? "bg-green-50 border-green-200"
                          : isBlocked
                          ? "bg-red-50 border-red-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ArrowForwardIcon
                            className="text-gray-400"
                            fontSize="small"
                          />
                          <div>
                            <h4
                              className={`font-medium ${
                                isCompleted
                                  ? "line-through text-gray-500"
                                  : "text-gray-900"
                              }`}
                            >
                              {getTaskTitle(dependencyId)}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                  getTaskStatus(dependencyId)
                                )}`}
                              >
                                {getTaskStatus(dependencyId)}
                              </span>
                              {isCompleted && (
                                <CheckCircleIcon
                                  className="text-green-600"
                                  fontSize="small"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dependencyId)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                        >
                          <RemoveIcon fontSize="small" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TimelineIcon className="mx-auto mb-2 text-gray-300" />
                <p>
                  No dependencies yet. Add one to create task relationships!
                </p>
              </div>
            )}
          </div>

          {/* Dependency Visualization */}
          {dependencies.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dependency Flow
              </h3>
              <div className="flex items-center gap-4 overflow-x-auto">
                {dependencies.map((dependencyId, index) => {
                  const depTask = allTasks.find((t) => t._id === dependencyId);
                  const isCompleted = depTask?.status === "completed";

                  return (
                    <div key={dependencyId} className="flex items-center gap-2">
                      <div
                        className={`p-3 rounded-lg border min-w-[120px] text-center ${
                          isCompleted
                            ? "bg-green-100 border-green-300"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            isCompleted
                              ? "line-through text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {getTaskTitle(dependencyId)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {getTaskStatus(dependencyId)}
                        </p>
                      </div>
                      {index < dependencies.length - 1 && (
                        <ArrowForwardIcon className="text-gray-400" />
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <ArrowForwardIcon className="text-gray-400" />
                  <div className="p-3 rounded-lg border bg-blue-100 border-blue-300 min-w-[120px] text-center">
                    <p className="text-sm font-medium text-blue-900">
                      {task.title}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">{task.status}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dependency Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <InfoIcon className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About Dependencies:</p>
                <ul className="space-y-1 text-xs">
                  <li>
                    • Tasks with incomplete dependencies cannot be started
                  </li>
                  <li>
                    • Circular dependencies are automatically detected and
                    prevented
                  </li>
                  <li>
                    • Only tasks from the same project can be added as
                    dependencies
                  </li>
                  <li>• Completed dependencies are shown with a checkmark</li>
                </ul>
              </div>
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

export default TaskDependencyManager;
