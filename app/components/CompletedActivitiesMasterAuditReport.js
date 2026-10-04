"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  ClipboardList,
  Calendar,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  X,
  Users,
  Briefcase,
  Clock,
  CalendarDays,
  DollarSign,
  FileText,
  Shield,
  Layers,
  Flame,
} from "lucide-react";

export default function CompletedActivitiesMasterAuditReport() {
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
    module: "all",
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
      if (filters.module && filters.module !== "all")
        params.set("module", filters.module);

      const res = await fetch(
        `/api/reports/executive/completed-activities?${params.toString()}`,
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
      setMessage("Completed Activities (Master Audit) report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  let events = reportData?.events || [];
  const byModule = summary.byModule || {};
  const byStatus = summary.byStatus || {};

  // Client-side status filter if requested
  if (filters.status && filters.status !== "all") {
    events = events.filter((e) => e.status === filters.status);
  }

  // Format changes into readable summary string
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
      "Actor",
      "Actor Email",
      "Role",
      "Timestamp",
      "Module",
      "Action",
      "Status",
      "Outcome Description",
      "Entity Type",
      "Entity ID",
      "What Was Changed",
      "IP Address",
      "User Agent",
    ];

    const rows = events.map((e) => [
      e.actorName || e.actor || "",
      e.actorEmail || "",
      e.actorRole || "",
      e.timestamp ? new Date(e.timestamp).toISOString() : "",
      e.module || "",
      e.action || "",
      e.status?.toUpperCase() || "",
      e.outcome || "",
      e.source || "",
      e.entityId || "",
      formatChangesText(e.changes),
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
      `completed_activities_audit_${new Date().toISOString().slice(0, 10)}.csv`
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
      ["Completed Activities (Master Audit) - Executive Summary"],
      [],
      ["Metric", "Value"],
      ["Total Events", summary.totalEvents ?? 0],
      ["By Module - Employees & Org", byModule.employee ?? 0],
      ["By Module - Projects & Budgets", byModule.projects ?? 0],
      ["By Module - Attendance", byModule.attendance ?? 0],
      ["By Module - Leave", byModule.leave ?? 0],
      ["By Module - Overtime", byModule.overtime ?? 0],
      ["By Module - Payroll", byModule.payroll ?? 0],
      ["By Module - Documents", byModule.documents ?? 0],
      ["By Status - Success", byStatus.success ?? 0],
      ["By Status - Failed", byStatus.failed ?? 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    const eventRows = [
      [
        "Actor",
        "Actor Email",
        "Role",
        "Timestamp",
        "Module",
        "Action",
        "Status",
        "Outcome",
        "Entity Type",
        "Entity ID",
        "What Was Changed",
        "IP Address",
      ],
      ...events.map((e) => [
        e.actorName || e.actor || "",
        e.actorEmail || "",
        e.actorRole || "",
        e.timestamp ? new Date(e.timestamp).toLocaleString() : "",
        e.module ?? "",
        e.action ?? "",
        e.status?.toUpperCase() ?? "",
        e.outcome ?? "",
        e.source ?? "",
        e.entityId ?? "",
        formatChangesText(e.changes),
        e.ipAddress ?? "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eventRows), "Audit Events");

    const fileName = `completed_activities_audit_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 bg-white">
      {/* Header Banner - Fully White with Navy Blue & Blue */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Completed Activities Report (Master Audit)
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Enterprise-wide audit trail of all transactions: employee &amp; org updates, project &amp; budget adjustments, attendance logs, leave approvals, overtime records, and payroll calculations.
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
                title="Download CSV file"
              >
                <Download className="w-4 h-4 text-blue-400" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg font-medium flex items-center gap-2 shadow-xs transition"
                title="Download Excel spreadsheet"
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
            Actor (Filter)
          </label>
          <input
            type="text"
            placeholder="Name, email, or user ID"
            value={filters.actor}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Module
          </label>
          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
          >
            <option value="all">All Modules</option>
            <option value="employee">Employees &amp; Organization</option>
            <option value="projects">Projects, Budgets &amp; Tasks</option>
            <option value="attendance">Attendance &amp; Geofences</option>
            <option value="leave">Leave Management</option>
            <option value="overtime">Overtime (Orange)</option>
            <option value="payroll">Payroll &amp; Compensation</option>
            <option value="documents">Documents Management</option>
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
            <option value="failed">Failed / Access Denied Only</option>
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
          {/* Module Breakdown Cards: Fully White with Navy Blue & Blue, and OVERTIME ONLY ORANGE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Total Events */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <Layers className="w-4 h-4 text-blue-600" />
                Total Events
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {summary.totalEvents ?? 0}
              </p>
            </div>

            {/* Employees & Org */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                Employees
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.employee ?? 0}
              </p>
            </div>

            {/* Projects & Budget */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Projects
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.projects ?? 0}
              </p>
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                Attendance
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.attendance ?? 0}
              </p>
            </div>

            {/* Leave */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                Leave
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.leave ?? 0}
              </p>
            </div>

            {/* OVERTIME: ONLY ORANGE */}
            <div className="bg-orange-50/80 rounded-xl p-4 border-2 border-orange-300 shadow-xs">
              <div className="flex items-center gap-1.5 text-orange-950 font-black text-xs mb-1">
                <Flame className="w-4 h-4 text-orange-600" />
                Overtime
              </div>
              <p className="text-2xl font-black text-orange-600 mt-1">
                {byModule.overtime ?? 0}
              </p>
            </div>

            {/* Payroll */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Payroll
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.payroll ?? 0}
              </p>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs mb-1">
                <FileText className="w-4 h-4 text-blue-600" />
                Documents
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {byModule.documents ?? 0}
              </p>
            </div>
          </div>

          {/* Success vs Failed Summary - White & Navy Blue */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Successful Activities
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {byStatus.success ?? 0}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Verified
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Failed / Denied
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {byStatus.failed ?? 0}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Flagged
              </span>
            </div>
          </div>

          {/* Detailed Audit Table - Clean White & Navy Blue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Master Audit Ledger ({events.length} records)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Click any row or &quot;Details&quot; to inspect changes
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-800 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-900 min-w-[200px]">
                      Outcome &amp; What Changed
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
                        No audit activities match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    events.map((e, idx) => {
                      const isSuccess = e.status === "success";
                      const isFailed = e.status === "failed";
                      const changesText = formatChangesText(e.changes);
                      const isOvertime = e.module === "overtime" || e.action?.includes("OVERTIME");

                      return (
                        <tr
                          key={e.id || idx}
                          onClick={() => setSelectedEvent(e)}
                          className="hover:bg-slate-50/80 cursor-pointer transition"
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">
                              {e.actorName || e.actorEmail || e.actor || "System"}
                            </div>
                            {e.actorRole && (
                              <span className="text-[11px] font-semibold text-slate-600 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {e.actorRole}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs font-mono">
                            {e.timestamp
                              ? new Date(e.timestamp).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "medium",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {/* OVERTIME ONLY IS ORANGE; ALL OTHERS ARE NAVY/BLUE/WHITE */}
                            {isOvertime ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-extrabold bg-orange-100 text-orange-900 border border-orange-300">
                                Overtime
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-800 border border-slate-300 capitalize">
                                {e.module === "employee"
                                  ? "Employee"
                                  : e.module === "projects"
                                  ? "Projects/Budget"
                                  : e.module}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-800 font-semibold">
                            {e.action}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                isSuccess
                                  ? "bg-white text-blue-700 border-blue-300"
                                  : isFailed
                                  ? "bg-white text-slate-800 border-slate-300"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              {isSuccess ? "Success" : isFailed ? "Failed" : "Other"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700 text-xs">
                            <div className="font-semibold text-slate-900">
                              {e.outcome || "Completed"}
                            </div>
                            {changesText !== "—" && (
                              <div className="text-[11px] text-slate-600 truncate max-w-sm font-mono mt-0.5">
                                {changesText}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setSelectedEvent(e);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Inspect Details"
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
                <span>Showing {events.length} transaction records.</span>
                <span>Protected by immutable audit ledger.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal: Inspect What Was Changed */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Audit Transaction Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Action</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {selectedEvent.action}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-xs mt-0.5 ${
                      selectedEvent.status === "success"
                        ? "text-blue-700"
                        : "text-slate-800"
                    }`}
                  >
                    {selectedEvent.status === "success" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    {selectedEvent.status?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Actor</span>
                  <span className="font-semibold text-slate-900">
                    {selectedEvent.actorName
                      ? `${selectedEvent.actorName} (${selectedEvent.actorEmail || selectedEvent.actorId})`
                      : selectedEvent.actor}
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
                  <span className="text-slate-500 block font-medium">Module &amp; Entity</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {selectedEvent.module} / {selectedEvent.source || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Entity ID</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {selectedEvent.entityId || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">IP Address</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {selectedEvent.ipAddress || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Client Device</span>
                  <span className="font-mono text-slate-900 truncate block max-w-xs">
                    {selectedEvent.userAgent || "—"}
                  </span>
                </div>
              </div>

              {/* What Was Changed Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  What Was Changed (Field Differences)
                </h4>
                {selectedEvent.changes ? (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-48 border border-slate-800">
                    <pre>{JSON.stringify(selectedEvent.changes, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    No field modifications recorded for this activity (read-only or atomic event).
                  </p>
                )}
              </div>

              {/* Additional Metadata */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Metadata &amp; Operation Context
                </h4>
                {selectedEvent.metadata ? (
                  <div className="bg-slate-50 text-slate-900 p-4 rounded-xl font-mono text-xs border border-slate-200 overflow-x-auto max-h-48">
                    <pre>{JSON.stringify(selectedEvent.metadata, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    No extra metadata logged.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
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
