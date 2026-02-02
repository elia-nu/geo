"use client";

import React, { useState } from "react";
import { RefreshCw, ClipboardList, Calendar, User, Tag, CheckCircle } from "lucide-react";

export default function CompletedActivitiesMasterAuditReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    startDate: startOfMonth,
    endDate: endOfMonth,
    actor: "",
    module: "all",
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
      if (filters.module && filters.module !== "all") params.set("module", filters.module);

      const res = await fetch(`/api/reports/executive/completed-activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
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
  const events = reportData?.events || [];
  const byModule = summary.byModule || {};
  const byStatus = summary.byStatus || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Completed Activities Report (Master Audit)
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Every completed transaction: attendance check-in/out, leave approvals, payroll runs, document uploads, project updates. Actor, timestamp, source module, status, outcome.
          </p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actor (filter)</label>
          <input
            type="text"
            placeholder="Email or user ID"
            value={filters.actor}
            onChange={(e) => setFilters({ ...filters, actor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="all">All modules</option>
            <option value="attendance">Attendance</option>
            <option value="leave">Leave</option>
            <option value="payroll">Payroll</option>
            <option value="documents">Documents</option>
            <option value="projects">Projects</option>
          </select>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 text-green-800" : messageType === "error" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Total Events</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{summary.totalEvents ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <span className="font-medium text-blue-900 text-sm">Attendance</span>
              <p className="text-xl font-bold text-blue-600">{byModule.attendance ?? 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <span className="font-medium text-emerald-900 text-sm">Leave</span>
              <p className="text-xl font-bold text-emerald-600">{byModule.leave ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <span className="font-medium text-amber-900 text-sm">Payroll</span>
              <p className="text-xl font-bold text-amber-600">{byModule.payroll ?? 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <span className="font-medium text-purple-900 text-sm">Documents</span>
              <p className="text-xl font-bold text-purple-600">{byModule.documents ?? 0}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <span className="font-medium text-rose-900 text-sm">Projects</span>
              <p className="text-xl font-bold text-rose-600">{byModule.projects ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <span className="text-sm font-medium text-green-900">Success</span>
              <p className="text-lg font-bold text-green-600">{byStatus.success ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <span className="text-sm font-medium text-red-900">Failed</span>
              <p className="text-lg font-bold text-red-600">{byStatus.failed ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-900">Other</span>
              <p className="text-lg font-bold text-gray-600">{byStatus.other ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              Completed transactions (Actor • Timestamp • Source • Status • Outcome)
            </h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actor</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Module</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Outcome</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.slice(0, 200).map((e, i) => (
                    <tr key={e.id || i}>
                      <td className="px-3 py-2 text-gray-900">{e.actor ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 capitalize">{e.module ?? "—"}</td>
                      <td className="px-3 py-2">{e.action ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          e.status === "success" ? "bg-green-100 text-green-800" :
                          e.status === "failed" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {e.status === "success" && <CheckCircle className="w-3 h-3" />}
                          {e.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{e.outcome ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {events.length > 200 && (
              <p className="px-4 py-2 text-xs text-gray-500 border-t">Showing first 200 of {reportData.totalRecords ?? events.length} records.</p>
            )}
          </div>

          {reportData.note && (
            <p className="text-sm text-gray-500 italic">{reportData.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
