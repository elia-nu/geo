"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Link2, Calendar, Clock, AlertCircle } from "lucide-react";

export default function PayrollReconciliationReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ startDate: startOfMonth, endDate: endOfMonth, department: "", employeeId: "" });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.department) params.set("department", filters.department);
      if (filters.employeeId) params.set("employeeId", filters.employeeId);

      const res = await fetch(`/api/reports/payroll/reconciliation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate reconciliation report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Attendance-to-Payroll Reconciliation report generated.");
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
      ["Employee", "Department", "Attendance Days", "Leave Days", "Overtime Hours", "Absences", "Validation"],
      ...(reportData.rows || []).map((r) => [r.employeeName, r.department, r.attendanceDays, r.leaveDays, r.overtimeHours, r.absences, r.validationNote]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_reconciliation_${reportData.filters?.startDate}_${reportData.filters?.endDate}.csv`;
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
            <Link2 className="w-5 h-5 text-blue-600" />
            Attendance-to-Payroll Reconciliation Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Links attendance days, leave days, overtime hours, absences for payroll accuracy validation.
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
            <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
          <input
            type="text"
            value={filters.employeeId}
            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
            placeholder="Optional"
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
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Attendance Days</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{summary.totalAttendanceDays ?? 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Leave Days</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{summary.totalLeaveDays ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Overtime Hours</span>
              </div>
              <p className="text-xl font-bold text-amber-600">{summary.totalOvertimeHours ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Absences</span>
              </div>
              <p className="text-xl font-bold text-red-600">{summary.totalAbsences ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-gray-900">Period Working Days</span>
              </div>
              <p className="text-xl font-bold text-gray-700">{summary.periodWorkingDays ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b">Reconciliation by Employee</h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Attendance</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Leave</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Overtime (hrs)</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Absences</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Validation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-3 py-2 text-gray-900">{r.employeeName}</td>
                      <td className="px-3 py-2">{r.department}</td>
                      <td className="px-3 py-2 text-right">{r.attendanceDays}</td>
                      <td className="px-3 py-2 text-right">{r.leaveDays}</td>
                      <td className="px-3 py-2 text-right">{r.overtimeHours}</td>
                      <td className="px-3 py-2 text-right">{r.absences}</td>
                      <td className="px-3 py-2">{r.validationNote}</td>
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
