"use client";

import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  Briefcase,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";

export default function LeaveWorkforceImpactReport({ embedded = false }) {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    startDate: new Date().getFullYear() +
      "-" +
      String(new Date().getMonth() + 1).padStart(2, "0") +
      "-01",
    endDate: new Date().toISOString().slice(0, 10),
    projectId: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.projectId) params.set("projectId", filters.projectId);

      const res = await fetch(
        `/api/reports/leave/workforce-impact?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate leave workforce impact report");
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Leave Impact on Workforce Availability report generated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error(error);
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
      const res = await fetch("/api/reports/leave/workforce-impact/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format: format === "excel" ? "excel" : "csv",
          summary: reportData.summary || {},
          projectsAffected: reportData.projectsAffected || [],
          coverageGaps: reportData.coverageGaps || [],
          replacementDemandForecast: reportData.replacementDemandForecast || [],
          filters: reportData.filters || {},
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave_workforce_impact_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage(`Report exported as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to export");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};
  const projectsAffected = reportData?.projectsAffected || [];
  const coverageGaps = reportData?.coverageGaps || [];
  const replacementDemandForecast = reportData?.replacementDemandForecast || [];

  const content = (
    <>
        <div className={embedded ? "" : "bg-white rounded-lg shadow-sm p-6 mb-6"}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <span>Leave Impact on Workforce Availability Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Projects affected by leave; coverage gaps; replacement demand
                forecasts.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        {reportData && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Projects Affected</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.projectsAffectedCount ?? 0}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Coverage Gaps</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.coverageGapsCount ?? 0}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-900">Total Replacement Demand (FTE)</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {summary.totalReplacementDemand ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <span>Projects Affected by Leave</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Total Assigned</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">On Leave</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projectsAffected.map((p) => (
                      <tr key={p.projectId}>
                        <td className="px-4 py-2 text-gray-900">{p.projectName}</td>
                        <td className="px-4 py-2">{p.totalAssigned}</td>
                        <td className="px-4 py-2">{p.onLeaveCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Coverage Gaps</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Assigned</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">On Leave</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coverageGaps.map((g) => (
                      <tr key={g.projectId}>
                        <td className="px-4 py-2 text-gray-900">{g.projectName}</td>
                        <td className="px-4 py-2">{g.assignedCount}</td>
                        <td className="px-4 py-2">{g.onLeaveCount}</td>
                        <td className="px-4 py-2 text-red-600">{g.gap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Replacement Demand Forecast</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Replacement FTE</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Suggestion</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {replacementDemandForecast.map((r) => (
                      <tr key={r.projectId}>
                        <td className="px-4 py-2 text-gray-900">{r.projectName}</td>
                        <td className="px-4 py-2">{r.replacementFte}</td>
                        <td className="px-4 py-2 text-gray-600">{r.suggestedCoverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (embedded) return content;
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {content}
      </div>
    </div>
  );
}
