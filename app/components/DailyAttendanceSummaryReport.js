"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Download,
  RefreshCw,
  Users,
  Clock,
  AlertTriangle,
  MapPin,
  Briefcase,
} from "lucide-react";

export default function DailyAttendanceSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    date: "",
    department: "",
    projectId: "",
    locationId: "",
    shift: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.date) params.set("date", filters.date);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.shift) params.set("shift", filters.shift);

      const res = await fetch(
        `/api/reports/attendance/daily-summary?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate daily attendance summary report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Daily Attendance Summary generated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating daily attendance summary:", error);
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) {
      setMessage("Please generate the report first.");
      setMessageType("error");
      return;
    }

    setExporting(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const payload = {
        format,
        summary: reportData.summary || {},
        byDepartment: reportData.byDepartment || [],
        bySite: reportData.bySite || [],
        byProject: reportData.byProject || [],
        byShift: reportData.byShift || [],
        filters: reportData.filters || {},
      };

      const res = await fetch(
        "/api/reports/attendance/daily-summary/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || "Failed to export daily attendance summary report"
          );
        }
        throw new Error("Failed to export daily attendance summary report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily_attendance_summary_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Daily Attendance Summary exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting daily attendance summary:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};

  const safePercent = (num, denom) => {
    if (!denom || denom === 0) return "0.0";
    return ((num / denom) * 100).toFixed(1);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <CalendarDays className="w-8 h-8 text-blue-600" />
                <span>Daily Attendance Summary Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Present / Absent / Late / Early Checkout by site, project,
                department, and shift.
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                placeholder="Department (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={filters.projectId}
                onChange={(e) =>
                  setFilters({ ...filters, projectId: e.target.value })
                }
                placeholder="Project ID (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location ID
              </label>
              <input
                type="text"
                value={filters.locationId}
                onChange={(e) =>
                  setFilters({ ...filters, locationId: e.target.value })
                }
                placeholder="Work location ID (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift
              </label>
              <input
                type="text"
                value={filters.shift}
                onChange={(e) =>
                  setFilters({ ...filters, shift: e.target.value })
                }
                placeholder="Shift name (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
          </div>

          {message && (
            <div
              className={`mt-2 p-3 rounded-lg text-sm ${
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

        {/* Summary & Tables */}
        {reportData ? (
          <div className="space-y-6">
            {/* Overall summary cards */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Total Employees
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.totalEmployees || 0}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-900">
                      Present
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.present || 0}
                    <span className="text-sm text-emerald-700 ml-1">
                      (
                      {safePercent(
                        summary.present || 0,
                        summary.totalEmployees || 0
                      )}
                      %)
                    </span>
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Absent</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.absent || 0}
                    <span className="text-sm text-red-700 ml-1">
                      (
                      {safePercent(
                        summary.absent || 0,
                        summary.totalEmployees || 0
                      )}
                      %)
                    </span>
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Late</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {summary.late || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Early Checkout
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.earlyCheckout || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* By Department */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>By Department</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Early Checkout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.byDepartment?.map((g) => (
                      <tr key={g.department || g.name}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.department || g.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.totalEmployees || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-emerald-700">
                          {g.present || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-red-700">
                          {g.absent || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-yellow-700">
                          {g.late || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-purple-700">
                          {g.earlyCheckout || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Site */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>By Site</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Site
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Early Checkout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.bySite?.map((g) => (
                      <tr key={g.siteId || g.key}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.siteName || g.name || "Location"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.totalEmployees || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-emerald-700">
                          {g.present || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-red-700">
                          {g.absent || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-yellow-700">
                          {g.late || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-purple-700">
                          {g.earlyCheckout || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Project */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <span>By Project</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Early Checkout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.byProject?.map((g) => (
                      <tr key={g.projectId || g.key}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.projectName || g.name || "Project"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.totalEmployees || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-emerald-700">
                          {g.present || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-red-700">
                          {g.absent || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-yellow-700">
                          {g.late || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-purple-700">
                          {g.earlyCheckout || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Shift */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>By Shift</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Shift
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Early Checkout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.byShift?.map((g) => (
                      <tr key={g.shift || g.key}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.shift || g.name || "Shift"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {g.totalEmployees || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-emerald-700">
                          {g.present || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-red-700">
                          {g.absent || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-yellow-700">
                          {g.late || 0}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-purple-700">
                          {g.earlyCheckout || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Select a date and click &quot;Generate Report&quot; to view daily
              attendance summary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

