"use client";

import { useState, useEffect } from "react";
import {
  Users,
  MapPin,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Settings,
} from "lucide-react";
import EmployeeSetupModal from "./EmployeeSetupModal";

export default function EmployeeLocationManagement() {
  const [employees, setEmployees] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);
  const [employeeLocations, setEmployeeLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [filterByLocation, setFilterByLocation] = useState("all"); // "all", "assigned", "unassigned"

  // Bulk operations
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkLocation, setBulkLocation] = useState("");
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEmployees(), fetchWorkLocations()]);
    } catch (error) {
      console.error("Error fetching data:", error);
      showMessage("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee");
      const result = await response.json();

      if (result.success) {
        setEmployees(result.employees || []);
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

  const fetchEmployeeLocations = async () => {
    const locationData = {};

    for (const employee of employees) {
      try {
        const response = await fetch(
          `/api/employee/${employee._id}/work-location`
        );
        const result = await response.json();

        if (result.success && result.workLocations) {
          locationData[employee._id] = result.workLocations;
        } else {
          locationData[employee._id] = [];
        }
      } catch (error) {
        console.error(
          `Error fetching locations for employee ${employee._id}:`,
          error
        );
        locationData[employee._id] = [];
      }
    }

    setEmployeeLocations(locationData);
  };

  useEffect(() => {
    if (employees.length > 0) {
      fetchEmployeeLocations();
    }
  }, [employees]);

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Filter employees based on search and filter criteria
  const filteredEmployees = employees.filter((employee) => {
    const name = employee.personalDetails?.name || employee.name || "";
    const employeeId =
      employee.personalDetails?.employeeId || employee.employeeId || "";
    const department =
      employee.personalDetails?.department || employee.department || "";

    // Search filter
    const matchesSearch =
      searchTerm === "" ||
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    // Department filter
    const matchesDepartment =
      selectedDepartment === "" || department === selectedDepartment;

    // Location filter
    const employeeLocationCount = employeeLocations[employee._id]?.length || 0;
    let matchesLocation = true;
    if (filterByLocation === "assigned") {
      matchesLocation = employeeLocationCount > 0;
    } else if (filterByLocation === "unassigned") {
      matchesLocation = employeeLocationCount === 0;
    }

    return matchesSearch && matchesDepartment && matchesLocation;
  });

  // Get unique departments
  const getUniqueDepartments = () => {
    const departments = employees
      .map((emp) => emp.personalDetails?.department || emp.department)
      .filter(Boolean);
    return [...new Set(departments)];
  };

  const handleLocationSelection = (employeeId, locationId) => {
    setSelectedEmployees((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0) {
      showMessage("Please select employees to assign", "error");
      return;
    }

    if (!bulkLocation) {
      showMessage("Please select a work location", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${bulkLocation}/assign-employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: selectedEmployees }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to assign locations", "error");
        return;
      }

      showMessage(
        `${selectedEmployees.length} employee(s) assigned to location successfully!`,
        "success"
      );
      setSelectedEmployees([]);
      setBulkLocation("");
      setShowBulkAssign(false);

      // Refresh data
      await fetchEmployeeLocations();
    } catch (error) {
      console.error("Error assigning locations:", error);
      showMessage("Failed to assign locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLocation = async (employeeId, locationId) => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${locationId}/assign-employees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [employeeId] }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to remove location", "error");
        return;
      }

      showMessage("Location removed successfully!", "success");

      // Refresh data
      await fetchEmployeeLocations();
    } catch (error) {
      console.error("Error removing location:", error);
      showMessage("Failed to remove location", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map((emp) => emp._id));
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("");
    setSelectedLocation("");
    setFilterByLocation("all");
    setSelectedEmployees([]);
  };

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Employee Location Management
              </h1>
              <p className="text-gray-600">
                Manage work location assignments for all employees
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowBulkAssign(!showBulkAssign)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Bulk Assign</span>
              </button>
            </div>
          </div>
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

        {/* Bulk Assignment Section */}
        {showBulkAssign && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-green-600" />
              <span>Bulk Location Assignment</span>
            </h3>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Employees ({selectedEmployees.length})
                </label>
                <div className="text-sm text-gray-600">
                  {selectedEmployees.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto">
                      {selectedEmployees.map((empId) => {
                        const emp = employees.find((e) => e._id === empId);
                        return (
                          <div
                            key={empId}
                            className="flex items-center justify-between py-1"
                          >
                            <span>
                              {emp?.personalDetails?.name ||
                                emp?.name ||
                                "Unknown"}
                            </span>
                            <button
                              onClick={() => handleLocationSelection(empId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    "No employees selected"
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Location
                </label>
                <select
                  value={bulkLocation}
                  onChange={(e) => setBulkLocation(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Select a work location...</option>
                  {workLocations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name} -{" "}
                      {location.address ||
                        `${location.latitude?.toFixed(
                          6
                        )}, ${location.longitude?.toFixed(6)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleBulkAssign}
                  disabled={
                    loading || selectedEmployees.length === 0 || !bulkLocation
                  }
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Assign Location</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Employees
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">All Departments</option>
                {getUniqueDepartments().map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Status
              </label>
              <select
                value={filterByLocation}
                onChange={(e) => setFilterByLocation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="all">All Employees</option>
                <option value="assigned">With Locations</option>
                <option value="unassigned">Without Locations</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Employees ({filteredEmployees.length})
              </h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedEmployees.length === filteredEmployees.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedEmployees.length} selected
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                No employees found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={
                          selectedEmployees.length ===
                            filteredEmployees.length &&
                          filteredEmployees.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Locations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => {
                    const employeeLocationList =
                      employeeLocations[employee._id] || [];
                    const isSelected = selectedEmployees.includes(employee._id);

                    return (
                      <tr
                        key={employee._id}
                        className={isSelected ? "bg-blue-50" : ""}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleLocationSelection(employee._id)
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.personalDetails?.name ||
                                employee.name ||
                                "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.personalDetails?.employeeId ||
                                employee.employeeId ||
                                "No ID"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {employee.personalDetails?.department ||
                              employee.department ||
                              "Not specified"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {employeeLocationList.length > 0 ? (
                              employeeLocationList.map((location) => (
                                <div
                                  key={location._id}
                                  className="flex items-center justify-between bg-green-50 rounded-lg p-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      {location.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleRemoveLocation(
                                        employee._id,
                                        location._id
                                      )
                                    }
                                    disabled={loading}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Remove location"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-500">
                                <UserX className="w-4 h-4" />
                                <span className="text-sm">
                                  No locations assigned
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsSetupModalOpen(true);
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all hover:scale-110 transform"
                            title="Setup Employee (Password & Locations)"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Employee Setup Modal - Default to Location Tab */}
      {isSetupModalOpen && selectedEmployee && (
        <EmployeeSetupModal
          employee={selectedEmployee}
          defaultTab="location"
          onClose={() => {
            setIsSetupModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={(msg) => {
            setMessage(msg);
            setMessageType("success");
            setIsSetupModalOpen(false);
            setSelectedEmployee(null);
            // Refresh data to reflect changes
            fetchData();
          }}
          onError={(msg) => {
            setMessage(msg);
            setMessageType("error");
          }}
        />
      )}
    </div>
  );
}
