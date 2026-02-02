"use client";

import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  Wallet,
  AlertTriangle,
  TrendingDown,
  Users,
} from "lucide-react";

export default function LeaveBalanceEntitlementReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    department: "",
    overusedOnly: false,
    underutilizedOnly: false,
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.department) params.set("department", filters.department);
      if (filters.overusedOnly) params.set("overusedOnly", "true");
      if (filters.underutilizedOnly) params.set("underutilizedOnly", "true");

      const res = await fetch(
        `/api/reports/leave/balances?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate leave balance & entitlement report");
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Leave Balance & Entitlement report generated successfully.");
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
      const res = await fetch("/api/reports/leave/balances/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format: format === "excel" ? "excel" : "csv",
          rows: reportData.rows || [],
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
      a.download = `leave_balance_entitlement_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
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

  const rows = reportData?.rows || [];
  const leaveTypes = ["annual", "sick", "emergency", "personal", "maternity", "paternity", "bereavement"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            Leave Balance & Entitlement Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Current leave balances per employee; overused and underutilized leave indicators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            placeholder="Optional filter"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div className="flex items-center gap-4 pt-7">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.overusedOnly}
              onChange={(e) => setFilters({ ...filters, overusedOnly: e.target.checked })}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Overused only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.underutilizedOnly}
              onChange={(e) => setFilters({ ...filters, underutilizedOnly: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Underutilized only</span>
          </label>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
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

      {reportData && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-50 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-emerald-900">Employees: </span>
              <span className="text-lg font-bold text-emerald-600">{reportData.totalEmployees ?? rows.length}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Overused</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Underutilized</th>
                    {leaveTypes.map((lt) => (
                      <th key={lt} className="px-3 py-2 text-right font-medium text-gray-500 uppercase capitalize">
                        {lt} (Avail / Used)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.employeeId} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{r.employeeName}</div>
                        <div className="text-xs text-gray-500">{r.email || r.employeeId}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.department}</td>
                      <td className="px-3 py-2 text-center">
                        {r.overused ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.underutilized ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      {leaveTypes.map((lt) => {
                        const b = (r.balances || {})[lt] || {};
                        const avail = b.available ?? "—";
                        const used = b.used ?? "—";
                        const over = b.overused > 0 ? b.overused : null;
                        return (
                          <td key={lt} className="px-3 py-2 text-right">
                            <span className={over != null ? "text-red-600 font-medium" : ""}>
                              {avail} / {used}
                              {over != null && ` (-${over})`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                No employees match the current filters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
