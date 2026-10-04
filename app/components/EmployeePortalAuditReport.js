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
    actionCategory: "all", // all, attendance, leave_overtime, documents, security, tasks
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
      ["By Category - Leave & Overtime", byActivity.leave_overtime ?? 0],
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

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case "attendance":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "leave_overtime":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "documents":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "security":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "tasks":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Employee Portal Activities (Self-Service Audit)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated audit trail of all employee self-service actions: clock ins/outs, break timings, excuse documents, leave &amp; overtime submissions, password resets, and biometric results.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm transition"
          >
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 shadow-sm transition"
                title="Download CSV"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Employee Filter
          </label>
          <input
            type="text"
            placeholder="Name, email, or employee ID"
            value={filters.actor}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Activity Category
          </label>
          <select
            value={filters.actionCategory}
            onChange={(e) => setFilters({ ...filters, actionCategory: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="all">All Self-Service Activities</option>
            <option value="attendance">Clock In/Out &amp; Breaks</option>
            <option value="leave_overtime">Leave &amp; Overtime Requests</option>
            <option value="documents">Excuses &amp; Document Uploads</option>
            <option value="security">Password &amp; Profile Updates</option>
            <option value="tasks">Assigned Task Updates</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed / Validation Denied Only</option>
          </select>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : messageType === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          )}
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-indigo-50/80 rounded-xl p-3.5 border border-indigo-200">
              <span className="text-xs font-semibold text-indigo-900 block">Total Actions</span>
              <p className="text-2xl font-black text-indigo-700 mt-1">
                {summary.totalPortalEvents ?? 0}
              </p>
            </div>
            <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-900 block">Successes</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {summary.successCount ?? 0}
              </p>
            </div>
            <div className="bg-rose-50/80 rounded-xl p-3.5 border border-rose-200">
              <span className="text-xs font-semibold text-rose-900 block">Failures / Denied</span>
              <p className="text-2xl font-black text-rose-700 mt-1">
                {summary.failedCount ?? 0}
              </p>
            </div>
            <div className="bg-blue-50/80 rounded-xl p-3.5 border border-blue-200">
              <span className="text-xs font-semibold text-blue-900 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" /> Attendance
              </span>
              <p className="text-xl font-bold text-blue-700 mt-1">
                {byActivity.attendance ?? 0}
              </p>
            </div>
            <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-900 block flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-emerald-600" /> Leave/Overtime
              </span>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {byActivity.leave_overtime ?? 0}
              </p>
            </div>
            <div className="bg-purple-50/80 rounded-xl p-3.5 border border-purple-200">
              <span className="text-xs font-semibold text-purple-900 block flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-600" /> Documents
              </span>
              <p className="text-xl font-bold text-purple-700 mt-1">
                {byActivity.documents ?? 0}
              </p>
            </div>
            <div className="bg-amber-50/80 rounded-xl p-3.5 border border-amber-200">
              <span className="text-xs font-semibold text-amber-900 block flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-600" /> Security/Pass
              </span>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {byActivity.security ?? 0}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">
                Self-Service Activity Stream ({events.length} records)
              </h3>
              <span className="text-xs text-slate-500">
                Shows exact submission changes, device IP, and failure reasons
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider min-w-[220px]">
                      Submitted / Changed Payload
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                        No portal activities found for the selected dates and filters.
                      </td>
                    </tr>
                  ) : (
                    events.map((e, idx) => {
                      const isSuccess = e.status === "SUCCESS";
                      const isFailed = e.status === "FAILED";
                      const changesText = formatChangesText(e.changes);

                      return (
                        <tr
                          key={e.id || idx}
                          onClick={() => setSelectedEvent(e)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {e.employeeName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {e.employeeEmail || e.employeeId || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                            {e.timestamp
                              ? new Date(e.timestamp).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "medium",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900 text-xs">
                              {e.activityTitle}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {e.action}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getCategoryBadge(
                                e.category
                              )}`}
                            >
                              {e.category?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isSuccess
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {isFailed && e.errorReason ? (
                              <div className="text-rose-700 font-medium">
                                Error: {e.errorReason}
                              </div>
                            ) : null}
                            {changesText !== "—" ? (
                              <div className="text-slate-600 font-mono text-[11px] truncate max-w-xs">
                                {changesText}
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">Standard execution</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedEvent(e);
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
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
              <div className="px-5 py-3 border-t border-slate-200 text-xs text-slate-500 bg-slate-50/50 flex justify-between items-center">
                <span>Showing {events.length} portal self-service records.</span>
                <span>Protected by audit ledger and IP traceability.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Employee Portal Transaction Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Employee</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedEvent.employeeName}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {selectedEvent.employeeEmail || selectedEvent.employeeId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-xs mt-0.5 ${
                      selectedEvent.status === "SUCCESS"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {selectedEvent.status === "SUCCESS" ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {selectedEvent.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Activity</span>
                  <span className="font-semibold text-slate-900">
                    {selectedEvent.activityTitle} ({selectedEvent.action})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Timestamp</span>
                  <span className="font-medium text-slate-900">
                    {selectedEvent.timestamp
                      ? new Date(selectedEvent.timestamp).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Client IP</span>
                  <span className="font-mono text-slate-900">
                    {selectedEvent.ipAddress || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Device User Agent</span>
                  <span className="font-mono text-slate-900 truncate block max-w-xs">
                    {selectedEvent.userAgent || "—"}
                  </span>
                </div>
              </div>

              {selectedEvent.errorReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Rejection / Error Reason:</span>
                    {selectedEvent.errorReason}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  What Was Submitted / Changed
                </h4>
                {selectedEvent.changes ? (
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(selectedEvent.changes, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    Standard action payload without field delta.
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Complete Transaction Metadata
                </h4>
                {selectedEvent.metadata ? (
                  <div className="bg-slate-50 text-slate-900 p-3.5 rounded-xl font-mono text-xs border border-slate-200 overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(selectedEvent.metadata, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    No extra metadata stored.
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium transition"
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
