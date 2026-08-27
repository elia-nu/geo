"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Download,
  RefreshCw,
  MapPin,
  Users,
  IdCard,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function EmployeeAttendanceHistoryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [filters, setFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });

  const handleGenerateReport = async () => {
    if (!filters.employeeId.trim()) {
      setMessage("Employee ID is required.");
      setMessageType("error");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const params = new URLSearchParams();
      params.set("employeeId", filters.employeeId.trim());
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
      if (
        (!data.employee ||
          data.employee.name === "Unknown" ||
          data.employee.name === "") &&
        (!data.records || data.records.length === 0)
      ) {
        setReportData(null);
        setMessage("No employee found for this ID. Please check the Emp-ID and try again.");
        setMessageType("error");
      } else {
        setReportData(data);
        setCurrentPage(1);
        setMessage("Employee Attendance History Report generated successfully.");
        setMessageType("success");
      }
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
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const payload = {
        format,
        employee: reportData.employee || {},
        records: reportData.records || [],
        filters: reportData.filters || {},
      };

      const res = await fetch("/api/reports/attendance/history/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || "Failed to export employee attendance history report"
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
        .split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`Employee Attendance History exported as ${format.toUpperCase()}`);
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

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (records.length === 0) {
      return { totalDays: 0, totalHours: 0, avgHours: "0.0", validGeofence: 0 };
    }
    const totalDays = records.length;
    const hoursArr = records.map((r) => Number(r.workingHours) || 0);
    const totalHours = hoursArr.reduce((a, b) => a + b, 0);
    const avgHours = (totalHours / totalDays).toFixed(1);
    const validGeofence = records.filter(
      (r) => r.geofenceValidation?.isValid || r.nearestWorkLocationName
    ).length;

    return {
      totalDays,
      totalHours: totalHours.toFixed(1),
      avgHours,
      validGeofence,
    };
  }, [records]);

  const totalPages = Math.ceil((records.length || 0) / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return records.slice(start, start + itemsPerPage);
  }, [records, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Control Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Employee Attendance History Report
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lookup detailed attendance logs, GPS geofence verifications, and timestamps by Emp-ID.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Generating..." : "Generate Report"}</span>
            </button>
            {reportData && (
              <>
                <button
                  onClick={() => handleExport("excel")}
                  disabled={exporting}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exporting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Employee ID (Emp-ID) *
            </label>
            <div className="relative">
              <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={filters.employeeId}
                onChange={(e) =>
                  setFilters({ ...filters, employeeId: e.target.value })
                }
                placeholder="e.g. EMP-001 or Mongo _id"
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-2xl text-sm bg-slate-50/70 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-slate-50/70 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs sm:text-sm bg-slate-50/70 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center gap-2 ${
              messageType === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : messageType === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message}</span>
          </div>
        )}
      </div>

      {reportData ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
          {/* Employee Header & KPI Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {(employee?.name || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {employee?.name || "Employee"}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <IdCard className="w-3.5 h-3.5" />
                    {employee?.employeeId || employee?.empId || filters.employeeId}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {employee?.department || "Unassigned"}
                  {employee?.designation ? ` • ${employee.designation}` : ""}
                  {employee?.email ? ` • ${employee.email}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                {records.length} Total Logs
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase">Days Logged</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{summaryMetrics.totalDays}</div>
            </div>
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-center">
              <div className="text-xs text-indigo-600 font-semibold uppercase">Total Hours</div>
              <div className="text-xl font-bold text-indigo-700 mt-1">{summaryMetrics.totalHours}h</div>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-center">
              <div className="text-xs text-emerald-600 font-semibold uppercase">Avg Hours/Day</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{summaryMetrics.avgHours}h</div>
            </div>
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-center">
              <div className="text-xs text-purple-600 font-semibold uppercase">Geofence Compliance</div>
              <div className="text-xl font-bold text-purple-700 mt-1">{summaryMetrics.validGeofence} logs</div>
            </div>
          </div>

          {/* History table */}
          <div className="border border-slate-100 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm text-left">
                <thead className="bg-slate-50">
                  <tr className="text-slate-500 font-semibold uppercase text-xs">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Check-in</th>
                    <th className="px-5 py-3.5">Check-out</th>
                    <th className="px-5 py-3.5 text-center">Hours</th>
                    <th className="px-5 py-3.5">Work Location</th>
                    <th className="px-5 py-3.5">GPS / Geofence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedRecords.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-900">
                        {r.date}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {r.status || "Completed"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-emerald-700 font-bold">
                        {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600">
                        {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center font-bold text-indigo-700">
                        {r.workingHours != null ? `${Number(r.workingHours).toFixed(1)} hrs` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{r.nearestWorkLocationName || r.workLocationName || "Standard Site"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                            r.geofenceValidation?.isValid !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {r.geofenceValidation?.isValid !== false ? "Geofence Valid" : "Outside Geofence"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={records.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(sz) => {
                  setItemsPerPage(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Attendance History Loaded
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Enter an Employee ID (Emp-ID) above and optional date bounds, then click Generate Report.
          </p>
        </div>
      )}
    </div>
  );
}
