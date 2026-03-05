"use client";

import React, { useState } from "react";
import {
  Shield,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Key,
  FileText,
} from "lucide-react";

export default function RolePermissionAuditReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeTab, setActiveTab] = useState("roles"); // roles, summary

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const response = await fetch("/api/reports/organization/roles-permissions", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      setReportData(data);
      setMessage("Report generated successfully");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating report:", error);
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) {
      setMessage("Please generate a report first");
      setMessageType("error");
      return;
    }

    setExporting(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      
      const exportData = {
        format,
        roles: reportData.roles,
        summary: reportData.summary,
      };

      const response = await fetch(
        "/api/reports/organization/roles-permissions/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(exportData),
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to export report");
        } else {
          throw new Error("Failed to export report");
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `role_audit_report_${new Date()
        .toISOString()
        .split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`Report exported successfully as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting report:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <span>Role Audit Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Audit roles, system privileges, and assigned users across the organization.
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

          {message && (
            <div
              className={`p-3 rounded-lg ${
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

        {/* Summary Cards */}
        {reportData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Roles</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.summary.totalRoles || 0}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {reportData.summary.totalUsers || 0}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Key className="w-5 h-5 text-gray-700" />
                <span className="font-medium text-black">Total Permissions</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">
                {reportData.summary.totalPermissions || 0}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        {reportData && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("roles")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "roles"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Roles & Permissions
                </button>
                <button
                  onClick={() => setActiveTab("summary")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "summary"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Summary Statistics
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Roles & Permissions Tab */}
              {activeTab === "roles" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-black mb-4">
                    Roles & Permissions
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Permissions
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.roles?.map((role, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-black">
                                  {role.role}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {role.roleDisplayName}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-black">
                                {role.totalUsers || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="text-sm text-black space-y-1 max-w-md">
                                <div className="font-medium">
                                  Actual ({role.actualPermissions?.length || 0})
                                </div>
                                {role.actualPermissions && role.actualPermissions.length > 0 && (
                                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                                    {role.actualPermissions.map((perm, i) => (
                                      <li key={i}>{perm}</li>
                                    ))}
                                  </ul>
                                )}
                                {role.hasExcessivePermissions && role.excessivePermissions?.length > 0 && (
                                  <div className="text-red-600 text-xs">
                                    Excessive ({role.excessivePermissions.length}):
                                    {" "}
                                    {role.excessivePermissions.join(", ")}
                                  </div>
                                )}
                                {role.hasMissingPermissions && role.missingPermissions?.length > 0 && (
                                  <div className="text-orange-600 text-xs">
                                    Missing ({role.missingPermissions.length}):
                                    {" "}
                                    {role.missingPermissions.join(", ")}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {role.hasExcessivePermissions && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Excessive
                                  </span>
                                )}
                                {role.hasMissingPermissions && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Missing
                                  </span>
                                )}
                                {!role.hasExcessivePermissions &&
                                  !role.hasMissingPermissions && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      OK
                                    </span>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary Statistics Tab */}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-black mb-4">
                    Summary Statistics
                  </h2>

                  {/* By Role */}
                  {reportData.summary?.byRole && (
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-3">
                        By Role
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Users
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Permissions
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Excessive
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Missing
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(reportData.summary.byRole).map(
                              ([role, data], idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                                    {role}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {data.users || 0}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {data.permissions || 0}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {data.excessivePermissions || 0}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                                    {data.missingPermissions || 0}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!reportData && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Click "Generate Report" to view the role & permission audit
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
