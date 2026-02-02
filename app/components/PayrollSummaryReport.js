"use client";

import React, { useState } from "react";
import { Download, RefreshCw, FileText, DollarSign, Building2, Briefcase, Users } from "lucide-react";

export default function PayrollSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    department: "",
    projectId: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);

      const res = await fetch(`/api/reports/payroll/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate payroll summary report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Payroll Summary report generated successfully.");
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
      ["Employee", "Department", "Gross Pay", "Net Pay", "Deductions", "Allowances", "Month", "Year"],
      ...(reportData.byEmployee || []).map((r) => [
        r.employeeName,
        r.department,
        r.grossPay,
        r.netPay,
        r.deductions,
        r.allowances,
        reportData.period?.month,
        reportData.period?.year,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_summary_${reportData.period?.year}_${reportData.period?.month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const byEmployee = reportData?.byEmployee || [];
  const byDepartment = reportData?.byDepartment || [];
  const byProject = reportData?.byProject || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Payroll Summary Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Gross pay, net pay, deductions, allowances by employee, department, project, month.
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input
            type="text"
            value={filters.projectId}
            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Gross Pay</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{summary.grossPay ?? 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Net Pay</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{summary.netPay ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Deductions</span>
              </div>
              <p className="text-xl font-bold text-amber-600">{summary.deductions ?? 0}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Allowances</span>
              </div>
              <p className="text-xl font-bold text-indigo-600">{summary.allowances ?? 0}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              By Employee
            </h3>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Allowances</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {byEmployee.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-3 py-2 text-gray-900">{r.employeeName}</td>
                      <td className="px-3 py-2">{r.department}</td>
                      <td className="px-3 py-2 text-right">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right">{r.netPay}</td>
                      <td className="px-3 py-2 text-right">{r.deductions}</td>
                      <td className="px-3 py-2 text-right">{r.allowances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                By Department
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {byDepartment.map((r) => (
                    <tr key={r.department}>
                      <td className="px-3 py-2 text-gray-900">{r.department}</td>
                      <td className="px-3 py-2 text-right">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right">{r.netPay}</td>
                      <td className="px-3 py-2 text-right">{r.employeeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600" />
                By Project
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {byProject.map((r) => (
                    <tr key={r.projectId}>
                      <td className="px-3 py-2 text-gray-900">{r.projectName}</td>
                      <td className="px-3 py-2 text-right">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right">{r.netPay}</td>
                      <td className="px-3 py-2 text-right">{r.employeeCount}</td>
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
