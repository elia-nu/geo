"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Users,
  Filter,
  Search,
  Eye,
  X,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  UserCheck,
} from "lucide-react";

export default function EmployeeMasterReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    department: "",
    projectId: "",
    location: "",
    employeeId: "",
    status: "all",
    startDate: "",
    endDate: "",
  });

  // Options for filters
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statuses] = useState([
    { value: "all", label: "All Status" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "On Leave", label: "On Leave" },
    { value: "Terminated", label: "Terminated" },
  ]);

  // Fetch filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      // Fetch departments
      const deptResponse = await fetch("/api/departments");
      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        const deptList = Array.isArray(deptData?.departments)
          ? deptData.departments
          : Array.isArray(deptData)
          ? deptData
          : [];
        setDepartments(deptList.map((d) => d.name || d));
      }

      // Fetch projects
      const projResponse = await fetch("/api/projects");
      if (projResponse.ok) {
        const projData = await projResponse.json();
        const projList = Array.isArray(projData?.projects)
          ? projData.projects
          : Array.isArray(projData)
          ? projData
          : [];
        setProjects(projList);
      }

      // Fetch work locations
      const locResponse = await fetch("/api/work-locations");
      if (locResponse.ok) {
        const locData = await locResponse.json();
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
      // Get auth token from localStorage
      const token = localStorage.getItem("authToken");
      
      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `/api/reports/employees/master?${params.toString()}`,
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
      
      // Serialize employee data to ensure all ObjectIds and Dates are properly converted
      const serializedEmployees = reportData.employees.map((emp) => {
        const serialized = { ...emp };
        
        // Convert _id to string if it exists
        if (serialized._id && typeof serialized._id !== 'string') {
          serialized._id = serialized._id.toString();
        }
        
        // Ensure employeeId is a string
        if (serialized.employeeId && typeof serialized.employeeId !== 'string') {
          serialized.employeeId = serialized.employeeId.toString();
        }
        
        // Convert dates to ISO strings for proper serialization
        if (serialized.joiningDate) {
          serialized.joiningDate = serialized.joiningDate instanceof Date 
            ? serialized.joiningDate.toISOString()
            : serialized.joiningDate;
        }
        
        if (serialized.contractExpiryDate) {
          serialized.contractExpiryDate = serialized.contractExpiryDate instanceof Date
            ? serialized.contractExpiryDate.toISOString()
            : serialized.contractExpiryDate;
        }
        
        // Ensure assignedProjects are serializable
        if (serialized.assignedProjects && Array.isArray(serialized.assignedProjects)) {
          serialized.assignedProjects = serialized.assignedProjects.map((p) => ({
            id: p.id ? (typeof p.id === 'string' ? p.id : p.id.toString()) : null,
            name: p.name || "Unknown",
            status: p.status || "Unknown",
          }));
        }
        
        return serialized;
      });
      
      const response = await fetch("/api/reports/employees/master/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          format,
          employees: serializedEmployees,
          summary: reportData.summary,
          filters: reportData.filters,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        
        // Check if the response is actually an error (JSON error response)
        if (blob.type === "application/json") {
          const errorData = await blob.json();
          showMessage(errorData.error || errorData.message || "Failed to export report", "error");
          return;
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const extension = format === "excel" ? "xlsx" : format;
        const fileName = `employee_master_report_${new Date()
          .toISOString()
          .split("T")[0]}.${extension}`;

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage(`Report exported to ${format.toUpperCase()} successfully`, "success");
      } else {
        // Try to parse error response
        let errorMessage = "Failed to export report";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details && process.env.NODE_ENV === "development") {
              console.error("Export error details:", errorData.details);
            }
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = `Export failed with status ${response.status}`;
        }
        showMessage(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      showMessage("Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetail(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      case "On Leave":
        return "bg-yellow-100 text-yellow-800";
      case "Terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const clearFilters = () => {
    setFilters({
      department: "",
      projectId: "",
      location: "",
      employeeId: "",
      status: "all",
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-3 ring-1 ring-white/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Employee Master Report
              </h2>
              <p className="text-white/80">
                Complete employee registry with status, assignments, and details
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
            <h3 className="text-lg font-semibold text-black">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-black"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <option key={idx} value={typeof dept === 'string' ? dept : (dept.name || dept._id)}>
                    {typeof dept === 'string' ? dept : (dept.name || dept)}
                  </option>
                ))}
              </select>
            </div>

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
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
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
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={filters.employeeId}
                onChange={(e) =>
                  setFilters({ ...filters, employeeId: e.target.value })
                }
                placeholder="Filter by employee ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date (Historical)
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (Historical)
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              />
            </div>
          </div>
        </div>
      )}

      {/* Report Summary */}
      {reportData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">
              Report Summary
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
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.summary?.total || 0}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {reportData.summary?.byStatus?.Active || 0}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-black">Inactive</span>
              </div>
              <p className="text-2xl font-bold text-gray-600">
                {reportData.summary?.byStatus?.Inactive || 0}
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">On Leave</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {reportData.summary?.byStatus?.["On Leave"] || 0}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Terminated</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {reportData.summary?.byStatus?.Terminated || 0}
              </p>
            </div>
          </div>

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
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joining Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.employees?.map((employee) => (
                  <tr key={employee._id || employee.employeeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {employee.employeeName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {employee.department || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {employee.role || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {employee.workLocation || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {employee.contractType || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {formatDate(employee.joiningDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          employee.status
                        )}`}
                      >
                        {employee.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
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

      {/* Employee Detail Modal */}
      {showEmployeeDetail && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Employee Details - {selectedEmployee.employeeName}
              </h3>
              <button
                onClick={() => {
                  setShowEmployeeDetail(false);
                  setSelectedEmployee(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Personal Information</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>{" "}
                      {selectedEmployee.employeeName || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>{" "}
                      {selectedEmployee.email || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Contact:
                      </span>{" "}
                      {selectedEmployee.contactNumber || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>{" "}
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          selectedEmployee.status
                        )}`}
                      >
                        {selectedEmployee.status || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <span>Employment Details</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Department:
                      </span>{" "}
                      {selectedEmployee.department || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Role:</span>{" "}
                      {selectedEmployee.role || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Contract Type:
                      </span>{" "}
                      {selectedEmployee.contractType || "N/A"}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Joining Date:
                      </span>{" "}
                      {formatDate(selectedEmployee.joiningDate)}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Contract Expiry:
                      </span>{" "}
                      {formatDate(selectedEmployee.contractExpiryDate)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span>Location</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Work Location:
                      </span>{" "}
                      {selectedEmployee.workLocation || "N/A"}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-3 flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span>Project Assignments</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    {selectedEmployee.assignedProjects &&
                    selectedEmployee.assignedProjects.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {selectedEmployee.assignedProjects.map((project, idx) => (
                          <li key={idx}>
                            {project.name} ({project.status})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500">No projects assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
