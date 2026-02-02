"use client";

import React, { useState } from "react";
import { Download, RefreshCw, TrendingUp, Users, DollarSign, Calendar, Briefcase } from "lucide-react";

export default function WorkforceProductivityROIReport() {
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

      const res = await fetch(`/api/reports/executive/workforce-productivity-roi?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Workforce Productivity & ROI report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const attendanceVsOutput = reportData?.attendanceVsOutput || {};
  const payrollCostVsProjectProgress = reportData?.payrollCostVsProjectProgress || {};
  const leaveImpactVsDelivery = reportData?.leaveImpactVsDelivery || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Workforce Productivity & ROI Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Attendance rate vs output, payroll cost vs project progress, leave impact vs delivery timelines.
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Attendance Rate %</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.attendanceRate ?? 0}%</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Output Rate %</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{summary.outputRate ?? 0}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Payroll Cost</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{summary.payrollCost ?? 0}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Project Completion %</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{summary.projectCompletionRate ?? 0}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Attendance vs Output
              </h3>
              <p className="text-sm text-gray-600 mb-2">{attendanceVsOutput.note}</p>
              <p className="text-lg font-bold text-blue-600">Attendance: {attendanceVsOutput.attendanceRate ?? 0}%</p>
              <p className="text-lg font-bold text-emerald-600">Output: {attendanceVsOutput.outputRate ?? 0}%</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Payroll Cost vs Project Progress
              </h3>
              <p className="text-sm text-gray-600 mb-2">{payrollCostVsProjectProgress.note}</p>
              <p className="text-lg font-bold text-amber-600">Payroll: {payrollCostVsProjectProgress.payrollCost ?? 0}</p>
              <p className="text-lg font-bold text-indigo-600">Completion: {payrollCostVsProjectProgress.projectCompletionRate ?? 0}%</p>
              <p className="text-sm text-gray-700">Avg progress: {payrollCostVsProjectProgress.avgProjectProgress ?? 0}%</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                Leave Impact vs Delivery
              </h3>
              <p className="text-sm text-gray-600 mb-2">{leaveImpactVsDelivery.note}</p>
              <p className="text-lg font-bold text-rose-600">Leave days: {leaveImpactVsDelivery.leaveDays ?? 0}</p>
              <p className="text-lg font-bold text-gray-700">Leave impact: {leaveImpactVsDelivery.leaveImpactPercent ?? 0}%</p>
              <p className="text-sm text-gray-700">Projects: {leaveImpactVsDelivery.completedProjects ?? 0} / {leaveImpactVsDelivery.totalProjects ?? 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
