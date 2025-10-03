"use client";

import { useState, useEffect } from "react";
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const TaskAssignmentManager = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  employees = [],
  teams = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Assignment state
  const [assignedTo, setAssignedTo] = useState([]);
  const [assignedTeams, setAssignedTeams] = useState([]);
  const [newAssignee, setNewAssignee] = useState("");
  const [newTeam, setNewTeam] = useState("");

  // Ownership state
  const [primaryOwner, setPrimaryOwner] = useState("");
  const [ownershipType, setOwnershipType] = useState("individual"); // individual, team, shared

  useEffect(() => {
    if (task && isOpen) {
      setAssignedTo(task.assignedTo || []);
      setAssignedTeams(task.assignedTeams || []);
      setPrimaryOwner(task.primaryOwner || "");
      setOwnershipType(task.ownershipType || "individual");
    }
  }, [task, isOpen]);

  const handleAddAssignee = async () => {
    if (!newAssignee) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${task._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: [newAssignee],
          assignedBy: "admin", // TODO: Get from auth context
          notifyAssignees: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAssignedTo([...assignedTo, newAssignee]);
        setNewAssignee("");
        setSuccess("Assignee added successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to add assignee");
      }
    } catch (err) {
      setError("Error adding assignee: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignee = async (assigneeId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${task._id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: [assigneeId],
          removedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAssignedTo(assignedTo.filter((id) => id !== assigneeId));
        setSuccess("Assignee removed successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to remove assignee");
      }
    } catch (err) {
      setError("Error removing assignee: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${task._id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTeams: [newTeam],
          assignedBy: "admin", // TODO: Get from auth context
          notifyAssignees: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAssignedTeams([...assignedTeams, newTeam]);
        setNewTeam("");
        setSuccess("Team assigned successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to assign team");
      }
    } catch (err) {
      setError("Error assigning team: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${task._id}/assign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTeams: [teamId],
          removedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAssignedTeams(assignedTeams.filter((id) => id !== teamId));
        setSuccess("Team removed successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to remove team");
      }
    } catch (err) {
      setError("Error removing team: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOwnership = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryOwner,
          ownershipType,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess("Ownership updated successfully");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to update ownership");
      }
    } catch (err) {
      setError("Error updating ownership: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id === employeeId);
    return employee
      ? employee.personalDetails?.name || employee.name || "Unknown"
      : "Unknown";
  };

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t._id === teamId);
    return team ? team.name : "Unknown Team";
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AssignmentIcon className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Task Assignment & Ownership
            </h2>
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

          {/* Task Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span
                className={`px-2 py-1 rounded text-xs ${getPriorityColor(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <ScheduleIcon fontSize="small" />
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Ownership Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Task Ownership
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ownership Type
                </label>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="individual">Individual Ownership</option>
                  <option value="team">Team Ownership</option>
                  <option value="shared">Shared Ownership</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Owner
                </label>
                <select
                  value={primaryOwner}
                  onChange={(e) => setPrimaryOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Primary Owner</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.personalDetails?.name ||
                        employee.name ||
                        "Unknown"}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUpdateOwnership}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Ownership"}
              </button>
            </div>
          </div>

          {/* Individual Assignees */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Individual Assignees
            </h3>

            <div className="space-y-4">
              {/* Add New Assignee */}
              <div className="flex gap-2">
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Employee</option>
                  {employees
                    .filter((emp) => !assignedTo.includes(emp._id))
                    .map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.personalDetails?.name ||
                          employee.name ||
                          "Unknown"}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddAssignee}
                  disabled={loading || !newAssignee}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <AddIcon fontSize="small" />
                </button>
              </div>

              {/* Current Assignees */}
              <div className="space-y-2">
                {assignedTo.map((assigneeId) => (
                  <div
                    key={assigneeId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <PersonIcon className="text-gray-400" fontSize="small" />
                      <span className="text-sm font-medium text-gray-900">
                        {getEmployeeName(assigneeId)}
                      </span>
                      {primaryOwner === assigneeId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Primary Owner
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAssignee(assigneeId)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      <RemoveIcon fontSize="small" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Assignments */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Team Assignments
            </h3>

            <div className="space-y-4">
              {/* Add New Team */}
              <div className="flex gap-2">
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Team</option>
                  {teams
                    .filter((team) => !assignedTeams.includes(team._id))
                    .map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleAddTeam}
                  disabled={loading || !newTeam}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <AddIcon fontSize="small" />
                </button>
              </div>

              {/* Current Teams */}
              <div className="space-y-2">
                {assignedTeams.map((teamId) => (
                  <div
                    key={teamId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className="text-gray-400" fontSize="small" />
                      <span className="text-sm font-medium text-gray-900">
                        {getTeamName(teamId)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveTeam(teamId)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      <RemoveIcon fontSize="small" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <InfoIcon className="text-blue-600" fontSize="small" />
              <h4 className="font-medium text-blue-900">Assignment Summary</h4>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• {assignedTo.length} individual assignee(s)</p>
              <p>• {assignedTeams.length} team(s) assigned</p>
              <p>• Ownership: {ownershipType}</p>
              {primaryOwner && (
                <p>• Primary Owner: {getEmployeeName(primaryOwner)}</p>
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

// Helper functions
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

export default TaskAssignmentManager;
