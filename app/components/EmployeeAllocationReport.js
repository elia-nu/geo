"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Users,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Building2,
  MapPin,
  Briefcase,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

export default function EmployeeAllocationReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showFilters, setShowFilters] = useState(true);

  // Filter state
  const [filters, setFilters] = useState({
    projectId: "",
    locationId: "",
    department: "",
    supervisorId: "",
  });

  // Options for filters
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [deptRes, projRes, locRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/projects"),
        fetch("/api/work-locations"),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        const deptList = Array.isArray(deptData?.departments)
          ? deptData.departments
          : Array.isArray(deptData)
          ? deptData
          : [];
        setDepartments(deptList.map((d) => d.name || d));
      }

      if (projRes.ok) {
        const projData = await projRes.json();
        const projList = Array.isArray(projData?.projects)
          ? projData.projects
          : Array.isArray(projData)
          ? projData
          : [];
        setProjects(projList);
      }

      if (locRes.ok) {
        const locData = await locRes.json();
        const locList = Array.isArray(locData?.locations)
          ? locData.locations
          : Array.isArray(locData)
          ? locData
          : [];
        setLocations(locList);
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const token = localStorage.getItem("authToken");
      
      const response = await fetch(
        `/api/reports/employees/allocation?${params.toString()}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setReportData(result);
        showMessage("Report generated successfully", "success");
      } else {
        showMessage(result.error || "Failed to generate report", "error");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      showMessage("Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData || !reportData.employees) {
      showMessage("Please generate a report first", "error");
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem("authToken");
      
      const response = await fetch("/api/reports/employees/allocation/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          format,
          employees: reportData.employees,
          allocationStats: reportData.allocationStats,
          filters: reportData.filters,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const extension = format === "excel" ? "xlsx" : format;
        const fileName = `employee_allocation_report_${new Date()
          .toISOString()
          .split("T")[0]}.${extension}`;

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage(`Report exported to ${format.toUpperCase()} successfully`, "success");
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || "Failed to export report", "error");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      showMessage("Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      projectId: "",
      locationId: "",
      department: "",
      supervisorId: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-3 ring-1 ring-white/30">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Employee Allocation Report
              </h2>
              <p className="text-white/80">
                View employee assignments by project, location, department, and supervisor
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 text-white"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? "Hide" : "Show"} Filters</span>
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === "success"
              ? "bg-green-100 text-green-800"
              : messageType === "error"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={filters.projectId}
                onChange={(e) =>
                  setFilters({ ...filters, projectId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Location
              </label>
              <select
                value={filters.locationId}
                onChange={(e) =>
                  setFilters({ ...filters, locationId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                <option value="">All Departments</option>
                {departments.map((dept, idx) => (
                  <option key={idx} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Report Summary */}
      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Allocation Summary
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Utilization Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Employees</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.allocationStats?.totalEmployees || 0}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Overloaded</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {reportData.allocationStats?.utilization?.overloaded?.length || 0}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">Underutilized</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {reportData.allocationStats?.utilization?.underutilized?.length || 0}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Optimal</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {reportData.allocationStats?.utilization?.optimal?.length || 0}
              </p>
            </div>
          </div>

          {/* Utilization Gaps/Overload Section */}
          {(reportData.allocationStats?.utilization?.overloaded?.length > 0 ||
            reportData.allocationStats?.utilization?.underutilized?.length > 0) && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Utilization Analysis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Overloaded Employees */}
                {reportData.allocationStats?.utilization?.overloaded?.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h5 className="font-semibold text-red-900 mb-2">
                      Overloaded Employees ({reportData.allocationStats.utilization.overloaded.length})
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {reportData.allocationStats.utilization.overloaded.map((emp) => (
                        <div key={emp.id} className="text-sm">
                          <span className="font-medium">{emp.name}</span> -{" "}
                          <span className="text-red-700">{emp.projectCount} projects</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Underutilized Employees */}
                {reportData.allocationStats?.utilization?.underutilized?.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h5 className="font-semibold text-yellow-900 mb-2">
                      Underutilized Employees ({reportData.allocationStats.utilization.underutilized.length})
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {reportData.allocationStats.utilization.underutilized.map((emp) => (
                        <div key={emp.id} className="text-sm">
                          <span className="font-medium">{emp.name}</span> -{" "}
                          <span className="text-yellow-700">No projects assigned</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supervisor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.employees?.map((employee) => (
                  <tr key={employee._id || employee.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.employeeName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.workLocation || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.supervisor || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (employee.projectCount || 0) > 3
                            ? "bg-red-100 text-red-800"
                            : (employee.projectCount || 0) === 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {employee.projectCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {employee.assignedProjects && employee.assignedProjects.length > 0
                          ? employee.assignedProjects.map((p) => p.name).join(", ")
                          : "None"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!reportData.employees || reportData.employees.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No employees found matching the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
