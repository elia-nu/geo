"use client";

import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  FileText,
  PieChart,
  Building2,
  Briefcase,
  MapPin,
} from "lucide-react";

export default function LeaveRequestSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    startDate: startOfYear,
    endDate: endOfYear,
    department: "",
    projectId: "",
    locationId: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.locationId) params.set("locationId", filters.locationId);

      const res = await fetch(
        `/api/reports/leave/summary?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate leave request summary report");
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Leave Request Summary report generated successfully.");
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
      const res = await fetch("/api/reports/leave/summary/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format: format === "excel" ? "excel" : "csv",
          summary: reportData.summary || {},
          byDepartment: reportData.byDepartment || [],
          byProject: reportData.byProject || [],
          bySite: reportData.bySite || [],
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
      a.download = `leave_request_summary_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
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

  const summary = reportData?.summary || {};
  const byType = summary.byType || [];
  const byStatus = summary.byStatus || [];
  const byDepartment = reportData?.byDepartment || [];
  const byProject = reportData?.byProject || [];
  const bySite = reportData?.bySite || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Leave Request Summary Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Total requests by type (annual, sick, emergency), status (approved/rejected/pending), and by department, project, or site.
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
          <input
            type="text"
            value={filters.projectId}
            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site / Location ID</label>
          <input
            type="text"
            value={filters.locationId}
            onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
          />
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Requests</span>
              </div>
              <p className="text-2xl font-bold text-black">
                {summary.totalRequests ?? reportData.totalRecords ?? 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-600" />
                By Type (annual, sick, emergency, etc.)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byType.map((r) => (
                      <tr key={r.type}>
                        <td className="px-3 py-2 text-black capitalize">{r.type}</td>
                        <td className="px-3 py-2 text-right text-black">{r.count}</td>
                      </tr>
                    ))}   
                    {byType.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                By Status (approved / rejected / pending)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byStatus.map((r) => (
                      <tr key={r.status}>
                        <td className="px-3 py-2 text-black capitalize">{r.status}</td>
                        <td className="px-3 py-2 text-right text-black">{r.count}</td>
                      </tr>
                    ))}
                    {byStatus.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                By Department
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byDepartment.map((r) => (
                      <tr key={r.key || r.department}>
                        <td className="px-3 py-2 text-black">{r.department ?? r.name ?? r.key}</td>
                        <td className="px-3 py-2 text-right text-black">{r.total}</td>
                      </tr>
                    ))}
                    {byDepartment.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600" />
                By Project
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {byProject.map((r) => (
                      <tr key={r.key || r.projectId}>
                        <td className="px-3 py-2 text-black">{r.projectName ?? r.name ?? r.key}</td>
                        <td className="px-3 py-2 text-right text-black">{r.total}</td>
                      </tr>
                    ))}
                    {byProject.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                By Site / Location
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Site</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bySite.map((r) => (
                      <tr key={r.key || r.siteId}>
                        <td className="px-3 py-2 text-black">{r.siteName ?? r.name ?? r.key}</td>
                        <td className="px-3 py-2 text-right text-black">{r.total}</td>
                      </tr>
                    ))}
                    {bySite.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
