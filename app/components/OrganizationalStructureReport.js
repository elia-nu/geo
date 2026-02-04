"use client";

import React, { useState } from "react";
import {
  Building2,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  MapPin,
  UserCheck,
  FileText,
} from "lucide-react";

export default function OrganizationalStructureReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const response = await fetch("/api/reports/organization/structure", {
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
      // Reset expanded nodes; user can expand departments as needed
      setExpandedNodes(new Set());
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
      
      // Serialize data for export
      const exportData = {
        format,
        hierarchy: reportData.hierarchy,
        summary: reportData.summary,
      };

      const response = await fetch(
        "/api/reports/organization/structure/export",
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
      a.download = `organizational_structure_report_${new Date()
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

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderHierarchy = () => {
    if (!reportData?.hierarchy) return null;

    const { company, divisions } = reportData.hierarchy;

    // Flatten all departments across divisions; we don't show divisions in the UI
    const allDepartments = [];
    if (Array.isArray(divisions)) {
      divisions.forEach((division) => {
        if (Array.isArray(division.departments)) {
          division.departments.forEach((dept) => {
            allDepartments.push(dept);
          });
        }
      });
    }

    return (
      <div className="space-y-4">
        {/* Company Level */}
        <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-blue-900">{company}</h3>
          </div>
        </div>

        {/* Departments (no division level) */}
        {allDepartments.map((department, idx) => {
          const deptNodeId = `dept-${department.id || idx}`;
          const isDeptExpanded = expandedNodes.has(deptNodeId);

          return (
            <div
              key={department.id || idx}
              className="border border-gray-200 rounded-lg bg-white"
            >
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleNode(deptNodeId)}
              >
                <div className="flex items-center space-x-2">
                  {isDeptExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-800">
                    {department.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({department.employeeCount || 0} employees)
                  </span>
                </div>
              </div>

              {isDeptExpanded && (
                <div className="p-3 space-y-2 border-t border-gray-100">
                  {/* Units */}
                  {department.units?.map((unit, unitIdx) => (
                    <div
                      key={unitIdx}
                      className="border border-gray-200 rounded p-2 bg-gray-50"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {unit.name}
                        </span>
                      </div>

                      {/* Roles */}
                      {unit.roles?.map((role, roleIdx) => (
                        <div
                          key={roleIdx}
                          className="ml-6 mb-2 border-l-2 border-blue-200 pl-3"
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            <UserCheck className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-gray-700">
                              {role.name}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({role.employees?.length || 0})
                            </span>
                          </div>

                          {/* Employees */}
                          {role.employees && role.employees.length > 0 && (
                            <div className="ml-4 space-y-1">
                              {role.employees.map((emp, empIdx) => (
                                <div
                                  key={empIdx}
                                  className="text-sm text-gray-600 flex items-center space-x-2"
                                >
                                  <span>•</span>
                                  <span>{emp.name}</span>
                                  <span className="text-gray-400">
                                    ({emp.email})
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      emp.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {emp.status || "active"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <Building2 className="w-8 h-8 text-blue-600" />
                <span>Organizational Structure Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Complete organizational hierarchy tree view
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Divisions</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {reportData.summary.totalDivisions || 0}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Departments</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {reportData.summary.totalDepartments || 0}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">Units</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {reportData.summary.totalUnits || 0}
              </p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <UserCheck className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Roles</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {reportData.summary.totalRoles || 0}
              </p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Employees</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {reportData.summary.totalEmployees || 0}
              </p>
            </div>
          </div>
        )}

        {/* Hierarchy Tree */}
        {reportData ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-black mb-4">
              Organizational Hierarchy
            </h2>
            {renderHierarchy()}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Click "Generate Report" to view the organizational structure
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
