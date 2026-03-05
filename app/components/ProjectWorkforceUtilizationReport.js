"use client";

import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  Users,
  Briefcase,
  MapPin,
  UserCircle,
  Milestone,
} from "lucide-react";

export default function ProjectWorkforceUtilizationReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ projectId: "", startDate: startOfMonth, endDate: endOfMonth });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/reports/projects/workforce-utilization?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Project Workforce Utilization report generated.");
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
    const byProject = reportData.byProject || [];
    const rows = [
      ["Project", "Employee Hours", "Task Count"],
      ...byProject.map((r) => [r.projectName, r.employeeHours, r.taskCount]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_workforce_utilization_${reportData.filters?.startDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const byProject = reportData?.byProject || [];
  const bySite = reportData?.bySite || [];
  const byRole = reportData?.byRole || [];
  const byPhase = reportData?.byPhase || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Project Workforce Utilization Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Employee-hours per project, site, role, and milestone/phase.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input
            type="text"
            value={filters.projectId}
            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 text-green-800" : messageType === "error" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="font-medium text-indigo-900">Total Employee-Hours</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{summary.totalEmployeeHours ?? 0}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                By Project
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byProject.map((r) => (
                      <tr key={r.projectId}>
                        <td className="px-3 py-2 text-black">{r.projectName}</td>
                        <td className="px-3 py-2 text-right text-black">{r.employeeHours}</td>
                        <td className="px-3 py-2 text-right text-black">{r.taskCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                By Site
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Site</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Tasks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bySite.map((r) => (
                      <tr key={r.siteId}>
                        <td className="px-3 py-2 text-black">{r.siteName}</td>
                        <td className="px-3 py-2 text-right text-black">{r.employeeHours}</td>
                        <td className="px-3 py-2 text-right text-black">{r.taskCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-amber-600" />
                By Role
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                        Hours
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                        Tasks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byRole.map((r) => (
                      <tr key={r.role}>
                        <td className="px-3 py-2 text-black">{r.role}</td>
                        <td className="px-3 py-2 text-right text-black">
                          {r.employeeHours}
                        </td>
                        <td className="px-3 py-2 text-right text-black">
                          {r.taskCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Milestone className="w-4 h-4 text-emerald-600" />
                By Milestone / Phase
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">
                        Milestone / Phase
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                        Hours
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">
                        Tasks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byPhase.map((r) => (
                      <tr key={r.phaseId}>
                        <td className="px-3 py-2 text-black">
                          {r.phaseName}
                        </td>
                        <td className="px-3 py-2 text-right text-black">
                          {r.employeeHours}
                        </td>
                        <td className="px-3 py-2 text-right text-black">
                          {r.taskCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
