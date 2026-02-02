"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Briefcase, DollarSign, Users, Calendar, TrendingUp } from "lucide-react";

export default function ProjectMasterSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({ projectId: "", status: "" });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/reports/projects/master-summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Project Master Summary report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const rows = [
      ["Project", "Status", "Budget Utilization %", "Workforce", "Timeline Variance", "Progress %"],
      ...(reportData.rows || []).map((r) => [
        r.projectName,
        r.status,
        r.budgetUtilization,
        r.workforceCount,
        r.timelineVarianceNote || "",
        r.progress,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_master_summary_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const rows = reportData?.rows || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Project Master Summary Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Project status (Active/Delayed/Completed), budget utilization, workforce count, timeline variance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input
            type="text"
            value={filters.projectId}
            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="delayed">Delayed</option>
            <option value="completed">Completed</option>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Projects</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.totalProjects ?? 0}</p>
            </div>
            {(summary.byStatus || []).map((s) => (
              <div key={s.status} className="bg-gray-50 rounded-lg p-4">
                <div className="font-medium text-gray-900 capitalize">{s.status}</div>
                <p className="text-2xl font-bold text-gray-700">{s.count}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Budget Util %</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Workforce</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Timeline</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.projectId}>
                      <td className="px-3 py-2 text-gray-900 font-medium">{r.projectName}</td>
                      <td className="px-3 py-2">
                        <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                          r.status === "completed" ? "bg-green-100 text-green-800" :
                          r.status === "delayed" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{r.budgetUtilization}%</td>
                      <td className="px-3 py-2 text-right">{r.workforceCount}</td>
                      <td className="px-3 py-2 text-right">{r.progress}%</td>
                      <td className="px-3 py-2">{r.timelineVarianceNote || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
