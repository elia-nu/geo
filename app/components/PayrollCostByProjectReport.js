"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Briefcase, MapPin, Building2, Milestone, DollarSign } from "lucide-react";

export default function PayrollCostByProjectReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const [filters, setFilters] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    groupBy: "project",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.month) params.set("month", filters.month);
      if (filters.year) params.set("year", filters.year);
      if (filters.groupBy) params.set("groupBy", filters.groupBy);

      const res = await fetch(`/api/reports/payroll/cost-by-project?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate payroll cost-by-project report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Payroll Cost by Project report generated.");
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
    const byProject = reportData.byProject || [];
    const rows = [
      ["Project", "Employee Count", "Gross Pay", "Net Pay", "Allowances", "Deductions"],
      ...byProject.map((r) => [r.projectName, r.employeeCount, r.grossPay, r.netPay, r.allowances, r.deductions]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_cost_by_project_${reportData.period?.year}_${reportData.period?.month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const byProject = reportData?.byProject || [];
  const bySite = reportData?.bySite || [];
  const byDepartment = reportData?.byDepartment || [];
  const byPhase = reportData?.byPhase || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Payroll Cost by Project Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Workforce cost per project, site, department, phase/milestone.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <h3 className="text-sm font-semibold text-black px-4 py-3 border-b flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              By Project
            </h3>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross Pay</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net Pay</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Allowances</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Deductions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {byProject.map((r) => (
                    <tr key={r.projectId}>
                      <td className="px-3 py-2 text-black">{r.projectName}</td>
                      <td className="px-3 py-2 text-right text-black">{r.employeeCount}</td>
                      <td className="px-3 py-2 text-right text-black">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right text-black">{r.netPay}</td>
                      <td className="px-3 py-2 text-right text-black">{r.allowances}</td>
                      <td className="px-3 py-2 text-right text-black">{r.deductions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                By Site
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Site</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bySite.map((r) => (
                    <tr key={r.siteId}>
                      <td className="px-3 py-2 text-black">{r.siteName}</td>
                      <td className="px-3 py-2 text-right text-black">{r.employeeCount}</td>
                      <td className="px-3 py-2 text-right text-black">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right text-black">{r.netPay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                By Department
              </h3>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {byDepartment.map((r) => (
                    <tr key={r.department}>
                      <td className="px-3 py-2 text-black">{r.department}</td>
                      <td className="px-3 py-2 text-right text-black">{r.employeeCount}</td>
                      <td className="px-3 py-2 text-right text-black">{r.grossPay}</td>
                      <td className="px-3 py-2 text-right text-black">{r.netPay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {byPhase.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b flex items-center gap-2">
                <Milestone className="w-4 h-4 text-amber-600" />
                By Phase / Milestone
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Phase</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Employees</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byPhase.map((r, i) => (
                      <tr key={r.milestoneId || i}>
                        <td className="px-3 py-2 text-black">{r.projectName}</td>
                        <td className="px-3 py-2 text-black">{r.phaseName}</td>
                        <td className="px-3 py-2 text-right text-black">{r.employeeCount}</td>
                        <td className="px-3 py-2 text-right text-black">{r.grossPay}</td>
                        <td className="px-3 py-2 text-right text-black">{r.netPay}</td>
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
