"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  User,
  Lock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";

export default function EmployeeSetupPage() {
  const [activeSection, setActiveSection] = useState("employee-setup");

  const handleSectionChange = (section) => {
    // For standalone pages, we need to handle navigation to HRM dashboard sections
    if (section === "dashboard") {
      window.location.href = "/hrm";
    } else if (section === "employees" || section === "employee-database") {
      window.location.href = "/hrm?section=employee-database";
    } else if (section === "employee-add") {
      window.location.href = "/hrm?section=employee-add";
    } else if (section === "documents" || section === "document-list") {
      window.location.href = "/hrm?section=document-list";
    } else if (section === "notifications") {
      window.location.href = "/hrm?section=notifications";
    } else if (section === "calendar") {
      window.location.href = "/hrm?section=calendar";
    } else if (section === "settings") {
      window.location.href = "/hrm?section=settings";
    } else {
      // For other sections, navigate to HRM dashboard
      window.location.href = "/hrm";
    }
  };

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [setupType, setSetupType] = useState("password"); // "password" or "location"

  // Password setup form
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // Location setup form
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "100",
  });

  const [workLocations, setWorkLocations] = useState([]);
  const [selectedWorkLocations, setSelectedWorkLocations] = useState([]);
  const [employeeWorkLocations, setEmployeeWorkLocations] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchWorkLocations();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeWorkLocations();
    } else {
      setEmployeeWorkLocations([]);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      console.log("Fetching employees...");
      const response = await fetch("/api/employee");
      const result = await response.json();

      console.log("Employee API response:", result);

      if (result.success) {
        setEmployees(result.employees || []);
        console.log("Employees loaded:", result.employees?.length || 0);
      } else {
        console.error("API returned error:", result.error);
        showMessage(result.error || "Failed to load employees", "error");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      showMessage("Failed to load employees", "error");
    }
  };

  const fetchWorkLocations = async () => {
    try {
      const response = await fetch("/api/work-locations");
      const result = await response.json();

      if (result.success) {
        setWorkLocations(result.locations || []);
      }
    } catch (error) {
      console.error("Error fetching work locations:", error);
    }
  };

  const fetchEmployeeWorkLocations = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(
        `/api/employee/${selectedEmployee}/work-location`
      );
      const result = await response.json();

      if (result.success && result.workLocations) {
        setEmployeeWorkLocations(result.workLocations);
      } else {
        setEmployeeWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching employee work locations:", error);
      setEmployeeWorkLocations([]);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      showMessage("Please select an employee", "error");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      showMessage("Passwords do not match", "error");
      return;
    }

    if (passwordForm.password.length < 6) {
      showMessage("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/employee/setup-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          password: passwordForm.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to set password", "error");
        return;
      }

      showMessage("Password set successfully!", "success");
      setPasswordForm({ password: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error setting password:", error);
      showMessage("Failed to set password", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelection = (locationId) => {
    setSelectedWorkLocations((prev) => {
      if (prev.includes(locationId)) {
        return prev.filter((id) => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  const handleAssignLocations = async () => {
    if (!selectedEmployee) {
      showMessage("Please select an employee", "error");
      return;
    }

    if (selectedWorkLocations.length === 0) {
      showMessage("Please select at least one work location", "error");
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
          body: JSON.stringify({ employeeIds: [selectedEmployee] }),
        })
      );

      const responses = await Promise.all(assignmentPromises);
      const results = await Promise.all(responses.map((res) => res.json()));

      // Check if all assignments were successful
      const failedAssignments = results.filter((result) => !result.success);

      if (failedAssignments.length > 0) {
        showMessage(
          `Failed to assign ${failedAssignments.length} location(s)`,
          "error"
        );
        return;
      }

      showMessage(
        `${selectedWorkLocations.length} work location(s) assigned successfully!`,
        "success"
      );
      setSelectedWorkLocations([]);

      // Refresh employee work locations
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error assigning locations:", error);
      showMessage("Failed to assign work locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLocation = async (locationId) => {
    if (!selectedEmployee) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${locationId}/assign-employees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [selectedEmployee] }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to remove work location", "error");
        return;
      }

      showMessage("Work location removed successfully!", "success");

      // Refresh employee work locations
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error removing location:", error);
      showMessage("Failed to remove work location", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeData = employees.find(
    (emp) => emp._id === selectedEmployee
  );

  return (
    <Layout activeSection={activeSection} onSectionChange={handleSectionChange}>
      <div className="space-y-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Employee Setup Portal
            </h1>
            <p className="text-gray-600">
              Set up passwords and work locations for employees to access the
              attendance system
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-lg flex items-center space-x-2 mb-6 ${
                messageType === "success"
                  ? "bg-green-100 text-green-700"
                  : messageType === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : messageType === "error" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Select Employee</h2>
              <button
                onClick={fetchEmployees}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No employees found in the database.</p>
                <p className="text-sm mt-2">
                  <a href="/hrm" className="text-blue-600 hover:underline">
                    Go to HR Management
                  </a>{" "}
                  to add employees first.
                </p>
              </div>
            ) : (
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.personalDetails?.name || emp.name || "Unknown"} -{" "}
                    {emp.personalDetails?.employeeId ||
                      emp.employeeId ||
                      "No ID"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedEmployeeData && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Password Setup */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Set Password</h2>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Enter password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="Confirm password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Setting Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Set Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Location Setup */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">
                    Assign Work Locations
                  </h2>
                </div>

                {workLocations.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No work locations available.</p>
                    <p className="text-sm mt-2">
                      <a
                        href="/work-locations"
                        className="text-blue-600 hover:underline"
                      >
                        Create work locations first
                      </a>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Current Work Locations */}
                    {employeeWorkLocations.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-3">
                          Current Work Locations ({employeeWorkLocations.length}
                          )
                        </h4>
                        <div className="space-y-2">
                          {employeeWorkLocations.map((location) => (
                            <div
                              key={location._id}
                              className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-200"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-green-800">
                                  {location.name}
                                </p>
                                {location.address && (
                                  <p className="text-sm text-green-600">
                                    {location.address}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  handleRemoveLocation(location._id)
                                }
                                disabled={loading}
                                className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Remove location"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Work Locations */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Work Locations to Assign
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                        {workLocations
                          .filter(
                            (location) =>
                              !employeeWorkLocations.some(
                                (empLoc) => empLoc._id === location._id
                              )
                          )
                          .map((location) => (
                            <label
                              key={location._id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedWorkLocations.includes(
                                  location._id
                                )}
                                onChange={() =>
                                  handleLocationSelection(location._id)
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {location.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {location.address ||
                                    `${
                                      typeof location.latitude === "number"
                                        ? location.latitude.toFixed(6)
                                        : String(location.latitude || "N/A")
                                    }, ${
                                      typeof location.longitude === "number"
                                        ? location.longitude.toFixed(6)
                                        : String(location.longitude || "N/A")
                                    }`}
                                </p>
                              </div>
                            </label>
                          ))}
                        {workLocations.filter(
                          (location) =>
                            !employeeWorkLocations.some(
                              (empLoc) => empLoc._id === location._id
                            )
                        ).length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            All available locations are already assigned to this
                            employee.
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleAssignLocations}
                      disabled={loading || selectedWorkLocations.length === 0}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Assigning Locations...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>
                            Assign {selectedWorkLocations.length} Location
                            {selectedWorkLocations.length !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Setup Instructions
            </h3>
            <div className="space-y-2 text-blue-800">
              <p>
                <strong>1. Select an employee</strong> from the dropdown above
              </p>
              <p>
                <strong>2. Set a password</strong> for the employee to log in
              </p>
              <p>
                <strong>3. Assign work locations</strong> - employees can be
                assigned to multiple locations
              </p>
              <p>
                <strong>4. Employee can then log in</strong> at{" "}
                <code className="bg-blue-100 px-2 py-1 rounded">
                  /employee-login
                </code>
              </p>
              <p>
                <strong>5. Test the system</strong> by having the employee log
                in and try to check in/out from any assigned location
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
