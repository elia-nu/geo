"use client";

import { useState, useEffect } from "react";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Send as SendIcon,
} from "@mui/icons-material";

const TaskAssignmentDialog = ({
  isOpen,
  onClose,
  onAssign,
  selectedTasks = [],
}) => {
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifyAssignees, setNotifyAssignees] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchTeams();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchTeams = async () => {
    try {
      // Assuming teams API exists or use departments
      setTeams([]); // Placeholder - implement teams API if needed
    } catch (err) {
      console.error("Error fetching teams:", err);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();

    if (selectedEmployees.length === 0 && selectedTeams.length === 0) {
      setError("Please select at least one assignee");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: selectedTasks.map((task) => task._id),
          assignedTo: selectedEmployees,
          assignedTeams: selectedTeams,
          assignedBy: "admin", // TODO: Get from auth context
          notifyAssignees,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (onAssign) onAssign();
        onClose();
        resetForm();
      } else {
        setError(data.error || "Failed to assign tasks");
      }
    } catch (err) {
      setError("Error assigning tasks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployees([]);
    setSelectedTeams([]);
    setNotifyAssignees(true);
    setError(null);
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleTeamToggle = (teamId) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Tasks</h2>
            <p className="text-sm text-gray-600 mt-1">
              Assigning {selectedTasks.length} task
              {selectedTasks.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Selected Tasks Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Selected Tasks:
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {selectedTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center gap-2 mb-1 last:mb-0"
                >
                  <AssignmentIcon className="text-gray-400" fontSize="small" />
                  <span className="text-sm text-gray-700 truncate">
                    {task.title}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === "critical"
                        ? "bg-red-100 text-red-800"
                        : task.priority === "high"
                        ? "bg-orange-100 text-orange-800"
                        : task.priority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Selection */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <PersonIcon className="text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700">
                Assign to Employees
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {employees.map((employee) => (
                <label
                  key={employee._id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(employee._id)}
                    onChange={() => handleEmployeeToggle(employee._id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(
                        employee.personalDetails?.name ||
                        employee.name ||
                        "U"
                      ).charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.personalDetails?.name ||
                          employee.name ||
                          "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.department ||
                          employee.personalDetails?.department ||
                          "No Department"}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
              {employees.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4 col-span-2">
                  No employees available
                </p>
              )}
            </div>
            {selectedEmployees.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {selectedEmployees.length} employee
                {selectedEmployees.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Team Selection (if teams are available) */}
          {teams.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <GroupIcon className="text-gray-500" />
                <h3 className="text-sm font-medium text-gray-700">
                  Assign to Teams
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {teams.map((team) => (
                  <label
                    key={team._id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeams.includes(team._id)}
                      onChange={() => handleTeamToggle(team._id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {team.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {team.memberCount} members
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyAssignees}
                onChange={(e) => setNotifyAssignees(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Send notifications to assignees
              </span>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={
              loading ||
              (selectedEmployees.length === 0 && selectedTeams.length === 0)
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon fontSize="small" />
            {loading ? "Assigning..." : "Assign Tasks"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskAssignmentDialog;
