"use client";

import React, { useState } from "react";
import { Download, RefreshCw, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function PayrollVarianceReport() {
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

      const res = await fetch(`/api/reports/payroll/variance?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate payroll variance report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Payroll Variance & Anomaly report generated.");
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
      ["Employee", "Department", "Current Net", "Previous Net", "Net Change %", "Anomaly"],
      ...(reportData.varianceRows || []).map((r) => [
        r.employeeName,
        r.department,
        r.currentMonth?.netPay,
        r.previousMonth?.netPay,
        r.netChangePercent,
        reportData.anomalies?.find((a) => a.employeeId === r.employeeId)?.description || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_variance_${reportData.period?.currentYear}_${reportData.period?.currentMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const varianceRows = reportData?.varianceRows || [];
  const anomalies = reportData?.anomalies || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Payroll Variance & Anomaly Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Sudden spikes/drops in salary, overtime anomalies, missing deductions.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-blue-900">Employees Compared</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.totalEmployees ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Anomalies Found</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.anomalyCount ?? 0}</p>
            </div>
          </div>

          {anomalies.length > 0 && (
            <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b bg-amber-50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Anomalies
              </h3>
              <ul className="divide-y divide-gray-200">
                {anomalies.map((a, i) => (
                  <li key={i} className="px-4 py-3 flex items-start gap-3">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${a.severity === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {a.type.replace(/_/g, " ")}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{a.employeeName}</p>
                      <p className="text-sm text-gray-600">{a.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b">Variance by Employee (current vs previous month)</h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Current Net</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Previous Net</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net Change %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {varianceRows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-3 py-2 text-gray-900">{r.employeeName}</td>
                      <td className="px-3 py-2">{r.department}</td>
                      <td className="px-3 py-2 text-right">{r.currentMonth?.netPay}</td>
                      <td className="px-3 py-2 text-right">{r.previousMonth?.netPay}</td>
                      <td className={`px-3 py-2 text-right flex items-center justify-end gap-1 ${r.netChangePercent > 0 ? "text-emerald-600" : r.netChangePercent < 0 ? "text-red-600" : ""}`}>
                        {r.netChangePercent > 0 && <TrendingUp className="w-4 h-4" />}
                        {r.netChangePercent < 0 && <TrendingDown className="w-4 h-4" />}
                        {r.netChangePercent}%
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
