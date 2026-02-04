"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Milestone, AlertTriangle, CheckCircle } from "lucide-react";

export default function ProjectMilestoneProgressReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({ projectId: "" });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.projectId) params.set("projectId", filters.projectId);

      const res = await fetch(`/api/reports/projects/milestone-progress?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Project Milestone Progress report generated.");
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
      ["Project", "Milestone", "Planned", "Actual", "Status", "Progress %", "Delay Risk"],
      ...(reportData.rows || []).map((r) => [
        r.projectName,
        r.milestoneTitle,
        r.plannedCompletion,
        r.actualCompletion || "",
        r.status,
        r.progress,
        r.delayRisk,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_milestone_progress_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const rows = reportData?.rows || [];
  const delayRisks = reportData?.delayRiskIndicators || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <Milestone className="w-5 h-5 text-amber-600" />
            Project Milestone Progress Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Planned vs actual milestone completion; delay risk indicators.
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
        <input
          type="text"
          value={filters.projectId}
          onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
          placeholder="Optional"
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
        />
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
                <Milestone className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Milestones</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.totalMilestones ?? 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.completed ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Delayed</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.delayed ?? 0}</p>
            </div>
          </div>

          {delayRisks.length > 0 && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Delay Risk Indicators
              </h3>
              <ul className="space-y-2">
                {delayRisks.map((d, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-black">{d.projectName} – {d.milestoneTitle}</span>
                    <span className="text-amber-800">{d.daysOverdue} days overdue</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.risk === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{d.risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Milestone</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Planned</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Delay Risk</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r, i) => (
                    <tr key={r.milestoneId || i}>
                      <td className="px-3 py-2 text-black">{r.projectName}</td>
                      <td className="px-3 py-2 font-medium text-black">{r.milestoneTitle}</td>
                      <td className="px-3 py-2 text-black">{r.plannedCompletion || "—"}</td>
                      <td className="px-3 py-2 text-black">{r.actualCompletion || "—"}</td>
                      <td className="px-3 py-2 capitalize text-black">{r.status}</td>
                      <td className="px-3 py-2 text-right text-black">{r.progress}%</td>
                      <td className="px-3 py-2 text-black">
                        {r.isOverdue ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.delayRisk === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {r.daysOverdue} days
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
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
