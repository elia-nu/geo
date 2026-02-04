"use client";

import React, { useState } from "react";
import { Download, RefreshCw, Shield, ClipboardCheck, FileCheck, FolderOpen } from "lucide-react";

export default function ComplianceAuditReadinessReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ startDate: startOfMonth, endDate: endOfMonth });

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/reports/executive/compliance-audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Compliance & Audit Readiness report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const attendanceVerificationLogs = reportData?.attendanceVerificationLogs || [];
  const payrollApprovalTrails = reportData?.payrollApprovalTrails || [];
  const leaveApprovals = reportData?.leaveApprovals || [];
  const leaveApprovalDocuments = reportData?.leaveApprovalDocuments || [];
  const documentAccessRecords = reportData?.documentAccessRecords || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Compliance & Audit Readiness Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Attendance verification logs, payroll approval trails, leave approvals, document access records.
          </p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Attendance Verification</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{summary.attendanceVerificationCount ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Payroll Approval</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{summary.payrollApprovalCount ?? 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Leave Approvals</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{summary.leaveApprovalCount ?? 0}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Document Access</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{summary.documentAccessCount ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b">Attendance Verification Logs</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceVerificationLogs.slice(0, 15).map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-black">{e.userEmail ?? e.userId ?? "—"}</td>
                        <td className="px-3 py-2 capitalize text-black">{e.action ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b">Document Access Records</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentAccessRecords.slice(0, 15).map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-black">{e.userEmail ?? e.userId ?? "—"}</td>
                        <td className="px-3 py-2 text-black">{e.action ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {(leaveApprovals.length > 0 || leaveApprovalDocuments.length > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b">Leave Approvals</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Time / Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Type / User</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveApprovalDocuments.slice(0, 15).map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{e.updatedAt ? new Date(e.updatedAt).toLocaleString() : e.submittedAt ? new Date(e.submittedAt).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-black">{e.leaveType ?? e.employeeId ?? "—"}</td>
                        <td className="px-3 py-2 capitalize text-black">{e.status ?? "—"}</td>
                      </tr>
                    ))}
                    {leaveApprovals.slice(0, 10).map((e, i) => (
                      <tr key={`a-${i}`}>
                        <td className="px-3 py-2 text-gray-700">{e.timestamp ? new Date(e.timestamp).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-black">{e.userEmail ?? e.userId ?? "—"}</td>
                        <td className="px-3 py-2 capitalize text-black">{e.action ?? "—"}</td>
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
