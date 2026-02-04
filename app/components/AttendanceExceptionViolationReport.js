"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  Users,
} from "lucide-react";

export default function AttendanceExceptionViolationReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "",
    department: "",
    projectId: "",
    locationId: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.employeeId) params.set("employeeId", filters.employeeId);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.locationId) params.set("locationId", filters.locationId);

      const res = await fetch(
        `/api/reports/attendance/exceptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate attendance exceptions report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Attendance Exception & Violation Report generated.");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating attendance exception report:", error);
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
        lateArrivals: reportData.lateArrivals || [],
        earlyDepartures: reportData.earlyDepartures || [],
        // Outside-geofence attempts removed from this report's UI/export payload
        missedCheckIns: reportData.missedCheckIns || [],
        filters: reportData.filters || {},
      };

      const res = await fetch(
        "/api/reports/attendance/exceptions/export",
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
            err.error || "Failed to export attendance exceptions report"
          );
        }
        throw new Error("Failed to export attendance exceptions report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_exceptions_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Attendance exceptions report exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting attendance exceptions report:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span>Attendance Exception &amp; Violation Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Missed check-ins, late arrivals, early departures, and
                outside-geofence attempts across your workforce.
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
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
                placeholder="Filter by employee"
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
                placeholder="Department"
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
                placeholder="Project ID"
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
                placeholder="Work location ID"
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Employees
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.totalEmployees || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">
                      Late Arrivals
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {summary.lateArrivals || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Early Departures
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.earlyDepartures || 0}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-900">
                      Missed Check-ins
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.missedCheckIns || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Late Arrivals */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4">
                Late Arrivals
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Shift
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Check-in Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.lateArrivals?.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.employeeName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.department}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.shift}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.date}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.checkInTime
                            ? new Date(r.checkInTime).toLocaleTimeString()
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Early Departures */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4">
                Early Departures
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Shift
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Check-out Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.earlyDepartures?.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.employeeName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.department}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.shift}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.date}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.checkOutTime
                            ? new Date(r.checkOutTime).toLocaleTimeString()
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Missed Check-ins */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-black mb-4">
                Missed Check-ins
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.missedCheckIns?.map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.employeeName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.department}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {r.date}
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
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Set a date range and click &quot;Generate Report&quot; to view
              attendance exceptions and violations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

