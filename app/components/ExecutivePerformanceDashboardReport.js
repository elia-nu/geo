"use client";

import React, { useState } from "react";
import { Download, RefreshCw, BarChart3, UserCheck, DollarSign, Briefcase, Users, TrendingUp } from "lucide-react";

export default function ExecutivePerformanceDashboardReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);

      const res = await fetch(`/api/reports/executive/executive-dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Executive Performance Dashboard report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const kpis = reportData?.kpis || {};
  const summary = reportData?.summary || {};
  const kpiList = [
    { key: "attendanceAccuracy", icon: UserCheck, bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-600", label: "Attendance Accuracy" },
    { key: "payrollEfficiency", icon: DollarSign, bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", label: "Payroll Efficiency" },
    { key: "projectCompletionRate", icon: Briefcase, bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-600", label: "Project Completion Rate" },
    { key: "workforceUtilization", icon: Users, bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-600", label: "Workforce Utilization" },
    { key: "costVariance", icon: TrendingUp, bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600", label: "Cost Variance" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Executive Performance Dashboard Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Company-wide KPIs: Attendance accuracy, Payroll efficiency, Project completion rate, Workforce utilization, Cost variance.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
            min="2020"
            max="2030"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiList.map(({ key, icon: Icon, bg, border, text, label }) => {
              const kpi = kpis[key] || {};
              const value = summary[key] ?? kpi.value ?? 0;
              const unit = kpi.unit ?? "%";
              return (
                <div key={key} className={`${bg} rounded-lg p-4 border ${border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${text}`} />
                    <span className="font-medium text-black">{kpi.label || label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${text}`}>
                    {typeof value === "number" ? value : value}{unit}
                  </p>
                  {kpi.description && (
                    <p className="text-xs text-gray-600 mt-1">{kpi.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-black mb-3">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Employees</span>
                <p className="font-bold text-black">{summary.totalEmployees ?? 0}</p>
              </div>
              <div>
                <span className="text-gray-500">Total Projects</span>
                <p className="font-bold text-black">{summary.totalProjects ?? 0} ({summary.completedProjects ?? 0} completed)</p>
              </div>
              <div>
                <span className="text-gray-500">Tasks</span>
                <p className="font-bold text-black">{summary.completedTasks ?? 0} / {summary.totalTasks ?? 0}</p>
              </div>
              <div>
                <span className="text-gray-500">Attendance Days</span>
                <p className="font-bold text-black">{summary.totalAttendanceDays ?? 0}</p>
              </div>
              <div>
                <span className="text-gray-500">Payroll Total</span>
                <p className="font-bold text-black">{summary.payrollTotal ?? 0}</p>
              </div>
              <div>
                <span className="text-gray-500">Budget vs Expenses</span>
                <p className="font-bold text-black">{summary.totalBudget ?? 0} / {summary.totalExpenses ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
