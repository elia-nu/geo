"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Calendar,
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Camera,
  Timer,
  User,
  Building,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  IdCard,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";
import { toast } from "./ui/toast";

export default function AdminAttendanceManagement() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Filters
  const [filters, setFilters] = useState({
    status: "pending",
    employeeId: "",
    startDate: "",
    endDate: "",
    searchTerm: "",
  });

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 15,
  });

  useEffect(() => {
    fetchAttendanceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.employeeId, filters.startDate, filters.endDate, pagination.currentPage]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.status) params.append("status", filters.status);
      if (filters.employeeId) params.append("employeeId", filters.employeeId.trim());
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("page", pagination.currentPage.toString());
      params.append("limit", pagination.recordsPerPage.toString());

      const url = `/api/attendance/approve?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setAttendanceRecords(result.data || []);
        setPagination(result.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: (result.data || []).length,
          recordsPerPage: 15,
        });
      } else {
        showMessage("Failed to fetch attendance records", "error");
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      showMessage("Failed to fetch attendance records", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else toast.info(msg);
    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      status: "pending",
      employeeId: "",
      startDate: "",
      endDate: "",
      searchTerm: "",
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleApprovalAction = (record, action) => {
    setSelectedRecord(record);
    setApprovalAction(action);
    setAdminNotes("");
    setRejectionReason("");
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedRecord || !approvalAction) return;

    if (approvalAction === "reject" && !rejectionReason.trim()) {
      showMessage("Rejection reason is required", "error");
      return;
    }

    try {
      const response = await fetch("/api/attendance/approve", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendanceId: selectedRecord._id,
          action: approvalAction,
          adminId: "admin",
          adminNotes: adminNotes,
          rejectionReason: rejectionReason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage(
          `Attendance ${approvalAction === "approve" ? "approved" : "rejected"} successfully`,
          "success"
        );
        setShowApprovalModal(false);
        fetchAttendanceRecords();
      } else {
        showMessage(result.error || "Failed to update attendance approval", "error");
      }
    } catch (error) {
      console.error("Error updating attendance approval:", error);
      showMessage("Failed to update attendance approval", "error");
    }
  };

  const getRecordEmpId = (record) => {
    return (
      record.employeeCode ||
      record.employeeId ||
      record.employee?.employeeId ||
      record.employee?.empId ||
      "EMP—"
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);

    return Math.round(hours * 100) / 100;
  };

  const getStatusDisplay = (record) => {
    const status = record.approvalStatus || record.adminApproval?.status || "pending";
    switch (status) {
      case "approved":
        return {
          text: "Approved",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50 border-emerald-200",
          dotColor: "bg-emerald-500",
          icon: CheckCircle2,
        };
      case "rejected":
        return {
          text: "Rejected",
          color: "text-rose-700",
          bgColor: "bg-rose-50 border-rose-200",
          dotColor: "bg-rose-500",
          icon: XCircle,
        };
      case "pending":
      default:
        return {
          text: "Pending Review",
          color: "text-amber-700",
          bgColor: "bg-amber-50 border-amber-200",
          dotColor: "bg-amber-500",
          icon: Clock,
        };
    }
  };

  // Live filter on search term (Emp-ID, Name, Email, Department, Location)
  const filteredRecords = useMemo(() => {
    if (!filters.searchTerm) return attendanceRecords;

    const searchLower = filters.searchTerm.toLowerCase().trim();
    return attendanceRecords.filter((record) => {
      const name = (record.employeeName || "").toLowerCase();
      const email = (record.employeeEmail || "").toLowerCase();
      const dept = (record.department || "").toLowerCase();
      const loc = (record.workLocationName || "").toLowerCase();
      const empCode = String(getRecordEmpId(record)).toLowerCase();

      return (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        dept.includes(searchLower) ||
        loc.includes(searchLower) ||
        empCode.includes(searchLower)
      );
    });
  }, [attendanceRecords, filters.searchTerm]);

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
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Attendance Management &amp; Approvals
                </h1>
                <p className="text-indigo-200/90 text-xs sm:text-sm">
                  Review timesheets, verify biometric check-ins, and search by Employee ID (Emp-ID).
                </p>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleFilterChange("status", "pending")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filters.status === "pending"
                    ? "bg-amber-500 text-slate-950 shadow-md scale-105"
                    : "bg-white/10 text-amber-200 hover:bg-white/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Pending Review
              </button>
              <button
                onClick={() => handleFilterChange("status", "approved")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filters.status === "approved"
                    ? "bg-emerald-500 text-slate-950 shadow-md scale-105"
                    : "bg-white/10 text-emerald-200 hover:bg-white/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Approved
              </button>
              <button
                onClick={() => handleFilterChange("status", "rejected")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filters.status === "rejected"
                    ? "bg-rose-500 text-white shadow-md scale-105"
                    : "bg-white/10 text-rose-200 hover:bg-white/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Rejected
              </button>
              <button
                onClick={() => handleFilterChange("status", "all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filters.status === "all"
                    ? "bg-indigo-500 text-white shadow-md scale-105"
                    : "bg-white/10 text-indigo-200 hover:bg-white/20"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                All Statuses
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-300" />
              <span>{pagination.totalRecords} Records</span>
            </div>
            <button
              onClick={fetchAttendanceRecords}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 hover:scale-[1.05]"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
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
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Filter Approvals</h3>
              <p className="text-xs text-slate-400">Search by Employee ID, Name, Status or Date Range</p>
            </div>
          </div>
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-indigo-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Universal Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Emp ID, Name, Email, Department..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Specific Emp-ID filter */}
          <div className="relative">
            <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Emp ID (e.g. EMP-001)"
              value={filters.employeeId}
              onChange={(e) => handleFilterChange("employeeId", e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Attendance Records List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              Attendance Records ({filteredRecords.length} loaded)
            </h2>
          </div>
          {loading && <span className="text-xs text-indigo-600 font-medium">Refreshing list...</span>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-xs text-slate-400">Loading attendance data...</p>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => {
              const status = getStatusDisplay(record);
              const StatusIcon = status.icon;
              const workingHours = calculateWorkingHours(
                record.checkInTime,
                record.checkOutTime
              );
              const empCode = getRecordEmpId(record);
              const empName = record.employeeName || "Unknown Employee";
              const initial = empName.charAt(0).toUpperCase();

              return (
                <div
                  key={record._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition-all space-y-4"
                >
                  {/* Top Bar: Employee + EmpID + Status + Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-base">{empName}</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <IdCard className="w-3 h-3 text-slate-400" />
                            {empCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{record.employeeEmail || "No email"}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">
                            {record.department || "General"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.bgColor} ${status.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`}></span>
                        {status.text}
                      </span>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800">
                          {formatDate(record.date)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(record.date).toLocaleDateString([], { weekday: "long" })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">Check-in</div>
                      <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                        {formatTime(record.checkInTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">Check-out</div>
                      <div className="font-mono font-semibold text-slate-700 text-sm mt-0.5">
                        {formatTime(record.checkOutTime)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">Working Hours</div>
                      <div className="font-bold text-indigo-700 text-sm mt-0.5">
                        {workingHours ? `${workingHours} hrs` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">Location</div>
                      <div className="font-semibold text-slate-800 text-xs truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{record.workLocationName || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {record.faceVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Face Verified</span>
                        </span>
                      )}
                      {record.checkInPhoto && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Photo Attached</span>
                        </span>
                      )}
                      {record.adminApproval?.adminNotes && (
                        <span className="text-slate-500 italic text-[11px]">
                          Note: {record.adminApproval.adminNotes}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      {record.approvalStatus === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprovalAction(record, "approve")}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleApprovalAction(record, "reject")}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              No attendance records found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No records match your selected status or filter parameters.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Showing {(pagination.currentPage - 1) * pagination.recordsPerPage + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.recordsPerPage,
                pagination.totalRecords
              )}{" "}
              of {pagination.totalRecords} records
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage - 1,
                  }))
                }
                disabled={pagination.currentPage === 1}
                className="p-2 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            currentPage: pageNum,
                          }))
                        }
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                          pagination.currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage + 1,
                  }))
                }
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRecord && (
        <AttendanceDetailsModal
          record={selectedRecord}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {/* Approval / Rejection Modal */}
      {showApprovalModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div
              className={`p-6 text-white flex items-center justify-between ${
                approvalAction === "approve"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700"
                  : "bg-gradient-to-r from-rose-600 to-red-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  {approvalAction === "approve" ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {approvalAction === "approve" ? "Approve" : "Reject"} Attendance
                  </h3>
                  <p className="text-xs text-white/80">Confirm attendance status decision</p>
                </div>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Employee:</span>
                  <span className="font-bold text-slate-800">{selectedRecord.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Emp ID:</span>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {getRecordEmpId(selectedRecord)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Date:</span>
                  <span className="text-slate-700">{formatDate(selectedRecord.date)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full text-slate-900 p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-slate-50/70"
                  placeholder="Add administrative notes..."
                />
              </div>

              {approvalAction === "reject" && (
                <div>
                  <label className="block text-xs font-bold text-rose-700 uppercase mb-1.5">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-rose-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm bg-rose-50/40 text-slate-900 placeholder:text-rose-300"
                    placeholder="Specify why this attendance is rejected..."
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={submitApproval}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-white shadow-md transition-all ${
                    approvalAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-900/20"
                  }`}
                >
                  Confirm {approvalAction === "approve" ? "Approval" : "Rejection"}
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="py-3 px-5 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Attendance Details Modal Component
function AttendanceDetailsModal({ record, onClose }) {
  const getEmpId = () => {
    return (
      record.employeeCode ||
      record.employeeId ||
      record.employee?.employeeId ||
      record.employee?.empId ||
      "EMP—"
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);

    return Math.round(hours * 100) / 100;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-indigo-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Attendance Verification Details</h3>
              <p className="text-indigo-200 text-xs">{formatDate(record.date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Employee Information */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-xs uppercase text-indigo-600">
              <User className="w-4 h-4" />
              <span>Employee Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Name:</span>
                <p className="text-slate-900 font-bold mt-0.5">{record.employeeName}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Employee ID:</span>
                <p className="font-mono text-sm font-bold text-indigo-600 mt-0.5">
                  {getEmpId()}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Email:</span>
                <p className="text-slate-700 mt-0.5">{record.employeeEmail || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase">Department:</span>
                <p className="text-slate-700 font-medium mt-0.5">{record.department || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Attendance Information */}
          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100">
            <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-xs uppercase">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Timesheet Information</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase">Check-in:</span>
                <p className="text-slate-900 font-mono font-bold mt-0.5">
                  {formatTime(record.checkInTime)}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase">Check-out:</span>
                <p className="text-slate-900 font-mono font-bold mt-0.5">
                  {formatTime(record.checkOutTime)}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase">Hours:</span>
                <p className="text-indigo-700 font-bold mt-0.5">
                  {calculateWorkingHours(record.checkInTime, record.checkOutTime) || "—"} hrs
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase">Status:</span>
                <p className="text-slate-800 font-bold capitalize mt-0.5">
                  {record.approvalStatus || "Pending"}
                </p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100">
            <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2 text-xs uppercase">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Work Location &amp; Geofence</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-emerald-600 uppercase">Location:</span>
                <p className="text-slate-900 font-bold mt-0.5">{record.workLocationName || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-emerald-600 uppercase">Geofence Verified:</span>
                <p className="text-emerald-800 font-semibold mt-0.5">
                  {record.checkInLocation ? "Yes (Within Geofence)" : "Standard"}
                </p>
              </div>
            </div>
          </div>

          {/* Verification Information & Photos */}
          <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100">
            <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2 text-xs uppercase">
              <Camera className="w-4 h-4 text-purple-600" />
              <span>Biometric Verification &amp; Photos</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-purple-600 uppercase">Face Verified:</span>
                <p className="text-slate-900 font-bold mt-0.5">
                  {record.faceVerified ? "Yes (Verified ✓)" : "No"}
                </p>
              </div>
            </div>

            {(record.checkInPhoto || record.checkOutPhoto) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {record.checkInPhoto && (
                  <div>
                    <span className="text-xs font-semibold text-purple-600 block mb-1">
                      Check-in Photo:
                    </span>
                    <img
                      src={record.checkInPhoto}
                      alt="Check-in"
                      className="w-full h-36 object-cover rounded-xl border border-purple-200"
                    />
                  </div>
                )}
                {record.checkOutPhoto && (
                  <div>
                    <span className="text-xs font-semibold text-purple-600 block mb-1">
                      Check-out Photo:
                    </span>
                    <img
                      src={record.checkOutPhoto}
                      alt="Check-out"
                      className="w-full h-36 object-cover rounded-xl border border-purple-200"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Review Notes */}
          {record.adminApproval && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Admin Decision Audit</span>
              </h4>
              <div className="text-xs space-y-1 text-slate-700">
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="capitalize">{record.adminApproval.status}</span>
                </p>
                {record.adminApproval.adminNotes && (
                  <p>
                    <span className="font-semibold">Notes:</span> {record.adminApproval.adminNotes}
                  </p>
                )}
                {record.adminApproval.rejectionReason && (
                  <p className="text-rose-700 font-medium">
                    <span className="font-semibold">Rejection Reason:</span>{" "}
                    {record.adminApproval.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
