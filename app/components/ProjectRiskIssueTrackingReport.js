"use client";

import React, { useState } from "react";
import { Download, RefreshCw, AlertTriangle, Clock, Users, Shield, Zap } from "lucide-react";

export default function ProjectRiskIssueTrackingReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [filters, setFilters] = useState({ projectId: "", type: "" });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.type) params.set("type", filters.type);

      const res = await fetch(`/api/reports/projects/risk-issue-tracking?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Project Risk & Issue Tracking report generated.");
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
    const all = [
      ...(reportData.delays || []).map((d) => ({ ...d, category: "delay" })),
      ...(reportData.resourceShortages || []).map((d) => ({ ...d, category: "resource" })),
      ...(reportData.complianceBreaches || []).map((d) => ({ ...d, category: "compliance" })),
      ...(reportData.escalations || []).map((d) => ({ ...d, category: "escalation" })),
    ];
    const rows = [
      ["Project", "Category", "Type", "Message", "Status", "Priority", "Created"],
      ...all.map((r) => [r.projectName, r.category, r.alertType, r.message, r.status, r.priority, r.createdAt]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project_risk_issue_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const summary = reportData?.summary || {};
  const delays = reportData?.delays || [];
  const resourceShortages = reportData?.resourceShortages || [];
  const complianceBreaches = reportData?.complianceBreaches || [];
  const escalations = reportData?.escalations || [];

  const sections = [
    { id: "delays", title: "Delays", icon: Clock, items: delays, color: "amber" },
    { id: "resource", title: "Resource Shortages", icon: Users, items: resourceShortages, color: "red" },
    { id: "compliance", title: "Compliance Breaches", icon: Shield, items: complianceBreaches, color: "red" },
    { id: "escalations", title: "Escalations", icon: Zap, items: escalations, color: "red" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Project Risk & Issue Tracking Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Delays, resource shortages, compliance breaches, escalations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
          >
            <option value="">All</option>
            <option value="delay">Delays</option>
            <option value="resource">Resource Shortages</option>
            <option value="compliance">Compliance Breaches</option>
            <option value="escalation">Escalations</option>
          </select>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-medium text-gray-900">Total Alerts</div>
              <p className="text-2xl font-bold text-gray-700">{summary.totalAlerts ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-amber-900">
                <Clock className="w-5 h-5 text-amber-600" />
                Delays
              </div>
              <p className="text-2xl font-bold text-amber-600">{summary.delays ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-red-900">
                <Users className="w-5 h-5 text-red-600" />
                Resource
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.resourceShortages ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-red-900">
                <Shield className="w-5 h-5 text-red-600" />
                Compliance
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.complianceBreaches ?? 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium text-red-900">
                <Zap className="w-5 h-5 text-red-600" />
                Escalations
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.escalations ?? 0}</p>
            </div>
          </div>

          {sections.map(({ id, title, icon: Icon, items, color }) => (
            <div key={id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 px-4 py-3 border-b flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-600" />
                {title} ({items.length})
              </h3>
              {items.length === 0 ? (
                <p className="px-4 py-6 text-gray-500 text-sm">No items</p>
              ) : (
                <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {items.map((item, i) => (
                    <li key={item.alertId || i} className="px-4 py-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{item.projectName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          item.priority === "high" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.message}</p>
                      <p className="text-xs text-gray-500">{item.alertType} • {item.status}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
