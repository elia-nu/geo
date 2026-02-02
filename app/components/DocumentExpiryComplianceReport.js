"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  ShieldCheck,
  Clock,
  Bell,
} from "lucide-react";

export default function DocumentExpiryComplianceReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    days: 30,
  });

  const handleGenerateReport = async (opts = { triggerAlerts: false }) => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.days) params.set("days", String(filters.days));
      if (opts.triggerAlerts) params.set("triggerAlerts", "true");

      const response = await fetch(
        `/api/reports/documents/expiry?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate expiry & compliance report"
        );
      }

      const data = await response.json();
      setReportData(data);

      if (opts.triggerAlerts) {
        setMessage(
          "Report generated and admin alerts triggered (where applicable)."
        );
      } else {
        setMessage("Document expiry & compliance report generated.");
      }
      setMessageType("success");
    } catch (error) {
      console.error("Error generating document expiry report:", error);
      setMessage(error.message || "Failed to generate expiry report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) {
      setMessage("Please generate the report first");
      setMessageType("error");
      return;
    }

    setExporting(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");

      const payload = {
        format,
        summary: reportData.summary || {},
        expiring: reportData.expiring || [],
        expired: reportData.expired || [],
        params: reportData.params || {},
      };

      const response = await fetch(
        "/api/reports/documents/expiry/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.error ||
              "Failed to export document expiry & compliance report"
          );
        }
        throw new Error("Failed to export document expiry & compliance report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document_expiry_compliance_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Document expiry & compliance report exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting document expiry report:", error);
      setMessage(error.message || "Failed to export expiry report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
                <span>Document Expiry & Compliance Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Track contracts, insurance, and certifications nearing
                expiration and trigger admin alerts
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleGenerateReport({ triggerAlerts: false })}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>{loading ? "Generating..." : "Generate Report"}</span>
              </button>
              <button
                onClick={() => handleGenerateReport({ triggerAlerts: true })}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <Bell className="w-4 h-4" />
                <span>Generate + Alerts</span>
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

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Window (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={filters.days}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    days: parseInt(e.target.value || "30", 10),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Show documents expiring within this many days.
              </p>
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

        {/* Summary cards */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">
                  Expiring Soon
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {summary.totalExpiring || 0}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Within {reportData.params?.days || filters.days} days
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Expired</span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {summary.totalExpired || 0}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Last 90 days (for quick remediation)
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Types & Departments
                </span>
              </div>
              <p className="text-sm text-blue-800">
                {Object.keys(summary.byType || {}).length} types in{" "}
                {Object.keys(summary.byDepartment || {}).length} departments
              </p>
            </div>
          </div>
        )}

        {/* Detail tables */}
        {reportData ? (
          <div className="space-y-6">
            {/* Expiring soon */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Expiring Soon</span>
              </h2>
              {reportData.expiring && reportData.expiring.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Days Left
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.expiring.map((item) => (
                        <tr key={item.documentId}>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.type}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.title}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-gray-900">
                              {item.ownerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.ownerEmail}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.ownerDepartment}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.expiryDate
                              ? new Date(
                                  item.expiryDate
                                ).toLocaleDateString()
                              : ""}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-amber-700 font-medium">
                            {item.daysUntilExpiry}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No documents found that are expiring within the selected
                  window.
                </p>
              )}
            </div>

            {/* Expired */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Expired</span>
              </h2>
              {reportData.expired && reportData.expired.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Expiry Date
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Days Since Expiry
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.expired.map((item) => (
                        <tr key={item.documentId}>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.type}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.title}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-gray-900">
                              {item.ownerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.ownerEmail}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.ownerDepartment}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {item.expiryDate
                              ? new Date(
                                  item.expiryDate
                                ).toLocaleDateString()
                              : ""}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-red-700 font-medium">
                            {Math.abs(item.daysUntilExpiry ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No expired documents found in the last 90 days.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <ShieldCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Click &quot;Generate Report&quot; to view document expiry and
              compliance status
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

