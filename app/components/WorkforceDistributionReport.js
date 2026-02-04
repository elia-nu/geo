"use client";

import React, { useState } from "react";
import {
  Users,
  Download,
  RefreshCw,
  BarChart3,
  MapPin,
} from "lucide-react";

export default function WorkForceDistributionReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
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
        `/api/reports/work-locations/workforce?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate workforce distribution report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Workforce Distribution by Site report generated.");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating workforce distribution report:", error);
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
      const payload = {
        format,
        sites: reportData.sites || [],
        summary: reportData.summary || {},
        filters: reportData.filters || {},
    };

      const res = await fetch(
        "/api/reports/work-locations/workforce/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || "Failed to export workforce distribution report"
          );
        }
        throw new Error("Failed to export workforce distribution report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workforce_distribution_sites_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Workforce distribution report exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting workforce distribution report:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-600" />
                <span>Workforce Distribution by Site</span>
              </h1>
              <p className="text-gray-600 mt-1">
                See how your workforce is distributed across sites, departments,
                and projects, with optional presence filtering.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>{loading ? "Generating..." : "Generate Report"}</span>
              </button>
              {reportData && (
                <>
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date (presence filter)
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (presence filter)
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                placeholder="Department (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={filters.projectId}
                onChange={(e) =>
                  setFilters({ ...filters, projectId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                placeholder="Project ID (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location ID
              </label>
              <input
                type="text"
                value={filters.locationId}
                onChange={(e) =>
                  setFilters({ ...filters, locationId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                placeholder="Work location ID (optional)"
              />
            </div>
          </div>

          {message && (
            <div
              className={`mt-2 p-3 rounded-lg text-sm ${
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
        </div>

        {/* Summary + Table */}
        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Total Sites
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalSites || 0}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-emerald-900">
                    Total Employees
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {summary.totalEmployees || 0}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    Present Employees
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.totalPresent || 0}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">
                    Avg Utilization
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {(summary.averageUtilization || 0).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Employees (present/total)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Departments
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.sites?.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="font-medium text-black">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.address || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-black">
                        {s.presentEmployees || 0} / {s.totalEmployees || 0}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800">
                          {(s.utilization || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs text-black">
                          {s.departments
                            ? Object.entries(s.departments)
                                .map(([name, count]) => `${name}: ${count}`)
                                .join(", ")
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs text-black">
                          {s.projects
                            ? Object.entries(s.projects)
                                .map(([name, count]) => `${name}: ${count}`)
                                .join(", ")
                            : "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Set optional presence filters and click &quot;Generate Report&quot;
              to view workforce distribution by site.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

