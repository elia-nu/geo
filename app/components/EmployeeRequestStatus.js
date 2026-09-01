"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Download,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Inbox,
  Sparkles,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function EmployeeRequestStatus({ employeeId, employeeName }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // all, pending, approved, rejected
  const [filters, setFilters] = useState({
    type: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (employeeId) {
      fetchRequests();
    }
  }, [employeeId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [docsRes, otRes] = await Promise.all([
        fetch(`/api/attendance/documents?employeeId=${employeeId}`),
        fetch(`/api/overtime/requests?employeeId=${employeeId}`),
      ]);

      const [docsResult, otResult] = await Promise.all([
        docsRes.json(),
        otRes.json(),
      ]);

      const combined = [];

      if (docsResult.success && Array.isArray(docsResult.data)) {
        combined.push(...docsResult.data);
      }

      if (otResult.success && Array.isArray(otResult.data)) {
        const formattedOt = otResult.data.map((ot) => ({
          _id: ot._id,
          type: "overtime",
          requestDate: ot.date,
          startDate: ot.date,
          endDate: ot.date,
          reason: ot.reason || "Overtime Work",
          description: ot.project
            ? `Project: ${ot.project} | ${ot.requestedHours} hrs`
            : `${ot.requestedHours} hrs`,
          status: ot.status,
          approvedHours: ot.approvedHours,
          requestedHours: ot.requestedHours,
          supervisorNotes: ot.supervisorNotes,
          submittedAt: ot.createdAt,
          createdAt: ot.createdAt,
          updatedAt: ot.updatedAt,
        }));
        combined.push(...formattedOt);
      }

      // Sort by creation date descending
      combined.sort(
        (a, b) =>
          new Date(b.createdAt || b.submittedAt || 0) -
          new Date(a.createdAt || a.submittedAt || 0)
      );

      setRequests(combined);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      status: "",
    });
    setSearchTerm("");
    setStatusTab("all");
    setCurrentPage(1);
  };

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

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

  const getTypeDisplay = (type) => {
    switch (type) {
      case "overtime":
        return {
          text: "Overtime Request",
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-100/80 dark:bg-amber-950/50",
          badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "leave":
        return {
          text: "Leave Request",
          icon: Calendar,
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-100/80 dark:bg-blue-950/50",
          badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "document":
        return {
          text: "Document Upload",
          icon: FileText,
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-100/80 dark:bg-purple-950/50",
          badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "absence":
        return {
          text: "Absence Request",
          icon: AlertCircle,
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100/80 dark:bg-orange-950/50",
          badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
        };
      default:
        return {
          text: "Other Request",
          icon: FileText,
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-800",
          badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Tab filter
      if (statusTab !== "all" && request.status !== statusTab) return false;

      // Dropdown type filter
      if (filters.type && request.type !== filters.type) return false;

      // Dropdown status filter
      if (filters.status && request.status !== filters.status) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const reasonMatch = request.reason?.toLowerCase().includes(query);
        const typeMatch = request.type?.toLowerCase().includes(query);
        const descMatch = request.description?.toLowerCase().includes(query);
        const leaveTypeMatch = request.leaveType?.toLowerCase().includes(query);
        const dateMatch =
          request.startDate?.includes(query) ||
          request.endDate?.includes(query) ||
          request.requestDate?.includes(query);
        if (!reasonMatch && !typeMatch && !descMatch && !leaveTypeMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusTab, filters, searchTerm]);

  // Paginated records
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const downloadDocument = async (documentId, filename) => {
    try {
      const response = await fetch(
        `/api/attendance/documents/${documentId}/download`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Request Status
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                Track real-time approval status of your leave, overtime, and attendance requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white backdrop-blur transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur border transition-all ${
                showFilters || filters.type || filters.status
                  ? "bg-white text-blue-900 border-white shadow-md font-bold"
                  : "bg-white/10 hover:bg-white/20 border-white/15 text-white"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(filters.type || filters.status) && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
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
            <div className="text-[11px] text-blue-200 font-medium">All Requests</div>
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

      {/* Search & Tabs Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason, type, project, or date..."
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

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
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

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Request Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="overtime">Overtime Requests</option>
                <option value="leave">Leave Requests</option>
                <option value="document">Document Uploads</option>
                <option value="absence">Absence Requests</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specific Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved Only</option>
                <option value="rejected">Rejected Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requests List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Submitted Requests
              </h2>
              <p className="text-xs text-slate-500">
                Showing {filteredRequests.length} matching {filteredRequests.length === 1 ? "record" : "records"}
              </p>
            </div>
          </div>

          {filteredRequests.length > 0 && (
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-xs font-semibold text-slate-500">Loading requests...</span>
            </div>
          ) : paginatedRequests.length > 0 ? (
            <div className="space-y-4">
              {paginatedRequests.map((request, index) => {
                const status = getStatusDisplay(request.status);
                const type = getTypeDisplay(request.type);
                const StatusIcon = status.icon;
                const TypeIcon = type.icon;

                return (
                  <div
                    key={request._id || index}
                    className="border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md bg-white space-y-4"
                  >
                    {/* Header: Type icon, title, submitted date, and status badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${type.bgColor} shrink-0`}>
                          <TypeIcon className={`w-5 h-5 ${type.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                              {type.text}
                            </h3>
                            {request.leaveType && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {request.leaveType}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Submitted on {formatDateTime(request.submittedAt || request.createdAt)}
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

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Left: Request Details */}
                      <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100 space-y-2.5">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                          Request Details
                        </span>

                        {request.type === "leave" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Leave Duration:</span>
                              <span className="font-semibold text-slate-800">
                                {formatDate(request.startDate)} → {formatDate(request.endDate)}
                              </span>
                            </div>
                          </div>
                        )}

                        {request.type === "overtime" && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Overtime Date:</span>
                              <span className="font-semibold text-slate-800">
                                {formatDate(request.requestDate || request.startDate)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Requested Hours:</span>
                              <span className="font-bold text-amber-700">
                                {request.requestedHours || "--"} hrs
                              </span>
                            </div>
                            {request.approvedHours !== undefined && request.status === "approved" && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Approved Hours:</span>
                                <span className="font-bold text-emerald-700">
                                  {request.approvedHours} hrs
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {request.reason && (
                          <div className="pt-1">
                            <span className="text-slate-500 block mb-0.5">Reason / Justification:</span>
                            <p className="text-slate-900 font-medium bg-white p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                              {request.reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Status & Review Information */}
                      <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100 space-y-2.5">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                          Status Information
                        </span>

                        {request.status === "pending" && (
                          <div className="flex items-center gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Awaiting review and supervisor sign-off.</span>
                          </div>
                        )}

                        {request.reviewedAt && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Reviewed On:</span>
                            <span className="font-semibold text-slate-800">
                              {formatDateTime(request.reviewedAt)}
                            </span>
                          </div>
                        )}

                        {request.reviewedBy && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Reviewed By:</span>
                            <span className="font-semibold text-slate-800">
                              {request.reviewedBy}
                            </span>
                          </div>
                        )}

                        {/* Rejection Notice Banner */}
                        {request.status === "rejected" && (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1 mt-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>Rejection Reason:</span>
                            </div>
                            <p className="text-rose-950 font-medium text-xs bg-white/80 p-2 rounded-lg border border-rose-100 leading-relaxed">
                              {request.rejectionReason ||
                                request.comments ||
                                request.supervisorNotes ||
                                request.notes ||
                                request.adminApproval?.rejectionReason ||
                                "No specific reason provided."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attached Documents */}
                    {request.documents && request.documents.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Attached Supporting Documents
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc, docIndex) => (
                            <div
                              key={docIndex}
                              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span className="max-w-xs truncate">{doc.filename || "Document"}</span>
                              <button
                                onClick={() => downloadDocument(doc._id, doc.filename)}
                                className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 text-slate-400 space-y-3">
              <Inbox className="w-14 h-14 mx-auto text-slate-300" />
              <div>
                <h3 className="text-base font-bold text-slate-700">No requests found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusTab !== "all" || filters.type || filters.status
                    ? "Try adjusting your search keywords or filter criteria."
                    : "You haven't submitted any leave, overtime, or document requests yet."}
                </p>
              </div>
              {(searchTerm || statusTab !== "all" || filters.type || filters.status) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Clear Filters & Search
                </button>
              )}
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
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
