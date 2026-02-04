"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  RefreshCw,
  Filter,
  User,
  FolderTree,
  Building2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function DocumentInventoryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({
    type: "",
    ownerId: "",
    department: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();

      if (filters.type) params.set("type", filters.type);
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.department) params.set("department", filters.department);
      if (filters.status) params.set("status", filters.status);
      if (filters.startDate && filters.endDate) {
        params.set("startDate", filters.startDate);
        params.set("endDate", filters.endDate);
      }

      const response = await fetch(
        `/api/reports/documents/inventory?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate document inventory");
      }

      const data = await response.json();
      setReportData(data);
      setMessage("Document inventory generated successfully");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating document inventory report:", error);
      setMessage(error.message || "Failed to generate document inventory");
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
        documents: reportData.documents || [],
        summary: reportData.summary || {},
        filters: reportData.filters || {},
      };

      const response = await fetch(
        "/api/reports/documents/inventory/export",
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
          throw new Error(err.error || "Failed to export document inventory");
        }
        throw new Error("Failed to export document inventory");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document_inventory_report_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`Document inventory exported as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting document inventory report:", error);
      setMessage(error.message || "Failed to export document inventory");
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
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <span>Document Inventory Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Complete inventory of all documents by type, owner, project,
                department, and status
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
                Type
              </label>
              <input
                type="text"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                placeholder="contract, report..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner (Employee ID)
              </label>
              <input
                type="text"
                value={filters.ownerId}
                onChange={(e) =>
                  setFilters({ ...filters, ownerId: e.target.value })
                }
                placeholder="Employee ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-sm"
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
                placeholder="Department name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-sm"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Upload Date Range
              </label>
              <div className="flex space-x-1">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-xs"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black text-xs"
                />
              </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Total Documents
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {summary.total || 0}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">
                  Unique Owners
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {Object.keys(summary.byOwner || {}).length}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">
                  Departments
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(summary.byDepartment || {}).length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FolderTree className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">
                  Types & Statuses
                </span>
              </div>
              <p className="text-sm text-orange-800">
                {Object.keys(summary.byType || {}).length} types,{" "}
                {Object.keys(summary.byStatus || {}).length} statuses
              </p>
            </div>
          </div>
        )}

        {/* Inventory table */}
        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-black mb-4">
              Documents
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.documents?.map((doc) => {
                    const uploadDate = doc.uploadDate
                      ? new Date(doc.uploadDate).toLocaleDateString()
                      : "";
                    const expiryDate = doc.expiryDate
                      ? new Date(doc.expiryDate).toLocaleDateString()
                      : "";

                    const statusLabel = (doc.status || "").toLowerCase();
                    let statusClass =
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ";
                    if (statusLabel === "draft") {
                      statusClass += "bg-gray-100 text-gray-800";
                    } else if (statusLabel === "approved") {
                      statusClass += "bg-emerald-100 text-emerald-800";
                    } else if (statusLabel === "expired") {
                      statusClass += "bg-red-100 text-red-800";
                    } else if (statusLabel === "archived") {
                      statusClass += "bg-yellow-100 text-yellow-800";
                    } else {
                      statusClass += "bg-blue-100 text-blue-800";
                    }

                    return (
                      <tr key={doc.documentId || doc._id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="font-medium text-black">
                            {doc.title || doc.originalName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {doc.documentId}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {doc.normalizedType || doc.documentType}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-black">
                            {doc.ownerName || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {doc.ownerEmail}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {doc.ownerDepartment}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {Array.isArray(doc.projectNames) &&
                          doc.projectNames.length > 0
                            ? doc.projectNames.join(", ")
                            : "—"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={statusClass}>
                            {statusLabel || "active"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {uploadDate}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-black">
                          {expiryDate || "No Expiry"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Click &quot;Generate Report&quot; to view the document inventory
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

