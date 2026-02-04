"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Download,
  RefreshCw,
  Users,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  AlertCircle,
} from "lucide-react";

export default function DepartmentPerformanceReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0],
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      const response = await fetch(
        `/api/reports/departments/performance?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      setReportData(data);
      setMessage("Report generated successfully");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating report:", error);
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) {
      setMessage("Please generate a report first");
      setMessageType("error");
      return;
    }

    setExporting(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");

      const exportData = {
        format,
        departments: reportData.departments,
        summary: reportData.summary,
      };

      const response = await fetch(
        "/api/reports/departments/performance/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(exportData),
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to export report");
        } else {
          throw new Error("Failed to export report");
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `department_performance_report_${new Date()
        .toISOString()
        .split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`Report exported successfully as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting report:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const getPerformanceColor = (value, type) => {
    if (type === "attendance" || type === "utilization") {
      if (value >= 90) return "text-green-600 bg-green-50";
      if (value >= 75) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    }
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <span>Department Performance Summary</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Track attendance rate, leave frequency, payroll cost, and workforce utilization
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>{loading ? "Generating..." : "Generate Report"}</span>
              </button>
              {reportData && (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          {message && (
            <div
              className={`p-3 rounded-lg ${
                messageType === "success"
                  ? "bg-green-50 text-green-800"
                  : messageType === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {reportData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Departments</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.summary.totalDepartments || 0}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {reportData.summary.totalActiveEmployees || 0} active employees
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Avg Attendance Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {(reportData.summary.averageAttendanceRate || 0).toFixed(2)}%
              </p>
              <p className="text-sm text-green-700 mt-1">
                {reportData.summary.period?.workingDays || 0} working days
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Total Payroll Cost</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "ETB",
                  minimumFractionDigits: 0,
                }).format(reportData.summary.totalPayrollCost || 0)}
              </p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Avg Utilization</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {(reportData.summary.averageWorkforceUtilization || 0).toFixed(2)}%
              </p>
              <p className="text-sm text-orange-700 mt-1">
                {reportData.summary.totalLeaveRequests || 0} leave requests
              </p>
            </div>
          </div>
        )}

        {/* Department Performance Table */}
        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-black mb-4">
              Department Performance Details
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payroll Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Workforce Utilization
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.departments?.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">
                          {dept.departmentName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">
                          {dept.activeEmployees || 0} / {dept.totalEmployees || 0}
                        </div>
                        <div className="text-xs text-gray-500">active / total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(
                            dept.attendanceRate,
                            "attendance"
                          )}`}
                        >
                          {(dept.attendanceRate || 0).toFixed(2)}%
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {dept.totalAttendanceDays || 0} / {dept.expectedAttendanceDays || 0} days
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-black">
                          {dept.leaveFrequency || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dept.totalLeaveDays || 0} days
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-black">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "ETB",
                            minimumFractionDigits: 0,
                          }).format(dept.payrollCost || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(
                            dept.workforceUtilization,
                            "utilization"
                          )}`}
                        >
                          {(dept.workforceUtilization || 0).toFixed(2)}%
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {(dept.averageWorkingHours || 0).toFixed(1)} hrs/emp avg
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reportData.summary?.period && (
              <div className="mt-4 text-sm text-gray-500">
                <p>
                  Period: {reportData.summary.period.startDate} to{" "}
                  {reportData.summary.period.endDate} (
                  {reportData.summary.period.workingDays} working days)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Click "Generate Report" to view department performance summary
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
