"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  MapPin,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Settings,
  Building,
  Check,
  Compass,
} from "lucide-react";
import EmployeeSetupModal from "./EmployeeSetupModal";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

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
  const [filterByLocation, setFilterByLocation] = useState("all"); // "all", "assigned", "unassigned"
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        setEmployees(Array.isArray(result) ? result : []);
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
      } else {
        setWorkLocations(Array.isArray(result) ? result : []);
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
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Filter employees based on search and filter criteria
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const name = employee.personalDetails?.name || employee.name || "";
      const employeeId =
        employee.personalDetails?.employeeId || employee.employeeId || "";
      const department =
        employee.personalDetails?.department || employee.department || "";
      const employeeLocationCount =
        employeeLocations[employee._id]?.length || 0;

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        employeeId.toLowerCase().includes(term) ||
        department.toLowerCase().includes(term);

      const matchesDepartment =
        !selectedDepartment || department === selectedDepartment;

      let matchesLocation = true;
      if (filterByLocation === "assigned") {
        matchesLocation = employeeLocationCount > 0;
      } else if (filterByLocation === "unassigned") {
        matchesLocation = employeeLocationCount === 0;
      }

      return matchesSearch && matchesDepartment && matchesLocation;
    });
  }, [
    employees,
    employeeLocations,
    searchTerm,
    selectedDepartment,
    filterByLocation,
  ]);

  const getUniqueDepartments = () => {
    const departments = employees
      .map((emp) => emp.personalDetails?.department || emp.department)
      .filter(Boolean);
    return [...new Set(departments)];
  };

  const handleLocationSelection = (employeeId) => {
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
    setFilterByLocation("all");
    setSelectedEmployees([]);
    setCurrentPage(1);
  };

  // Stats calculation
  const stats = useMemo(() => {
    let assigned = 0;
    let unassigned = 0;

    employees.forEach((emp) => {
      const count = employeeLocations[emp._id]?.length || 0;
      if (count > 0) assigned++;
      else unassigned++;
    });

    return {
      total: employees.length,
      assigned,
      unassigned,
      totalLocations: workLocations.length,
    };
  }, [employees, employeeLocations, workLocations]);

  const totalPages =
    Math.ceil((filteredEmployees.length || 0) / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Employee Location Management
                </h1>
                <p className="text-teal-100/80 text-xs sm:text-sm mt-0.5">
                  Assign GPS geofence zones, multiple work premises, and branch placements.
                </p>
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{stats.total} Total Personnel</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-300 flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{stats.assigned} Assigned</span>
              </div>
              {stats.unassigned > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md text-xs font-semibold text-amber-200 flex items-center gap-1.5 border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{stats.unassigned} Unassigned</span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-teal-200 flex items-center gap-1.5 border border-white/10">
                <Compass className="w-3.5 h-3.5" />
                <span>{stats.totalLocations} Active Zones</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowBulkAssign(!showBulkAssign)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Bulk Assign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border shadow-sm ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-teal-50 border-teal-200 text-teal-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {messageType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
          <button
            onClick={() => setMessage("")}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Assignment Drawer */}
      {showBulkAssign && (
        <div className="bg-white rounded-2xl shadow-sm border border-teal-200 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Bulk Work Location Assignment
              </h3>
            </div>
            <button
              onClick={() => setShowBulkAssign(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Selected Personnel ({selectedEmployees.length})
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs min-h-[42px] max-h-32 overflow-y-auto">
                {selectedEmployees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployees.map((empId) => {
                      const emp = employees.find((e) => e._id === empId);
                      return (
                        <span
                          key={empId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-2xs"
                        >
                          {emp?.personalDetails?.name || emp?.name || "Employee"}
                          <button
                            onClick={() => handleLocationSelection(empId)}
                            className="text-rose-500 hover:text-rose-700 ml-0.5"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">
                    Select checkboxes in the table below
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Target Work Location / Geofence
              </label>
              <select
                value={bulkLocation}
                onChange={(e) => setBulkLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-all"
              >
                <option value="">Choose work location...</option>
                {workLocations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name} ({location.address || "Designated zone"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={handleBulkAssign}
                disabled={
                  loading || selectedEmployees.length === 0 || !bulkLocation
                }
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Apply Location to {selectedEmployees.length} Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Filter Employees & Assignments
            </h3>
            {(searchTerm || selectedDepartment || filterByLocation !== "all") && (
              <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-full">
                {filteredEmployees.length} of {employees.length} shown
              </span>
            )}
          </div>

          {(searchTerm || selectedDepartment || filterByLocation !== "all") && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all self-start sm:self-auto"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, Department..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-all"
            />
          </div>

          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="">All Departments</option>
              {getUniqueDepartments().map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterByLocation}
              onChange={(e) => {
                setFilterByLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="all">All Personnel ({employees.length})</option>
              <option value="assigned">Assigned with Locations ({stats.assigned})</option>
              <option value="unassigned">Unassigned / No Locations ({stats.unassigned})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Personnel Directory ({filteredEmployees.length})
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={handleSelectAll}
              className="text-teal-600 hover:text-teal-800 transition-colors"
            >
              {selectedEmployees.length === filteredEmployees.length &&
              filteredEmployees.length > 0
                ? "Deselect All"
                : "Select All Page"}
            </button>
            <span className="text-slate-400 font-normal">
              {selectedEmployees.length} selected
            </span>
          </div>
        </div>

        {loading && employees.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Loading personnel locations...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              No employees match your search
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your filter options or clearing search keywords.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedEmployees.length ===
                          filteredEmployees.length &&
                        filteredEmployees.length > 0
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Assigned Work Locations</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEmployees.map((employee) => {
                  const employeeLocationList =
                    employeeLocations[employee._id] || [];
                  const isSelected = selectedEmployees.includes(employee._id);
                  const name =
                    employee.personalDetails?.name || employee.name || "Employee";
                  const empId =
                    employee.personalDetails?.employeeId ||
                    employee.employeeId ||
                    "";

                  return (
                    <tr
                      key={employee._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-teal-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            handleLocationSelection(employee._id)
                          }
                          className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{name}</p>
                            {empId && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                {empId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {employee.personalDetails?.department ||
                            employee.department ||
                            "General"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {employeeLocationList.length > 0 ? (
                            employeeLocationList.map((location) => (
                              <span
                                key={location._id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-medium shadow-2xs"
                              >
                                <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                                <span>{location.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveLocation(
                                      employee._id,
                                      location._id
                                    )
                                  }
                                  disabled={loading}
                                  className="text-rose-500 hover:text-rose-700 p-0.5 rounded-full hover:bg-rose-50 transition-colors"
                                  title="Unassign this location"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs italic">
                              <UserX className="w-3.5 h-3.5" />
                              No locations assigned
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsSetupModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs transition-all"
                          title="Configure Geofences & Locations"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Configure Locations</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredEmployees.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of{" "}
                {filteredEmployees.length} employees
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* Employee Setup Modal (Opens Location tab by default) */}
      {isSetupModalOpen && selectedEmployee && (
        <EmployeeSetupModal
          employee={selectedEmployee}
          defaultTab="location"
          onClose={() => {
            setIsSetupModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={(msg) => {
            showMessage(msg, "success");
            setIsSetupModalOpen(false);
            setSelectedEmployee(null);
            fetchData();
          }}
          onError={(msg) => {
            showMessage(msg, "error");
          }}
        />
      )}
    </div>
  );
}
