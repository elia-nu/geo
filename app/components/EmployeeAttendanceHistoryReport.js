"use client";

import React, { useState } from "react";
import { Clock, Download, RefreshCw, MapPin, Users } from "lucide-react";

export default function EmployeeAttendanceHistoryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });

  const handleGenerateReport = async () => {
    if (!filters.employeeId) {
      setMessage("Employee ID is required.");
      setMessageType("error");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      params.set("employeeId", filters.employeeId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(
        `/api/reports/attendance/history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate employee attendance history report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Employee Attendance History Report generated.");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating employee attendance history:", error);
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
        employee: reportData.employee || {},
        records: reportData.records || [],
        filters: reportData.filters || {},
      };

      const res = await fetch(
        "/api/reports/attendance/history/export",
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
            err.error ||
              "Failed to export employee attendance history report"
          );
        }
        throw new Error("Failed to export employee attendance history report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee_attendance_history_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Employee Attendance History exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting employee attendance history:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const employee = reportData?.employee;
  const records = reportData?.records || [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Clock className="w-8 h-8 text-blue-600" />
                <span>Employee Attendance History Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Full attendance trail for a specific employee, including
                timestamps and locations.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                placeholder="Business employeeId or Mongo _id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
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

        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Employee header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {employee?.name || "Employee"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {employee?.department || "Unassigned"}{" "}
                    {employee?.designation
                      ? `• ${employee.designation}`
                      : ""}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Total records:{" "}
                <span className="font-semibold">
                  {records.length}
                </span>
              </div>
            </div>

            {/* History table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Check-out
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Check-in Location
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Check-out Location
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Work Location
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      GPS / Geofence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.date}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.status || "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.checkInTime
                          ? new Date(r.checkInTime).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.checkOutTime
                          ? new Date(r.checkOutTime).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.workingHours ?? "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.checkInLocation
                          ? `${r.checkInLocation.latitude}, ${r.checkInLocation.longitude}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.checkOutLocation
                          ? `${r.checkOutLocation.latitude}, ${r.checkOutLocation.longitude}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        {r.nearestWorkLocationName || "—"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                        <div className="flex flex-col space-y-1">
                          <span>
                            Geofence:{" "}
                            {r.geofenceValidation
                              ? r.geofenceValidation.isValid
                                ? "Valid"
                                : "Invalid"
                              : "N/A"}
                          </span>
                          <span>
                            GPS:{" "}
                            {r.gpsValidation
                              ? r.gpsValidation.isValid
                                ? "Valid"
                                : "Invalid"
                              : "N/A"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Enter an employee ID and optional date range, then click
              &quot;Generate Report&quot; to see full attendance history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

