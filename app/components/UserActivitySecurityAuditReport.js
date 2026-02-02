"use client";

import React, { useState } from "react";
import { RefreshCw, Shield, LogIn, Key, Download, AlertTriangle } from "lucide-react";

export default function UserActivitySecurityAuditReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ startDate: startOfMonth, endDate: endOfMonth, actor: "" });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.actor?.trim()) params.set("actor", filters.actor.trim());

      const res = await fetch(`/api/reports/executive/user-activity-security?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("User Activity & Security Audit report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const loginSummary = summary.loginSummary || {};
  const permissionSummary = summary.permissionSummary || {};
  const exportSummary = summary.exportSummary || {};
  const logins = reportData?.logins || [];
  const permissionChanges = reportData?.permissionChanges || [];
  const dataExports = reportData?.dataExports || [];
  const suspiciousPatterns = reportData?.suspiciousPatterns || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            User Activity & Security Audit Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Logins, permission changes, data exports, suspicious activity patterns.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-2xl font-bold text-green-600">{loginSummary.success ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <LogIn className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Login Failure</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{loginSummary.failure ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <span className="font-medium text-blue-900 text-sm">Login Success Rate</span>
              <p className="text-2xl font-bold text-blue-600">{loginSummary.successRate ?? "—"}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Role/Permission Events</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{permissionSummary.totalChangeEvents ?? 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Data Exports</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{exportSummary.totalExports ?? 0}</p>
            </div>
          </div>

          {suspiciousPatterns.length > 0 && (
            <div className="bg-rose-50 rounded-lg border border-rose-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Suspicious activity patterns
              </h3>
              <ul className="space-y-2">
                {suspiciousPatterns.map((p, i) => (
                  <li key={i} className="bg-white rounded p-2 border border-rose-100 text-sm">
                    <span className="font-medium text-gray-900">{p.type?.replace(/_/g, " ")}</span>
                    {p.actor && <span className="text-gray-600"> — {p.actor}</span>}
                    {p.detail && <p className="text-gray-600 mt-0.5">{p.detail}</p>}
                    {p.failures != null && <span className="text-gray-500"> ({p.failures} failures)</span>}
                    {p.exports != null && <span className="text-gray-500"> ({p.exports} exports)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
                <LogIn className="w-4 h-4 text-gray-500" />
                Login activity (sample)
              </h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actor</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logins.slice(0, 30).map((e, i) => (
                      <tr key={e.id || i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">{e.actor ?? "—"}</td>
                        <td className="px-3 py-2">{e.action ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-500" />
                Data exports (sample)
              </h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actor</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataExports.slice(0, 30).map((e, i) => (
                      <tr key={e.id || i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">{e.actor ?? "—"}</td>
                        <td className="px-3 py-2">{e.entityType ?? e.action ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {permissionChanges.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-500" />
                Permission / role changes
              </h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Actor</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Target user</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissionChanges.slice(0, 30).map((e, i) => (
                      <tr key={e.id || i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">{e.actor ?? "—"}</td>
                        <td className="px-3 py-2">{e.action ?? "—"}</td>
                        <td className="px-3 py-2">{e.userId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
