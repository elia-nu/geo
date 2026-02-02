"use client";

import React, { useState } from "react";
import { Download, RefreshCw, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

export default function ProjectCostBudgetPerformanceReport() {
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

      const res = await fetch(`/api/reports/projects/cost-budget-performance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Project Cost & Budget Performance report generated.");
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
      ["Project", "Budget", "Expenses", "Payroll Cost", "Util %", "Burn Rate", "Forecasted Overrun"],
      ...(reportData.rows || []).map((r) => [
        r.projectName,
        r.totalBudget,
        r.totalExpenses,
        r.actualPayrollCost,
        r.budgetUtilization,
        r.dailyBurnRate,
        r.forecastedOverrun,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_cost_budget_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Project Cost & Budget Performance Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Budget vs actual payroll cost, burn rate, forecasted overrun.
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
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Budget</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{summary.totalBudget ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Total Expenses</span>
              </div>
              <p className="text-xl font-bold text-amber-600">{summary.totalExpenses ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Forecasted Overrun</span>
              </div>
              <p className="text-xl font-bold text-red-600">{summary.totalForecastedOverrun ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Budget</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Expenses</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Payroll Cost</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Util %</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Burn Rate</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Forecast Overrun</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.projectId}>
                      <td className="px-3 py-2 text-gray-900 font-medium">{r.projectName}</td>
                      <td className="px-3 py-2 text-right">{r.totalBudget}</td>
                      <td className="px-3 py-2 text-right">{r.totalExpenses}</td>
                      <td className="px-3 py-2 text-right">{r.actualPayrollCost}</td>
                      <td className="px-3 py-2 text-right">{r.budgetUtilization}%</td>
                      <td className="px-3 py-2 text-right">{r.dailyBurnRate}</td>
                      <td className="px-3 py-2 text-right">{r.forecastedOverrun}</td>
                      <td className="px-3 py-2">{r.budgetVsActualNote}</td>
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
