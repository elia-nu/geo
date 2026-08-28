"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
  MapPin,
  Camera,
  IdCard,
  Sparkles,
  Search,
  Filter,
  X,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { formatWorkingHours } from "../utils/timeUtils";

export default function AttendanceReporting() {
  const [currentReport, setCurrentReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Table search & pagination inside report
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Report generation form state
  const [reportForm, setReportForm] = useState({
    reportType: "daily",
    startDate: "",
    endDate: "",
    employeeId: "",
    department: "",
    includePhotos: false,
    includeLocationData: true,
  });

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDatesForReportType = (reportType) => {
    const today = new Date();
    let startDate, endDate;

    switch (reportType) {
      case "daily":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "weekly": {
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(today);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      }
      case "monthly":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "random":
        return { startDate: "", endDate: "" };
      default:
        startDate = new Date(today);
        endDate = new Date(today);
    }

    return {
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
    };
  };

  useEffect(() => {
    if (reportForm.reportType !== "random") {
      const dates = getDatesForReportType(reportForm.reportType);
      setReportForm((prev) => ({
        ...prev,
        startDate: dates.startDate,
        endDate: dates.endDate,
      }));
    }
  }, [reportForm.reportType]);

  const handleGenerateReport = async () => {
    if (!reportForm.startDate || !reportForm.endDate) {
      showMessage("Start date and end date are required", "error");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/attendance/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...reportForm,
          employeeId: reportForm.employeeId.trim(),
          adminId: "admin",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentReport(result.data);
        setCurrentPage(1);
        setTableSearch("");
        showMessage(result.message || "Report generated successfully", "success");
        setShowGenerateModal(false);
      } else {
        showMessage(result.error || "Failed to generate report", "error");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      showMessage("Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!currentReport) {
      showMessage("No report to export", "error");
      return;
    }

    setExporting(true);
    try {
      const response = await fetch("/api/attendance/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentReport),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        let fileName = `attendance_report_${currentReport.startDate}_to_${currentReport.endDate}.xlsx`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage("Report exported to Excel successfully", "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        showMessage(errorData.error || "Failed to export report", "error");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      showMessage("Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearCurrentReport = () => {
    setCurrentReport(null);
    setTableSearch("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (d) =>
    d
      ? new Date(d).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

  // Filtered records in current report
  const records = currentReport?.records || [];
  const filteredRecords = useMemo(() => {
    if (!tableSearch) return records;
    const s = tableSearch.toLowerCase().trim();
    return records.filter((r) => {
      const name = (r.employeeName || "").toLowerCase();
      const email = (r.employeeEmail || "").toLowerCase();
      const dept = (r.department || "").toLowerCase();
      const empId = String(r.employeeId || r.employeeCode || "").toLowerCase();
      const loc = (r.workLocationName || "").toLowerCase();
      return (
        name.includes(s) ||
        email.includes(s) ||
        dept.includes(s) ||
        empId.includes(s) ||
        loc.includes(s)
      );
    });
  }, [records, tableSearch]);

  const totalPages = Math.ceil((filteredRecords.length || 0) / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 shadow-2xl text-white border border-indigo-900/40">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Attendance Reports &amp; Analytics
                </h2>
                <p className="text-indigo-200/90 text-xs sm:text-sm">
                  Generate daily, weekly, monthly and custom timesheet reports with Employee ID search.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setReportForm((p) => ({ ...p, reportType: "daily" }));
                  setShowGenerateModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                Daily Report
              </button>
              <button
                onClick={() => {
                  setReportForm((p) => ({ ...p, reportType: "weekly" }));
                  setShowGenerateModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                Weekly Report
              </button>
              <button
                onClick={() => {
                  setReportForm((p) => ({ ...p, reportType: "monthly" }));
                  setShowGenerateModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                Monthly Report
              </button>
              <button
                onClick={() => {
                  setReportForm((p) => ({ ...p, reportType: "random" }));
                  setShowGenerateModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                Custom Date Range
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-indigo-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center gap-2 ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Current Report Display */}
      {currentReport && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                  {currentReport.reportType} Report
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {formatDate(currentReport.startDate)} — {formatDate(currentReport.endDate)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Generated across {currentReport.summary?.uniqueEmployees || 0} unique employees
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToExcel}
                disabled={exporting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                {exporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export to Excel</span>
              </button>
              <button
                onClick={clearCurrentReport}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear Report
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Records</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                {currentReport.summary?.totalRecords || 0}
              </div>
            </div>
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-center">
              <div className="text-xs text-indigo-500 font-semibold uppercase">Employees</div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1">
                {currentReport.summary?.uniqueEmployees || 0}
              </div>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-center">
              <div className="text-xs text-emerald-600 font-semibold uppercase">Check-ins</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
                {currentReport.summary?.totalCheckIns || 0}
              </div>
            </div>
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-center">
              <div className="text-xs text-blue-600 font-semibold uppercase">Check-outs</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
                {currentReport.summary?.totalCheckOuts || 0}
              </div>
            </div>
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-center">
              <div className="text-xs text-purple-600 font-semibold uppercase">Face Verified</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-700 mt-1">
                {currentReport.summary?.totalFaceVerified || 0}
              </div>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-center">
              <div className="text-xs text-amber-600 font-semibold uppercase">Avg Hours</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
                {currentReport.summary?.averageWorkingHours || "0.0"}h
              </div>
            </div>
          </div>

          {/* Detailed Records Table */}
          <div className="border border-slate-100 rounded-3xl overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-800">
                  Report Records Breakdown ({filteredRecords.length} entries)
                </h4>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filter records in report..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Emp ID</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Check In</th>
                    <th className="px-5 py-3.5">Check Out</th>
                    <th className="px-5 py-3.5 text-center">Hours</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5 text-center">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                        No records match the current report search filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, i) => (
                      <tr key={r._id || i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-slate-900">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{r.employeeName}</div>
                          <div className="text-slate-400 text-[11px]">{r.employeeEmail}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <IdCard className="w-3 h-3 text-slate-400" />
                            {r.employeeCode || r.employeeId || "EMP—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {r.department || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-emerald-700 font-bold">
                          {formatTime(r.checkInTime)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600">
                          {formatTime(r.checkOutTime)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-center font-bold text-indigo-700">
                          {formatWorkingHours(r)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {r.workLocationName || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.faceVerified
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {r.faceVerified ? "Verified ✓" : "Standard"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-100 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRecords.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(sz) => {
                  setItemsPerPage(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-indigo-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Generate Attendance Report</h3>
                  <p className="text-xs text-indigo-200">Configure parameters &amp; date bounds</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Report Type
                </label>
                <select
                  value={reportForm.reportType}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      reportType: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="daily">Daily Report (Today)</option>
                  <option value="weekly">Weekly Report (Current Week)</option>
                  <option value="monthly">Monthly Report (Current Month)</option>
                  <option value="random">Custom Date Range</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={reportForm.startDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={reportForm.endDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Employee ID (Optional filter)
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="e.g. EMP-001 or Mongo ID"
                    value={reportForm.employeeId}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        employeeId: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, HR, Operations"
                  value={reportForm.department}
                  onChange={(e) =>
                    setReportForm((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportForm.includePhotos}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        includePhotos: e.target.checked,
                      }))
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="ml-2 text-xs font-semibold text-slate-700">
                    Include Biometric Photos
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportForm.includeLocationData}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        includeLocationData: e.target.checked,
                      }))
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="ml-2 text-xs font-semibold text-slate-700">
                    Include GPS Coordinates
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-500 hover:to-purple-500 font-bold text-sm shadow-md shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Analytics...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="py-3 px-5 border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-100 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
