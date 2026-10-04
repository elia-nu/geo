"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  UserCheck,
  Calendar,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  Clock,
  CalendarDays,
  KeyRound,
  FileText,
  CheckSquare,
  ShieldAlert,
  Flame,
} from "lucide-react";

export default function EmployeePortalAuditReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [filters, setFilters] = useState({
    startDate: startOfMonth,
    endDate: endOfMonth,
    actor: "",
    actionCategory: "all", // all, attendance, leave, overtime, documents, security, tasks
    status: "all", // all, success, failed
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.actor?.trim()) params.set("actor", filters.actor.trim());
      if (filters.actionCategory && filters.actionCategory !== "all")
        params.set("actionCategory", filters.actionCategory);
      if (filters.status && filters.status !== "all")
        params.set("status", filters.status);

      const res = await fetch(
        `/api/reports/executive/employee-portal-activities?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Employee Portal Activity report generated successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const events = reportData?.events || [];
  const byActivity = summary.byActivity || {};

  const formatChangesText = (changes) => {
    if (!changes) return "—";
    try {
      if (typeof changes === "string") return changes;
      const { before, after } = changes;
      if (before && after) {
        const keys = Array.from(
          new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
        );
        const deltas = keys
          .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
          .map((k) => `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(after[k])}`);
        return deltas.length > 0 ? deltas.join("; ") : "No field differences";
      }
      if (after) {
        return Object.entries(after)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
          .join("; ");
      }
      return JSON.stringify(changes);
    } catch {
      return "Modified record";
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!events.length) return;

    const headers = [
      "Employee Name",
      "Employee ID",
      "Employee Email",
      "Timestamp",
      "Activity",
      "Action Code",
      "Category",
      "Status",
      "What Was Changed",
      "Failure Reason",
      "IP Address",
      "User Agent",
    ];

    const rows = events.map((e) => [
      e.employeeName || "",
      e.employeeId || "",
      e.employeeEmail || "",
      e.timestamp ? new Date(e.timestamp).toISOString() : "",
      e.activityTitle || e.action || "",
      e.action || "",
      e.category || "",
      e.status || "",
      formatChangesText(e.changes),
      e.errorReason || "",
      e.ipAddress || "",
      e.userAgent || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) =>
          row
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `employee_portal_activities_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!reportData) return;
    const mod = await import("xlsx");
    const XLSX = mod.default ?? mod;
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["Employee Portal Activities - Executive Report"],
      [],
      ["Metric", "Value"],
      ["Total Portal Events", summary.totalPortalEvents ?? 0],
      ["Success Count", summary.successCount ?? 0],
      ["Failed Count", summary.failedCount ?? 0],
      ["By Category - Attendance & Breaks", byActivity.attendance ?? 0],
      ["By Category - Leave Requests", byActivity.leave ?? 0],
      ["By Category - Overtime (Orange)", byActivity.overtime ?? 0],
      ["By Category - Documents & Excuses", byActivity.documents ?? 0],
      ["By Category - Password & Profile", byActivity.security ?? 0],
      ["By Category - Tasks & Projects", byActivity.tasks ?? 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    const eventRows = [
      [
        "Employee Name",
        "Employee ID",
        "Employee Email",
        "Timestamp",
        "Activity Title",
        "Action Code",
        "Category",
        "Status",
        "What Was Changed",
        "Failure Reason",
        "IP Address",
      ],
      ...events.map((e) => [
        e.employeeName || "",
        e.employeeId || "",
        e.employeeEmail || "",
        e.timestamp ? new Date(e.timestamp).toLocaleString() : "",
        e.activityTitle || "",
        e.action || "",
        e.category || "",
        e.status || "",
        formatChangesText(e.changes),
        e.errorReason || "",
        e.ipAddress || "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventRows), "Portal Activities");

    const fileName = `employee_portal_activities_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 bg-white">
      {/* Header Banner - White with Navy Blue and Blue */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-blue-600" />
            Employee Portal Activities (Self-Service Audit)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Dedicated audit trail of all employee self-service actions: clock ins/outs, break timings, excuse documents, leave &amp; overtime submissions, and security authentications.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2 shadow-xs transition"
          >
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg font-medium flex items-center gap-2 shadow-xs transition"
                title="Download CSV"
              >
                <Download className="w-4 h-4 text-blue-400" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg font-medium flex items-center gap-2 shadow-xs transition"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar - Clean White with Navy Blue Labels */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Employee Filter
          </label>
          <input
            type="text"
            placeholder="Name, email, or employee ID"
            value={filters.actor}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Activity Category
          </label>
          <select
            value={filters.actionCategory}
            onChange={(e) => setFilters({ ...filters, actionCategory: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          >
            <option value="all">All Self-Service Activities</option>
            <option value="attendance">Clock In/Out &amp; Breaks</option>
            <option value="leave">Leave Requests</option>
            <option value="overtime">Overtime (Orange)</option>
            <option value="documents">Excuses &amp; Documents</option>
            <option value="security">Password &amp; Auth</option>
            <option value="tasks">Assigned Task Updates</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed / Denied Only</option>
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 ${
            messageType === "success"
              ? "bg-white text-slate-900 border border-slate-300 shadow-xs"
              : "bg-white text-slate-900 border border-red-300 shadow-xs"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          {/* Summary Metric Cards: Fully White with Navy Blue, and OVERTIME ONLY ORANGE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block">Total Actions</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary.totalPortalEvents ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block">Successes</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary.successCount ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block">Failures / Denied</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary.failedCount ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Attendance
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byActivity.attendance ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" /> Leave
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byActivity.leave ?? 0}
              </p>
            </div>

            {/* OVERTIME: ONLY ORANGE */}
            <div className="bg-orange-50/80 rounded-xl p-4 border-2 border-orange-300 shadow-xs">
              <span className="text-xs font-black text-orange-950 block flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-600" /> Overtime
              </span>
              <p className="text-2xl font-black text-orange-600 mt-1">
                {byActivity.overtime ?? 0}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <span className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Documents
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byActivity.documents ?? 0}
              </p>
            </div>
          </div>

          {/* Table: Clean White and Navy Blue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Self-Service Activity Ledger ({events.length} records)
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Shows exact submission changes, device IP, and failure reasons
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-800 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900 min-w-[220px]">
                      Submitted / Changed Payload
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-slate-900">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-slate-500 font-medium">
                        No portal activities found for the selected dates and filters.
                      </td>
                    </tr>
                  ) : (
                    events.map((e, idx) => {
                      const isSuccess = e.status === "SUCCESS";
                      const isFailed = e.status === "FAILED";
                      const changesText = formatChangesText(e.changes);
                      const isOvertime = e.category === "overtime" || e.action?.includes("OVERTIME");

                      return (
                        <tr
                          key={e.id || idx}
                          onClick={() => setSelectedEvent(e)}
                          className="hover:bg-slate-50/80 cursor-pointer transition"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {e.employeeName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {e.employeeEmail || e.employeeId || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs font-mono">
                            {e.timestamp
                              ? new Date(e.timestamp).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "medium",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {e.activityTitle}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500 font-medium">
                              {e.action}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {/* OVERTIME ONLY IS ORANGE; ALL OTHERS ARE NAVY/BLUE/WHITE */}
                            {isOvertime ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-100 text-orange-900 border border-orange-300">
                                Overtime
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-slate-800 border border-slate-300 capitalize">
                                {e.category?.replace(/_/g, " ")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isSuccess
                                  ? "bg-white text-blue-700 border-blue-300"
                                  : "bg-white text-slate-800 border-slate-300"
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            {isFailed && e.errorReason ? (
                              <div className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                                Error: {e.errorReason}
                              </div>
                            ) : null}
                            {changesText !== "—" ? (
                              <div className="text-slate-600 font-mono text-[11px] truncate max-w-xs mt-0.5">
                                {changesText}
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">Standard execution</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedEvent(e);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="View Full Payload"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {events.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-200 text-xs text-slate-500 bg-white flex justify-between items-center font-medium">
                <span>Showing {events.length} portal self-service records.</span>
                <span>Protected by immutable audit ledger.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Employee Portal Transaction Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Employee</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedEvent.employeeName}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedEvent.employeeEmail || selectedEvent.employeeId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-xs mt-0.5 ${
                      selectedEvent.status === "SUCCESS"
                        ? "text-blue-700"
                        : "text-slate-800"
                    }`}
                  >
                    {selectedEvent.status === "SUCCESS" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    {selectedEvent.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Activity</span>
                  <span className="font-semibold text-slate-900">
                    {selectedEvent.activityTitle} ({selectedEvent.action})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Timestamp</span>
                  <span className="font-semibold text-slate-900">
                    {selectedEvent.timestamp
                      ? new Date(selectedEvent.timestamp).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Client IP</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {selectedEvent.ipAddress || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Device User Agent</span>
                  <span className="font-mono text-slate-900 truncate block max-w-xs">
                    {selectedEvent.userAgent || "—"}
                  </span>
                </div>
              </div>

              {selectedEvent.errorReason && (
                <div className="p-3.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block text-slate-900">Rejection / Error Reason:</span>
                    {selectedEvent.errorReason}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  What Was Submitted / Changed
                </h4>
                {selectedEvent.changes ? (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-48 border border-slate-800">
                    <pre>{JSON.stringify(selectedEvent.changes, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    Standard action payload without field delta.
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Complete Transaction Metadata
                </h4>
                {selectedEvent.metadata ? (
                  <div className="bg-slate-50 text-slate-900 p-4 rounded-xl font-mono text-xs border border-slate-200 overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(selectedEvent.metadata, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    No extra metadata stored.
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-bold transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
