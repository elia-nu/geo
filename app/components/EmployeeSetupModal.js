"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  MapPin,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

export default function EmployeeSetupModal({
  employee,
  onClose,
  onSuccess,
  onError,
  defaultTab = "password",
}) {
  const [setupType, setSetupType] = useState(defaultTab); // "password" or "location"
  const [loading, setLoading] = useState(false);

  // Password setup form
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // Location setup form
  const [workLocations, setWorkLocations] = useState([]);
  const [selectedWorkLocations, setSelectedWorkLocations] = useState([]);
  const [employeeWorkLocations, setEmployeeWorkLocations] = useState([]);

  useEffect(() => {
    if (setupType === "location") {
      fetchWorkLocations();
      fetchEmployeeWorkLocations();
    }
  }, [setupType, employee]);

  const fetchWorkLocations = async () => {
    try {
      const response = await fetch("/api/work-locations");
      const data = await response.json();
      if (data.success) {
        setWorkLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Error fetching work locations:", error);
    }
  };

  const fetchEmployeeWorkLocations = async () => {
    try {
      const response = await fetch(
        `/api/employee/${employee._id}/work-location`
      );
      const data = await response.json();
      if (data.success && data.workLocations) {
        setEmployeeWorkLocations(data.workLocations || []);
        setSelectedWorkLocations(
          (data.workLocations || []).map((loc) => loc._id || loc.id)
        );
      } else {
        setEmployeeWorkLocations([]);
        setSelectedWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching employee work locations:", error);
      setEmployeeWorkLocations([]);
      setSelectedWorkLocations([]);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      onError("Please fill in all password fields");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      onError("Passwords do not match");
      return;
    }

    if (passwordForm.password.length < 6) {
      onError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/employee/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee._id,
          password: passwordForm.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess("Password setup successfully!");
        setPasswordForm({ password: "", confirmPassword: "" });
      } else {
        onError(data.error || "Failed to setup password");
      }
    } catch (error) {
      console.error("Error setting up password:", error);
      onError("Failed to setup password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (selectedWorkLocations.length === 0) {
      onError("Please select at least one work location");
      return;
    }

    setLoading(true);
    try {
      // Assign employee to each selected work location
      const assignmentPromises = selectedWorkLocations.map((locationId) =>
        fetch(`/api/work-locations/${locationId}/assign-employees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [employee._id] }),
        })
      );

      const responses = await Promise.all(assignmentPromises);
      const results = await Promise.all(responses.map((res) => res.json()));

      // Check if all assignments were successful
      const failedAssignments = results.filter((result) => !result.success);

      if (failedAssignments.length > 0) {
        onError(
          `Failed to assign ${failedAssignments.length} location(s). Please try again.`
        );
        return;
      }

      onSuccess(
        `${selectedWorkLocations.length} work location(s) assigned successfully!`
      );
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error assigning work locations:", error);
      onError("Failed to assign work locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkLocation = (locationId) => {
    setSelectedWorkLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleRemoveLocation = async (locationId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/work-locations/${locationId}/assign-employees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [employee._id] }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        onError(result.error || "Failed to remove work location");
        return;
      }

      onSuccess("Work location removed successfully!");
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error removing location:", error);
      onError("Failed to remove work location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = () => {
    return employee.personalDetails?.name || employee.name || "Employee";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Employee Setup</h3>
                <p className="text-purple-100 text-sm">
                  {getEmployeeName()} - Configure password & work locations
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setSetupType("password")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                setupType === "password"
                  ? "border-b-2 border-purple-600 text-purple-600 bg-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Password Setup</span>
              </div>
            </button>
            <button
              onClick={() => setSetupType("location")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                setupType === "location"
                  ? "border-b-2 border-purple-600 text-purple-600 bg-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Work Locations</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {setupType === "password" ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      Set up a secure password for{" "}
                      <span className="font-semibold">{getEmployeeName()}</span>{" "}
                      to access the employee portal.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="Enter password (min. 6 characters)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-gray-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      Assign work locations where{" "}
                      <span className="font-semibold">{getEmployeeName()}</span>{" "}
                      can check in/out for attendance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Assigned Locations */}
              {employeeWorkLocations.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Currently Assigned Locations ({employeeWorkLocations.length}
                    )
                  </h4>
                  <div className="space-y-2">
                    {employeeWorkLocations.map((location) => (
                      <div
                        key={location._id || location.id}
                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {location.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {location.address}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveLocation(location._id || location.id)
                          }
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Locations */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Available Work Locations
                </h4>
                {workLocations.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No work locations available. Please create work locations
                    first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {workLocations.map((location) => (
                      <label
                        key={location._id}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedWorkLocations.includes(location._id)
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkLocations.includes(location._id)}
                          onChange={() => toggleWorkLocation(location._id)}
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-900">
                            {location.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {location.address}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Radius: {location.radius}m
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={
              setupType === "password"
                ? handlePasswordSubmit
                : handleLocationSubmit
            }
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>
                  {setupType === "password"
                    ? "Set Password"
                    : "Assign Locations"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
