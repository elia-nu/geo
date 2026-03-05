"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  History,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserPlus,
  UserX,
  ArrowRightLeft,
  UserCog,
  Calendar,
  User,
} from "lucide-react";

export default function EmployeeLifecycleReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
    actionType: "all",
  });

  // Options for filters
  const [actionTypes] = useState([
    { value: "all", label: "All Activities" },
    { value: "create", label: "Employee Creation" },
    { value: "update", label: "Updates" },
    { value: "transfer", label: "Transfers" },
    { value: "role_change", label: "Role Changes" },
    { value: "terminate", label: "Terminations" },
    { value: "delete", label: "Deletions" },
  ]);

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
        if (value && value !== "all") {
          params.append(key, value);
        }
      });

      const token = localStorage.getItem("authToken");
      
      const response = await fetch(
        `/api/reports/employees/lifecycle?${params.toString()}`,
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
    if (!reportData || !reportData.activities) {
      showMessage("Please generate a report first", "error");
      return;
    }

    setExporting(true);
    try {
      const token = localStorage.getItem("authToken");
      
      const response = await fetch("/api/reports/employees/lifecycle/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          format,
          activities: reportData.activities,
          stats: reportData.stats,
          filters: reportData.filters,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const extension = format === "excel" ? "xlsx" : format;
        const fileName = `employee_lifecycle_report_${new Date()
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

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityDetail(true);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "CREATE":
        return <UserPlus className="w-4 h-4" />;
      case "DELETE":
      case "TERMINATE":
        return <UserX className="w-4 h-4" />;
      case "TRANSFER":
        return <ArrowRightLeft className="w-4 h-4" />;
      case "ROLE_CHANGE":
        return <UserCog className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "DELETE":
      case "TERMINATE":
        return "bg-red-100 text-red-800";
      case "TRANSFER":
        return "bg-blue-100 text-blue-800";
      case "ROLE_CHANGE":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const clearFilters = () => {
    setFilters({
      employeeId: "",
      startDate: "",
      endDate: "",
      actionType: "all",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-3 ring-1 ring-white/30">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Employee Lifecycle Activity Report
              </h2>
              <p className="text-white/80">
                Track employee creation, transfers, role changes, and terminations
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Activity Type
              </label>
              <select
                value={filters.actionType}
                onChange={(e) =>
                  setFilters({ ...filters, actionType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
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
                End Date
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
              Activity Summary
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <History className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Activities</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.stats?.totalActivities || 0}
              </p>
            </div>

            {reportData.stats?.byType &&
              Object.entries(reportData.stats.byType).slice(0, 3).map(([type, count]) => (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {getActivityIcon(type)}
                    <span className="font-medium text-black">{type}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-600">{count}</p>
                </div>
              ))}
          </div>

          {/* Activity Timeline */}
          {reportData.stats?.timeline && reportData.stats.timeline.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-black mb-3">
                Activity Timeline
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportData.stats.timeline.slice(0, 10).map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{day.date}</span>
                    </div>
                    <span className="text-sm text-gray-600">{day.count} activities</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.activities?.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {formatDate(activity.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActivityColor(
                          activity.activityType
                        )}`}
                      >
                        <span className="flex items-center space-x-1">
                          {getActivityIcon(activity.activityType)}
                          <span>{activity.activityType}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-black">
                        {activity.activityDescription}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {activity.employee.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.employee.department}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {activity.admin.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewActivity(activity)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!reportData.activities || reportData.activities.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No activities found matching the selected filters.
            </div>
          )}
        </div>
      )}

      {/* Activity Detail Modal */}
      {showActivityDetail && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-semibold">Activity Details</h3>
              <button
                onClick={() => {
                  setShowActivityDetail(false);
                  setSelectedActivity(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-black mb-2">Activity Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>{" "}
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActivityColor(
                          selectedActivity.activityType
                        )}`}
                      >
                        {selectedActivity.activityType}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Description:</span>{" "}
                      {selectedActivity.activityDescription}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Timestamp:</span>{" "}
                      {formatDate(selectedActivity.timestamp)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-2">Employee</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>{" "}
                      {selectedActivity.employee.name}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">ID:</span>{" "}
                      {selectedActivity.employee.id}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Department:</span>{" "}
                      {selectedActivity.employee.department}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-2">Admin Actor</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">User ID:</span>{" "}
                      {selectedActivity.admin.userId}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>{" "}
                      {selectedActivity.admin.email}
                    </div>
                  </div>
                </div>

                {selectedActivity.changes && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Changes</h4>
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedActivity.changes, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedActivity.metadata && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Metadata</h4>
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
