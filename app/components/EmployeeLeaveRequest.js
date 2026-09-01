"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Send,
  Trash2,
  Search,
  RefreshCw,
  Download,
  Paperclip,
  X,
  Sparkles,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function EmployeeLeaveRequest({ employeeId, employeeName }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [statusTab, setStatusTab] = useState("all"); // all, pending, approved, rejected
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "annual",
    startDate: "",
    endDate: "",
    reason: "",
    documents: [],
  });

  useEffect(() => {
    if (employeeId) {
      fetchLeaveRequests();
    }
  }, [employeeId]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/documents?employeeId=${employeeId}&type=leave`
      );
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        // Sort descending by createdAt or submittedAt
        const sorted = result.data.sort(
          (a, b) =>
            new Date(b.submittedAt || b.createdAt || 0) -
            new Date(a.submittedAt || a.createdAt || 0)
        );
        setLeaveRequests(sorted);
      } else {
        setLeaveRequests([]);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      showMessage("Failed to load leave requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ...files],
    }));
  };

  const removeFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e - s;
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.leaveType ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.reason.trim()
    ) {
      showMessage("Please fill in all required fields", "error");
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      showMessage("End date must be on or after start date", "error");
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      submitData.append("employeeId", employeeId);
      submitData.append("type", "leave");
      submitData.append("leaveType", formData.leaveType);
      submitData.append("startDate", formData.startDate);
      submitData.append("endDate", formData.endDate);
      submitData.append("reason", formData.reason);

      // Add documents
      formData.documents.forEach((file) => {
        submitData.append("documents", file);
      });

      const response = await fetch("/api/attendance/documents", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        showMessage("Leave request submitted successfully! Awaiting approval.", "success");
        setShowForm(false);
        setFormData({
          leaveType: "annual",
          startDate: "",
          endDate: "",
          reason: "",
          documents: [],
        });
        setCurrentPage(1);
        fetchLeaveRequests();
      } else {
        showMessage(result.error || "Failed to submit leave request", "error");
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showMessage("Failed to submit leave request", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "approved":
        return {
          text: "Approved",
          color: "text-emerald-700 dark:text-emerald-300",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
          icon: CheckCircle,
        };
      case "rejected":
        return {
          text: "Rejected",
          color: "text-rose-700 dark:text-rose-300",
          bgColor: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
          icon: XCircle,
        };
      case "pending":
        return {
          text: "Pending",
          color: "text-amber-700 dark:text-amber-300",
          bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
          icon: Clock,
        };
      default:
        return {
          text: "Unknown",
          color: "text-slate-700 dark:text-slate-300",
          bgColor: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
          icon: AlertCircle,
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Metrics
  const totalCount = leaveRequests.length;
  const pendingCount = leaveRequests.filter((r) => r.status === "pending").length;
  const approvedCount = leaveRequests.filter((r) => r.status === "approved").length;
  const rejectedCount = leaveRequests.filter((r) => r.status === "rejected").length;

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((request) => {
      // Tab filter
      if (statusTab !== "all" && request.status !== statusTab) return false;

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const reasonMatch = request.reason?.toLowerCase().includes(q);
        const typeMatch = request.leaveType?.toLowerCase().includes(q);
        const dateMatch =
          request.startDate?.includes(q) || request.endDate?.includes(q);
        if (!reasonMatch && !typeMatch && !dateMatch) return false;
      }

      return true;
    });
  }, [leaveRequests, statusTab, searchTerm]);

  // Paginated records
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const leaveFormDays = calculateDays(formData.startDate, formData.endDate);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Leave Requests
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                Submit, manage, and track the status of your annual, sick, and personal leave requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>{showForm ? "Hide Form" : "New Request"}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div
            onClick={() => {
              setStatusTab("all");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "all"
                ? "bg-white/25 border border-white/40 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-blue-200 font-medium">Total Requests</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">{totalCount}</div>
          </div>

          <div
            onClick={() => {
              setStatusTab("pending");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "pending"
                ? "bg-amber-400/30 border border-amber-300/50 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-amber-200 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-300" /> Pending
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-200 mt-0.5">{pendingCount}</div>
          </div>

          <div
            onClick={() => {
              setStatusTab("approved");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "approved"
                ? "bg-emerald-400/30 border border-emerald-300/50 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-emerald-200 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-300" /> Approved
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-200 mt-0.5">{approvedCount}</div>
          </div>

          <div
            onClick={() => {
              setStatusTab("rejected");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "rejected"
                ? "bg-rose-400/30 border border-rose-300/50 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-rose-200 font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-300" /> Rejected
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-200 mt-0.5">{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Message Display Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 transition-all ${
            messageType === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
          )}
          <span className="text-xs sm:text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Leave Request Form Card */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Submit New Leave Request
                </h2>
                <p className="text-xs text-slate-500">
                  Specify leave dates, justification, and optional documentation
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Leave Type <span className="text-rose-500">*</span>
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full p-2.5 sm:p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="maternity">Maternity/Paternity Leave</option>
                </select>
                <p className="text-[11px] text-blue-600 font-medium mt-1">
                  Accrued benefits apply based on tenure & policy.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-2.5 sm:p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-2.5 sm:p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Calculated duration notice */}
            {leaveFormDays > 0 && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-medium text-blue-900">
                  Calculated Duration:
                </span>
                <span className="font-extrabold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-100">
                  {leaveFormDays} {leaveFormDays === 1 ? "day" : "days"} requested
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Leave <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-3 text-xs sm:text-sm text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                placeholder="Please describe the reason for your leave..."
                required
              />
            </div>

            {/* Supporting Documents Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Supporting Documents (Optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-4 text-center transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="leave-docs-upload"
                />
                <label
                  htmlFor="leave-docs-upload"
                  className="cursor-pointer flex flex-col items-center gap-1.5"
                >
                  <Upload className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">
                    Click to attach supporting files
                  </span>
                  <span className="text-[11px] text-slate-500">
                    PDF, DOC, DOCX, JPG, PNG up to 10MB each
                  </span>
                </label>
              </div>

              {formData.documents.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.documents.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{loading ? "Submitting..." : "Submit Leave Request"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Card Header & Search / Tab Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  My Leave Requests
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {filteredRequests.length} matching {filteredRequests.length === 1 ? "request" : "requests"}
                </p>
              </div>
            </div>

            {/* Status Tab Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {[
                { id: "all", label: "All", count: totalCount },
                { id: "pending", label: "Pending", count: pendingCount },
                { id: "approved", label: "Approved", count: approvedCount },
                { id: "rejected", label: "Rejected", count: rejectedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusTab === tab.id
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by leave type, dates, or reason..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 hover:bg-slate-300 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-xs font-semibold text-slate-500">Loading leave requests...</span>
            </div>
          ) : paginatedRequests.length > 0 ? (
            <div className="space-y-4">
              {paginatedRequests.map((request, index) => {
                const status = getStatusDisplay(request.status);
                const StatusIcon = status.icon;
                const days = calculateDays(request.startDate, request.endDate);

                return (
                  <div
                    key={request._id || index}
                    className="border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md bg-white space-y-4"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 capitalize">
                              {request.leaveType || "Annual"} Leave
                            </h3>
                            {days > 0 && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                {days} {days === 1 ? "day" : "days"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatDate(request.startDate)} → {formatDate(request.endDate)}
                          </p>
                        </div>
                      </div>

                      <div className="self-start sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{status.text}</span>
                        </span>
                      </div>
                    </div>

                    {/* Details: Reason & Review */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block mb-1">
                          Reason:
                        </span>
                        <p className="text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium leading-relaxed">
                          {request.reason}
                        </p>
                      </div>

                      {request.submittedAt && (
                        <div className="text-[11px] text-slate-400">
                          Submitted on {formatDate(request.submittedAt)}
                        </div>
                      )}

                      {/* Rejection notice box */}
                      {request.status === "rejected" && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 mt-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Rejection Reason:</span>
                          </div>
                          <p className="text-xs sm:text-sm text-rose-950 font-medium bg-white/80 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
                            {request.rejectionReason ||
                              request.comments ||
                              request.supervisorNotes ||
                              request.notes ||
                              request.adminApproval?.rejectionReason ||
                              "No specific reason provided."}
                          </p>
                          {(request.processedBy ||
                            request.reviewedBy ||
                            request.supervisorId ||
                            request.processedAt ||
                            request.reviewedAt ||
                            request.reviewDate) && (
                            <p className="text-[11px] text-rose-600 font-medium pt-0.5">
                              {request.processedBy ||
                              request.reviewedBy ||
                              request.supervisorId
                                ? `Rejected by: ${
                                    request.processedBy ||
                                    request.reviewedBy ||
                                    request.supervisorId
                                  }`
                                : "Rejected"}
                              {(request.processedAt ||
                                request.reviewedAt ||
                                request.reviewDate) &&
                                ` on ${formatDate(
                                  request.processedAt ||
                                    request.reviewedAt ||
                                    request.reviewDate
                                )}`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 text-slate-400 space-y-3">
              <Calendar className="w-14 h-14 mx-auto text-slate-300" />
              <div>
                <h3 className="text-base font-bold text-slate-700">No leave requests found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusTab !== "all"
                    ? "Try adjusting your search terms or status tab."
                    : "You haven't submitted any leave requests yet."}
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Your First Request</span>
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
