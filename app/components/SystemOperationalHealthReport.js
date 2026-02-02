"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Activity, LogIn, XCircle, AlertTriangle, Clock } from "lucide-react";

export default function SystemOperationalHealthReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ startDate: startOfMonth, endDate: endOfMonth });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/reports/executive/system-health?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("System Operational Health report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const loginSummary = reportData?.loginSummary || {};
  const failedPayrollRuns = reportData?.failedPayrollRuns || [];
  const attendanceSyncErrors = reportData?.attendanceSyncErrors || [];
  const apiActivity = reportData?.apiActivity || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            System Operational Health Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Login success/failure, API activity, failed payroll runs, attendance sync errors.
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
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${messageType === "success" ? "bg-green-50 text-green-800" : messageType === "error" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <LogIn className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Login Success</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{loginSummary.success ?? summary.loginSuccess ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Login Failure</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{loginSummary.failure ?? summary.loginFailure ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Success Rate %</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{loginSummary.successRate ?? "—"}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Failed Payroll</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{summary.failedPayrollRunsCount ?? 0}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-rose-600" />
                <span className="font-medium text-rose-900">Sync Errors</span>
              </div>
              <p className="text-2xl font-bold text-rose-600">{summary.attendanceSyncErrorsCount ?? 0}</p>
            </div>
          </div>

          {apiActivity.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">API Activity by Entity Type</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiActivity.map((a) => (
                      <tr key={a.type}>
                        <td className="px-3 py-2 text-gray-900">{a.type}</td>
                        <td className="px-3 py-2 text-right">{a.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {failedPayrollRuns.length > 0 && (
            <div className="bg-white rounded-lg border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Failed Payroll Runs
              </h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {failedPayrollRuns.slice(0, 20).map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">{e.userId ?? "—"}</td>
                        <td className="px-3 py-2">{e.entityId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {attendanceSyncErrors.length > 0 && (
            <div className="bg-white rounded-lg border border-rose-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Attendance Sync Errors
              </h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceSyncErrors.slice(0, 20).map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">{e.entityId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData.note && (
            <p className="text-sm text-gray-500 italic">{reportData.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
