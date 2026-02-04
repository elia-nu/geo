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
  DollarSign,
} from "lucide-react";

export default function EmployeeSetupModal({
  employee,
  onClose,
  onSuccess,
  onError,
  defaultTab = "password",
}) {
  const [setupType, setSetupType] = useState(defaultTab); // "password" | "location" | "salary"
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");

  // Password setup form
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // Location setup form
  const [workLocations, setWorkLocations] = useState([]);
  const [selectedWorkLocations, setSelectedWorkLocations] = useState([]);
  const [employeeWorkLocations, setEmployeeWorkLocations] = useState([]);

  // Salary setup form
  const [salaryForm, setSalaryForm] = useState({
    grossSalary: "",
    transportAllowance: "",
    telephoneAllowance: "",
    posAllowance: "",
  });

  // Populate salary fields from existing employee data
  useEffect(() => {
    try {
      const existingGross =
        employee?.grossSalary ?? employee?.salary?.grossSalary ?? "";
      const existingTransport =
        employee?.transportAllowance ??
        employee?.salary?.transportAllowance ??
        "";
      const existingTelephone =
        employee?.telephoneAllowance ??
        employee?.salary?.telephoneAllowance ??
        "";
      const existingPos =
        employee?.posAllowance ?? employee?.salary?.posAllowance ?? "";
      setSalaryForm({
        grossSalary:
          existingGross === null || existingGross === undefined
            ? ""
            : String(existingGross),
        transportAllowance:
          existingTransport === null || existingTransport === undefined
            ? ""
            : String(existingTransport),
        telephoneAllowance:
          existingTelephone === null || existingTelephone === undefined
            ? ""
            : String(existingTelephone),
        posAllowance:
          existingPos === null || existingPos === undefined
            ? ""
            : String(existingPos),
      });
    } catch {}
  }, [employee]);

  useEffect(() => {
    if (setupType === "location" || setupType === "salary") {
      fetchWorkLocations();
      if (employee?._id) {
        fetchEmployeeWorkLocations();
      }
    }
  }, [setupType, employee?._id]);

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
        const locations = data.workLocations || [];
        setEmployeeWorkLocations(locations);
        // Only update selectedWorkLocations if they're empty
        // This preserves user selections when switching tabs
        setSelectedWorkLocations((prev) => {
          if (prev.length === 0) {
            // If no selections, use existing employee locations
            return locations
              .map((loc) => {
                const id = loc._id || loc.id;
                return id ? String(id) : null;
              })
              .filter(Boolean);
          }
          // Keep existing selections
          return prev;
        });
      } else {
        setEmployeeWorkLocations([]);
        // Don't clear selectedWorkLocations - preserve user selections
      }
    } catch (error) {
      console.error("Error fetching employee work locations:", error);
      setEmployeeWorkLocations([]);
      // Don't clear selectedWorkLocations on error - preserve user selections
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

  const handleSalarySubmit = async () => {
    const gross = Number(salaryForm.grossSalary);
    const transport = Number(salaryForm.transportAllowance);
    const telephone = Number(
      salaryForm.telephoneAllowance === ""
        ? 0
        : salaryForm.telephoneAllowance
    );
    const pos = Number(
      salaryForm.posAllowance === "" ? 0 : salaryForm.posAllowance
    );

    if (Number.isNaN(gross) || gross <= 0) {
      onError("Please enter a valid gross salary");
      return;
    }

    if (Number.isNaN(transport) || transport < 0) {
      onError("Please enter a valid transport allowance");
      return;
    }

    if (Number.isNaN(telephone) || telephone < 0) {
      onError("Please enter a valid telephone allowance");
      return;
    }

    if (Number.isNaN(pos) || pos < 0) {
      onError("Please enter a valid POS allowance");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/employee/${employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossSalary: gross,
          transportAllowance: transport,
          telephoneAllowance: telephone,
          posAllowance: pos,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        onError(data.error || "Failed to save salary settings");
        return;
      }
      onSuccess("Salary settings saved successfully!");
    } catch (error) {
      console.error("Error saving salary settings:", error);
      onError("Failed to save salary settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    console.log("Save All clicked", { loading, setupType });

    if (loading) {
      console.log("Already loading, ignoring click");
      return;
    }

    const errors = [];
    const shouldSavePassword =
      passwordForm.password && passwordForm.confirmPassword;

    // Validate password (only if provided)
    if (shouldSavePassword) {
      if (passwordForm.password !== passwordForm.confirmPassword) {
        errors.push("Passwords do not match");
      } else if (passwordForm.password.length < 6) {
        errors.push("Password must be at least 6 characters long");
      }
    }

    // Validate location - check if employee has locations or if new ones are selected
    // Make this optional - if no locations, we'll skip location saving
    const hasExistingLocations = employeeWorkLocations.length > 0;
    const hasSelectedLocations = selectedWorkLocations.length > 0;
    const shouldSaveLocations = hasExistingLocations || hasSelectedLocations;

    // Validate salary
    const gross = Number(salaryForm.grossSalary);
    const transport = Number(salaryForm.transportAllowance);
    const telephone = Number(
      salaryForm.telephoneAllowance === ""
        ? 0
        : salaryForm.telephoneAllowance
    );
    const pos = Number(
      salaryForm.posAllowance === "" ? 0 : salaryForm.posAllowance
    );
    if (Number.isNaN(gross) || gross <= 0) {
      errors.push("Please enter a valid gross salary");
    }
    if (Number.isNaN(transport) || transport < 0) {
      errors.push("Please enter a valid transport allowance");
    }
    if (Number.isNaN(telephone) || telephone < 0) {
      errors.push("Please enter a valid telephone allowance");
    }
    if (Number.isNaN(pos) || pos < 0) {
      errors.push("Please enter a valid POS allowance");
    }

    if (errors.length > 0) {
      onError(errors.join(". "));
      return;
    }

    setLoading(true);
    setSavingStatus("Starting...");
    const results = {
      password: false,
      location: false,
      salary: false,
    };
    const errorMessages = [];
    const savedItems = [];

    try {
      // Save password (only if provided)
      if (shouldSavePassword) {
        setSavingStatus("Saving password...");
        try {
          const passwordResponse = await fetch("/api/employee/setup-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employee._id,
              password: passwordForm.password,
            }),
          });
          const passwordData = await passwordResponse.json();
          if (passwordData.success) {
            results.password = true;
            savedItems.push("Password");
            setPasswordForm({ password: "", confirmPassword: "" });
          } else {
            errorMessages.push(
              "Password: " + (passwordData.error || "Failed to setup password")
            );
          }
        } catch (error) {
          console.error("Password save error:", error);
          errorMessages.push("Password: Failed to setup password");
        }
      }

      // Save locations (only if we have locations to save)
      if (shouldSaveLocations) {
        setSavingStatus("Saving work locations...");
        try {
          // Determine which locations to assign
          // Use selected locations if available, otherwise use existing employee locations
          const locationsToAssign =
            selectedWorkLocations.length > 0
              ? selectedWorkLocations
              : employeeWorkLocations
                  .map((loc) => loc._id || loc.id)
                  .filter(Boolean);

          console.log("Locations to assign:", locationsToAssign);
          console.log("Selected locations:", selectedWorkLocations);
          console.log("Employee locations:", employeeWorkLocations);

          if (locationsToAssign.length > 0) {
            // Assign employee to each location
            const assignmentPromises = locationsToAssign.map((locationId) => {
              // Ensure locationId is a string
              const locationIdStr =
                typeof locationId === "string"
                  ? locationId
                  : String(locationId);
              return fetch(
                `/api/work-locations/${locationIdStr}/assign-employees`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ employeeIds: [employee._id] }),
                }
              );
            });

            const locationResponses = await Promise.all(assignmentPromises);
            const locationResults = await Promise.all(
              locationResponses.map(async (res) => {
                if (!res.ok) {
                  const errorText = await res.text();
                  console.error("Location assignment error:", errorText);
                  return { success: false, error: errorText };
                }
                return res.json();
              })
            );

            const failedAssignments = locationResults.filter(
              (result) => !result.success
            );

            if (failedAssignments.length === 0) {
              results.location = true;
              savedItems.push(
                `Locations (${locationsToAssign.length} assigned)`
              );
              // Refresh employee locations to get updated list
              await fetchEmployeeWorkLocations();
            } else {
              const successCount =
                locationsToAssign.length - failedAssignments.length;
              if (successCount > 0) {
                results.location = true;
                savedItems.push(
                  `Locations (${successCount}/${locationsToAssign.length} assigned)`
                );
                errorMessages.push(
                  `Location: Failed to assign ${failedAssignments.length} location(s)`
                );
                await fetchEmployeeWorkLocations();
              } else {
                errorMessages.push(
                  `Location: Failed to assign all ${locationsToAssign.length} location(s)`
                );
              }
            }
          } else {
            // No locations to assign
            if (employeeWorkLocations.length > 0) {
              // Employee already has locations, consider it successful
              results.location = true;
              savedItems.push("Locations (kept existing)");
            } else {
              errorMessages.push("Location: No locations selected or assigned");
            }
          }
        } catch (error) {
          console.error("Location save error:", error);
          errorMessages.push(
            "Location: Failed to assign work locations - " + error.message
          );
        }
      } else {
        // Skip location saving if no locations
        savedItems.push("Locations (skipped - none selected)");
      }

      // Save salary
      setSavingStatus("Saving salary...");
      try {
        const salaryResponse = await fetch(`/api/employee/${employee._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grossSalary: gross,
            transportAllowance: transport,
            telephoneAllowance: telephone,
            posAllowance: pos,
          }),
        });
        const salaryData = await salaryResponse.json();
        if (salaryResponse.ok && salaryData.success) {
          results.salary = true;
          savedItems.push("Salary");
        } else {
          errorMessages.push(
            "Salary: " + (salaryData.error || "Failed to save salary settings")
          );
        }
      } catch (error) {
        console.error("Salary save error:", error);
        errorMessages.push("Salary: Failed to save salary settings");
      }

      // Show success or partial success message
      const successCount = Object.values(results).filter(Boolean).length;
      const totalExpected =
        (shouldSavePassword ? 1 : 0) + (shouldSaveLocations ? 1 : 0) + 1; // password + location + salary

      setSavingStatus("");
      if (successCount === totalExpected) {
        onSuccess(
          `All settings saved successfully! (${savedItems.join(", ")})`
        );
      } else if (successCount > 0) {
        onError(
          `Partially saved: ${savedItems.join(
            ", "
          )}. Errors: ${errorMessages.join(". ")}`
        );
      } else {
        onError(`Failed to save: ${errorMessages.join(". ")}`);
      }
    } catch (error) {
      console.error("Error saving all settings:", error);
      setSavingStatus("");
      onError("Failed to save all settings. Please try again.");
    } finally {
      setLoading(false);
      setSavingStatus("");
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
                <Lock className="w-7 h-7 text-purple-900" strokeWidth={2.2} />
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
              <X className="w-6 h-6 text-purple-900" strokeWidth={2.2} />
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
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Lock className="w-5 h-5" strokeWidth={2.2} />
                <span>Password Setup</span>
              </div>
            </button>
            <button
              onClick={() => setSetupType("location")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                setupType === "location"
                  ? "border-b-2 border-purple-600 text-purple-600 bg-white"
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5" strokeWidth={2.2} />
                <span>Work Locations</span>
              </div>
            </button>
            <button
              onClick={() => setSetupType("salary")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                setupType === "salary"
                  ? "border-b-2 border-purple-600 text-purple-600 bg-white"
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <DollarSign className="w-5 h-5" strokeWidth={2.2} />
                <span>Salary</span>
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
                <label className="block text-sm font-medium text-black mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                />
              </div>
            </div>
          ) : setupType === "location" ? (
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
                  <h4 className="text-sm font-semibold text-black mb-3">
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
                          <CheckCircle
                            className="w-5 h-5 text-green-600"
                            strokeWidth={2.2}
                          />
                          <div>
                            <p className="font-medium text-black">
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
                          <Trash2 className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Locations */}
              <div>
                <h4 className="text-sm font-semibold text-black mb-3">
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
                          <p className="font-medium text-black">
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
          ) : (
            <div className="space-y-6">
              {loading && savingStatus && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <p className="text-sm text-blue-800 font-medium">
                      {savingStatus}
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      Store salary inputs for later calculations.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Gross Salary (ETB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryForm.grossSalary}
                  onChange={(e) =>
                    setSalaryForm({
                      ...salaryForm,
                      grossSalary: e.target.value,
                    })
                  }
                  placeholder="e.g. 15000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Transport Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.transportAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        transportAllowance: e.target.value,
                      })
                    }
                    placeholder="e.g. 1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Telephone Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.telephoneAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        telephoneAllowance: e.target.value,
                      })
                    }
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    POS Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.posAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        posAllowance: e.target.value,
                      })
                    }
                    placeholder="e.g. 300"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                  />
                </div>
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
          {setupType === "salary" ? (
            <>
              <button
                onClick={handleSalarySubmit}
                disabled={loading}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Save Salary</span>
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!loading) {
                    handleSaveAll();
                  }
                }}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer relative z-10"
                type="button"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{savingStatus || "Saving All..."}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Save All</span>
                  </>
                )}
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
