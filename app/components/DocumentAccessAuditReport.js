"use client";

import React, { useState } from "react";
import {
  Search,
  Download,
  RefreshCw,
  Activity,
  UserSearch,
  FileText,
} from "lucide-react";

export default function DocumentAccessAuditReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    documentId: "",
    actorId: "",
    ownerId: "",
    action: "",
    department: "",
    type: "",
    startDate: "",
    endDate: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
      });

      const res = await fetch(
        `/api/reports/documents/access?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate document access audit report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Document access & activity audit report generated.");
      setMessageType("success");
    } catch (e) {
      console.error(e);
      setMessage(e.message || "Failed to generate audit report");
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
        events: reportData.events || [],
        summary: reportData.summary || {},
        filters: reportData.filters || {},
      };

      const res = await fetch(
        "/api/reports/documents/access/export",
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
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || "Failed to export document access audit report"
          );
        }
        throw new Error("Failed to export document access audit report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document_access_audit_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`Audit report exported as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (e) {
      console.error(e);
      setMessage(e.message || "Failed to export audit report");
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
                <Activity className="w-8 h-8 text-blue-600" />
                <span>Document Access & Activity Audit</span>
              </h1>
              <p className="text-gray-600 mt-1">
                See who viewed, downloaded, edited, or deleted documents, with
                timestamps and IP/device info.
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document ID
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.documentId}
                onChange={(e) =>
                  setFilters({ ...filters, documentId: e.target.value })
                }
                placeholder="Document _id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actor (User ID / Email)
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.actorId}
                onChange={(e) =>
                  setFilters({ ...filters, actorId: e.target.value })
                }
                placeholder="User id or email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner (Employee ID)
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.ownerId}
                onChange={(e) =>
                  setFilters({ ...filters, ownerId: e.target.value })
                }
                placeholder="Owner employeeId"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.action}
                onChange={(e) =>
                  setFilters({ ...filters, action: e.target.value })
                }
              >
                <option value="">All</option>
                <option value="view">View</option>
                <option value="download">Download</option>
                <option value="update">Edit/Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                placeholder="Department name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                placeholder="contract, report..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
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

        {/* Summary cards */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Total Events</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {summary.totalEvents || 0}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <UserSearch className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">
                  Unique Users
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {Object.keys(summary.byUser || {}).length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">
                  Unique Documents
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(summary.byDocument || {}).length}
              </p>
            </div>
          </div>
        )}

        {/* Activity table */}
        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Activity Events
            </h2>
            {reportData.events && reportData.events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Document
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Owner / Dept
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                        IP / Device
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.events.map((ev) => {
                      const ts = ev.timestamp
                        ? new Date(ev.timestamp).toLocaleString()
                        : "";
                      return (
                        <tr key={ev.id}>
                          <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                            {ts}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap capitalize text-gray-900">
                            {ev.action}
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-gray-900">
                              {ev.documentTitle || "Unknown document"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ev.documentType} • {ev.documentId}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-gray-900">
                              {ev.ownerName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ev.ownerDepartment}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-gray-900">
                              {ev.actorEmail || ev.actorId || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ev.actorRole}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-gray-900">{ev.ip}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {ev.device || ev.userAgent}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No audit events found for the selected filters.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Set filters and click &quot;Generate Report&quot; to see document
              access and activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

