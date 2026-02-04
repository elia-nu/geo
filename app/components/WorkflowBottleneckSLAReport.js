"use client";

import React, { useState } from "react";
import { RefreshCw, AlertTriangle, Clock, Calendar, Briefcase, DollarSign } from "lucide-react";

export default function WorkflowBottleneckSLAReport() {
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

      const res = await fetch(`/api/reports/executive/workflow-bottlenecks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setMessage("Workflow Bottleneck & SLA Breach report generated.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const summary = reportData?.summary || {};
  const bottlenecks = reportData?.bottlenecks || [];
  const leaveSummary = summary.leave || {};
  const payrollSummary = summary.payroll || {};
  const tasksSummary = summary.tasks || {};
  const leaveDelays = reportData?.leaveDelays || [];
  const taskDelays = reportData?.taskDelays || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Workflow Bottleneck & SLA Breach Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Delays in leave approvals, payroll processing, project task closures. Root cause analysis.
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-900">Leave Approvals</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{leaveSummary.totalRequests ?? 0}</p>
              <p className="text-sm text-emerald-700">Approved/Rejected: {leaveSummary.approvedOrRejected ?? 0} • Pending: {leaveSummary.pending ?? 0}</p>
              <p className="text-sm text-amber-700 font-medium">SLA breaches: {leaveSummary.breaches ?? 0} (SLA: {leaveSummary.slaHours ?? 48}h)</p>
              {leaveSummary.avgHoursToDecision != null && (
                <p className="text-xs text-gray-600">Avg time to decision: {leaveSummary.avgHoursToDecision}h</p>
              )}
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Payroll Processing</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{payrollSummary.periodsAnalyzed ?? 0}</p>
              <p className="text-sm text-amber-700">Periods analyzed • Breaches: {payrollSummary.breaches ?? 0}</p>
              <p className="text-xs text-gray-600">Grace: {payrollSummary.graceDays ?? 5} days after month-end</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Project Tasks</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600">{tasksSummary.totalTasks ?? 0}</p>
              <p className="text-sm text-indigo-700">Completed: {tasksSummary.completed ?? 0} • Overdue: {tasksSummary.overdue ?? 0}</p>
              {tasksSummary.avgHoursOpen != null && (
                <p className="text-xs text-gray-600">Avg hours open: {tasksSummary.avgHoursOpen}h</p>
              )}
            </div>
          </div>

          {bottlenecks.length > 0 && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Root cause analysis (bottlenecks)
              </h3>
              <ul className="space-y-3">
                {bottlenecks.map((b, i) => (
                  <li key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                    <span className="font-medium text-black">{b.area}</span>
                    <p className="text-sm text-gray-700 mt-1">{b.indicator}</p>
                    {b.probableCauses && b.probableCauses.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                        {b.probableCauses.map((c, j) => (
                          <li key={j}>{c}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {leaveDelays.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b">Leave approval delays (sample)</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Processed</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Hours to decision</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">SLA breach</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveDelays.slice(0, 50).map((d, i) => (
                      <tr key={d.id || i}>
                        <td className="px-3 py-2 capitalize text-black">{d.status ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{d.submittedAt ? new Date(d.submittedAt).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{d.processedAt ? new Date(d.processedAt).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-right text-black">{d.hoursToDecision != null ? d.hoursToDecision.toFixed(1) : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {d.breached ? <span className="text-amber-600 font-medium">Yes</span> : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {taskDelays.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <h3 className="text-sm font-semibold text-black px-4 py-3 border-b">Task closure delays (sample)</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Due</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Hours open</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskDelays.slice(0, 50).map((d, i) => (
                      <tr key={d.id || i}>
                        <td className="px-3 py-2 text-black truncate max-w-[200px]" title={d.title}>{d.title ?? "—"}</td>
                        <td className="px-3 py-2 capitalize text-black">{d.status ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-700">{d.dueDate ? new Date(d.dueDate).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-right text-black">{d.hoursOpen != null ? d.hoursOpen.toFixed(0) : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {d.overdue ? <span className="text-amber-600 font-medium">Yes</span> : "No"}
                        </td>
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
