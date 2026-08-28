"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Users,
  Building,
  Download,
  Printer,
  RefreshCw,
  Eye,
  Camera,
  MapPin,
  Timer,
  CheckCircle2,
  FileText,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  Edit,
  IdCard,
  List,
} from "lucide-react";
import AttendancePhotoViewer from "./AttendancePhotoViewer";
import { formatWorkingHours } from "../utils/timeUtils";

export default function AdminOvertimeManagement() {
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'attendance' | 'reports'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Requests state
  const [requests, setRequests] = useState([]);
  const [requestFilters, setRequestFilters] = useState({
    status: "all",
    department: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [requestPagination, setRequestPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 15,
  });

  // Attendance logs state
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({
    status: "all",
    adminApprovalStatus: "all",
    department: "all",
    date: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Reports state & filters
  const [reportData, setReportData] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    employeeId: "",
    department: "all",
    approvalStatus: "all",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [reportViewMode, setReportViewMode] = useState("sessions"); // 'sessions' | 'summary'

  // Request Approval / Rejection Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("approved"); // 'approved' | 'rejected'
  const [approvedHours, setApprovedHours] = useState(0);
  const [supervisorNotes, setSupervisorNotes] = useState("");

  // Request Details Modal
  const [viewRequestModal, setViewRequestModal] = useState(null);

  // Attendance Review / Verification Modal State
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showAttendanceReviewModal, setShowAttendanceReviewModal] = useState(false);
  const [attendanceReviewAction, setAttendanceReviewAction] = useState("approved"); // 'approved' | 'rejected'
  const [approvedAttendanceHours, setApprovedAttendanceHours] = useState(0);
  const [attendanceAdminNotes, setAttendanceAdminNotes] = useState("");

  // Photo Viewer Modal
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Departments list for dropdown
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    } else if (activeTab === "attendance") {
      fetchAttendanceLogs();
    } else if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, requestFilters, requestPagination.currentPage, attendanceFilters, reportFilters]);

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const result = await res.json();
      if (result.success && result.departments) {
        setDepartments(result.departments);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: requestPagination.currentPage.toString(),
        limit: requestPagination.recordsPerPage.toString(),
        ...(requestFilters.employeeId && { employeeId: requestFilters.employeeId.trim() }),
        ...(requestFilters.status !== "all" && { status: requestFilters.status }),
        ...(requestFilters.department !== "all" && { department: requestFilters.department }),
        ...(requestFilters.startDate && { startDate: requestFilters.startDate }),
        ...(requestFilters.endDate && { endDate: requestFilters.endDate }),
        ...(requestFilters.search && { search: requestFilters.search }),
      });

      const res = await fetch(`/api/overtime/requests?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setRequests(result.data || []);
        setRequestPagination(result.pagination || requestPagination);
      }
    } catch (err) {
      console.error("Error fetching overtime requests:", err);
      showMessage("Failed to fetch overtime requests", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Attendance Logs
  const fetchAttendanceLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(attendanceFilters.employeeId && { employeeId: attendanceFilters.employeeId.trim() }),
        ...(attendanceFilters.status !== "all" && { status: attendanceFilters.status }),
        ...(attendanceFilters.adminApprovalStatus !== "all" && { adminApprovalStatus: attendanceFilters.adminApprovalStatus }),
        ...(attendanceFilters.department !== "all" && { department: attendanceFilters.department }),
        ...(attendanceFilters.date && { date: attendanceFilters.date }),
        ...(attendanceFilters.startDate && { startDate: attendanceFilters.startDate }),
        ...(attendanceFilters.endDate && { endDate: attendanceFilters.endDate }),
        ...(attendanceFilters.search && { search: attendanceFilters.search }),
      });

      const res = await fetch(`/api/overtime/attendance?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setAttendanceLogs(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching overtime attendance:", err);
      showMessage("Failed to fetch overtime attendance logs", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(reportFilters.employeeId && { employeeId: reportFilters.employeeId.trim() }),
        ...(reportFilters.department !== "all" && { department: reportFilters.department }),
        ...(reportFilters.approvalStatus !== "all" && { approvalStatus: reportFilters.approvalStatus }),
        ...(reportFilters.startDate && { startDate: reportFilters.startDate }),
        ...(reportFilters.endDate && { endDate: reportFilters.endDate }),
        ...(reportFilters.search && { search: reportFilters.search.trim() }),
      });

      const res = await fetch(`/api/overtime/reports?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        setReportData(result.data);
      }
    } catch (err) {
      console.error("Error fetching overtime reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Request Approval Modal
  const handleOpenApprovalModal = (req, action) => {
    setSelectedRequest(req);
    setApprovalAction(action);
    setApprovedHours(req.requestedHours || 1);
    setSupervisorNotes("");
    setShowApprovalModal(true);
  };

  // Submit Request Approval / Rejection
  const handleSubmitApproval = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/overtime/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          status: approvalAction,
          approvedHours: approvalAction === "approved" ? parseFloat(approvedHours) || selectedRequest.requestedHours : 0,
          supervisorNotes,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(`Overtime request ${approvalAction} successfully!`, "success");
        setShowApprovalModal(false);
        fetchRequests();
      } else {
        showMessage(result.error || "Failed to update request", "error");
      }
    } catch (err) {
      console.error("Error submitting approval:", err);
      showMessage("Error updating request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Attendance Review Modal
  const handleOpenAttendanceReview = (attendance, defaultAction = "approved") => {
    setSelectedAttendance(attendance);
    setAttendanceReviewAction(defaultAction);
    setApprovedAttendanceHours(attendance.durationHours || attendance.approvedHours || 0);
    setAttendanceAdminNotes(attendance.adminNotes || "");
    setShowAttendanceReviewModal(true);
  };

  // Submit Attendance Review / Approval / Rejection
  const handleSubmitAttendanceReview = async () => {
    if (!selectedAttendance) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/overtime/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceId: selectedAttendance._id,
          adminApprovalStatus: attendanceReviewAction,
          approvedAttendanceHours: attendanceReviewAction === "approved" ? parseFloat(approvedAttendanceHours) : 0,
          adminNotes: attendanceAdminNotes,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(`Overtime attendance record ${attendanceReviewAction} successfully!`, "success");
        setShowAttendanceReviewModal(false);
        fetchAttendanceLogs();
      } else {
        showMessage(result.error || "Failed to update attendance review status", "error");
      }
    } catch (err) {
      console.error("Error updating attendance status:", err);
      showMessage("Error reviewing attendance record", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!reportData?.detailedSessions?.length && !reportData?.employeeSummary?.length) {
      showMessage("No data to export", "error");
      return;
    }

    if (reportViewMode === "sessions" && reportData?.detailedSessions?.length) {
      const headers = [
        "Employee ID",
        "Employee Name",
        "Department",
        "Date",
        "Check-in Timestamp",
        "Check-out Timestamp",
        "Duration Formatted",
        "Duration Hours",
        "Approved Overtime Hours",
        "Approval Status",
        "Approved At Timestamp",
        "Approved By",
        "Project / Notes",
      ];
      const rows = reportData.detailedSessions.map((s) => [
        `"${s.empId || s.employeeId || ""}"`,
        `"${s.employeeName || ""}"`,
        `"${s.department || ""}"`,
        `"${s.date || ""}"`,
        `"${s.checkInTime ? new Date(s.checkInTime).toLocaleString() : ""}"`,
        `"${s.checkOutTime ? new Date(s.checkOutTime).toLocaleString() : ""}"`,
        `"${s.durationFormatted || ""}"`,
        s.durationHours || 0,
        s.approvedAttendanceHours !== undefined && s.approvedAttendanceHours !== null ? s.approvedAttendanceHours : "",
        `"${s.adminApprovalStatus || "pending_review"}"`,
        `"${s.approvedAt ? new Date(s.approvedAt).toLocaleString() : ""}"`,
        `"${s.approvedBy || ""}"`,
        `"${(s.adminNotes || s.checkOutNotes || s.reason || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `overtime_detailed_sessions_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ["Employee ID", "Employee Name", "Department", "Completed Sessions", "Total Overtime Hours", "Formatted Duration", "Total Approved Hours"];
      const rows = (reportData.employeeSummary || []).map((e) => [
        `"${e.empId || e.employeeId || ""}"`,
        `"${e.employeeName || ""}"`,
        `"${e.department || ""}"`,
        e.sessionsCount,
        e.totalDurationHours,
        `"${e.durationFormatted || ""}"`,
        e.approvedHoursTotal || 0,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `overtime_summary_breakdown_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-amber-500/20 border border-amber-400/30 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Overtime Management Center</h1>
                <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-400/30">
                  Admin & HRM
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-0.5">
                Review employee overtime request history, inspect overtime attendance logs (photos, location, time taken), and approve/reject attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === "requests") fetchRequests();
                else if (activeTab === "attendance") fetchAttendanceLogs();
                else if (activeTab === "reports") fetchReports();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-all flex items-center gap-1.5 border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 transition-all ${
            messageType === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : messageType === "error"
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-sm p-1.5 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "requests"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          Overtime Request History & Approvals
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "attendance"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Timer className="w-4 h-4" />
          Overtime Attendance Review (Photos & Approval)
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "bg-amber-600 text-white shadow-md"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Overtime Summary & Reports
        </button>
      </div>

      {/* TAB 1: OVERTIME REQUEST HISTORY & APPROVALS */}
      {activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-4">
          {/* Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee name, reason, project..."
                value={requestFilters.search}
                onChange={(e) => setRequestFilters({ ...requestFilters, search: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Dedicated Employee ID Filter */}
            <div className="w-36 relative">
              <IdCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Emp ID"
                value={requestFilters.employeeId || ""}
                onChange={(e) => setRequestFilters({ ...requestFilters, employeeId: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            {/* Status Filter */}
            <select
              value={requestFilters.status}
              onChange={(e) => setRequestFilters({ ...requestFilters, status: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-medium"
            >
              <option value="all">All Request Statuses</option>
              <option value="pending">🟡 Pending Approvals</option>
              <option value="approved">🟢 Approved Requests</option>
              <option value="rejected">🔴 Rejected Requests</option>
            </select>

            {/* Department Filter */}
            <select
              value={requestFilters.department}
              onChange={(e) => setRequestFilters({ ...requestFilters, department: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-medium"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Date Filters */}
            <input
              type="date"
              value={requestFilters.startDate}
              onChange={(e) => setRequestFilters({ ...requestFilters, startDate: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={requestFilters.endDate}
              onChange={(e) => setRequestFilters({ ...requestFilters, endDate: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No overtime requests found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Target Date</th>
                    <th className="p-3.5">Hours (Req / Appr)</th>
                    <th className="p-3.5">Reason & Project</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                        {req.employee?.name || req.employeeName}
                        <span className="block text-[11px] text-gray-400 font-normal">
                          {req.employee?.email || ""}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 text-xs whitespace-nowrap">
                        {req.employee?.department || req.department || "General"}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-800 whitespace-nowrap">
                        {req.date}
                        {req.startTime && (
                          <span className="block text-[11px] text-gray-500 font-normal">
                            {req.startTime} - {req.endTime || "End"}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-bold text-gray-900">{req.requestedHours} hrs</span>
                          {req.status === "approved" && (
                            <span className="ml-1 text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded text-[11px]">
                              Appr: {req.approvedHours || req.requestedHours}h
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        {req.project && (
                          <span className="inline-block font-bold text-[11px] text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mb-0.5">
                            {req.project}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 line-clamp-1 truncate" title={req.reason}>
                          {req.reason}
                        </p>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {req.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : req.status === "rejected" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full animate-pulse">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewRequestModal(req)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-xs flex items-center gap-1"
                            title="View Request Details"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>

                          {req.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleOpenApprovalModal(req, "approved")}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleOpenApprovalModal(req, "rejected")}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenApprovalModal(req, req.status === "approved" ? "rejected" : "approved")}
                              className="text-xs text-amber-700 hover:text-amber-900 underline font-semibold"
                            >
                              Edit Decision
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {requestPagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Showing page {requestPagination.currentPage} of {requestPagination.totalPages} ({requestPagination.totalRecords} total requests)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={requestPagination.currentPage <= 1}
                  onClick={() => setRequestPagination({ ...requestPagination, currentPage: requestPagination.currentPage - 1 })}
                  className="p-1.5 border rounded-lg disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={requestPagination.currentPage >= requestPagination.totalPages}
                  onClick={() => setRequestPagination({ ...requestPagination, currentPage: requestPagination.currentPage + 1 })}
                  className="p-1.5 border rounded-lg disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OVERTIME ATTENDANCE LOGS & APPROVAL */}
      {activeTab === "attendance" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden space-y-4">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee, notes..."
                value={attendanceFilters.search}
                onChange={(e) => setAttendanceFilters({ ...attendanceFilters, search: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Dedicated Employee ID Filter */}
            <div className="w-36 relative">
              <IdCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Emp ID"
                value={attendanceFilters.employeeId || ""}
                onChange={(e) => setAttendanceFilters({ ...attendanceFilters, employeeId: e.target.value })}
                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <select
              value={attendanceFilters.adminApprovalStatus}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, adminApprovalStatus: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-bold"
            >
              <option value="all">All Approval Decisions</option>
              <option value="pending_review">🟡 Pending Review</option>
              <option value="approved">🟢 Approved by Admin</option>
              <option value="rejected">🔴 Rejected Attendance</option>
            </select>

            <input
              type="date"
              value={attendanceFilters.date}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, date: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700"
            />

            <select
              value={attendanceFilters.department}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, department: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-medium"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={attendanceFilters.status}
              onChange={(e) => setAttendanceFilters({ ...attendanceFilters, status: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-medium"
            >
              <option value="all">All Clock States</option>
              <option value="in-progress">Active / Clocked In</option>
              <option value="completed">Completed Sessions</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading attendance records...</p>
            </div>
          ) : attendanceLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Timer className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">No separate overtime attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5">Time Taken / Worked</th>
                    <th className="p-3.5">Location & Photos</th>
                    <th className="p-3.5">Admin Approval</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendanceLogs.map((att) => (
                    <tr key={att._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                        {att.employee?.name || att.employeeName}
                        <span className="block text-[11px] text-gray-400 font-normal">
                          {att.employee?.employeeId || ""}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 text-xs whitespace-nowrap">
                        {att.employee?.department || att.department || "General"}
                      </td>
                      <td className="p-3.5 font-semibold text-gray-800 whitespace-nowrap">
                        {att.date}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-gray-800 whitespace-nowrap">
                        {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="p-3.5 font-mono text-xs text-gray-800 whitespace-nowrap">
                        {att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg text-xs border border-amber-200">
                          {att.durationFormatted || `${att.durationHours || 0} hrs`}
                        </span>
                        <span className="block text-[11px] text-gray-500 font-normal mt-0.5">
                          Quota: {att.approvedHours || "--"} hrs
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {att.checkInPhoto && (
                              <button
                                onClick={() => {
                                  setSelectedPhoto(att.checkInPhoto);
                                  setShowPhotoViewer(true);
                                }}
                                className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 inline-flex items-center gap-1 font-semibold"
                              >
                                <Camera className="w-3 h-3 text-green-600" /> In Photo
                              </button>
                            )}
                            {att.checkOutPhoto && (
                              <button
                                onClick={() => {
                                  setSelectedPhoto(att.checkOutPhoto);
                                  setShowPhotoViewer(true);
                                }}
                                className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 inline-flex items-center gap-1 font-semibold"
                              >
                                <Camera className="w-3 h-3 text-red-600" /> Out Photo
                              </button>
                            )}
                          </div>
                          {att.geofenceValidation?.isValid ? (
                            <span className="text-[11px] text-green-700 font-semibold flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> Geofence Verified ({att.geofenceValidation?.distance}m)
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> Coordinates logged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {att.adminApprovalStatus === "approved" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                            {att.approvedAttendanceHours !== undefined && (
                              <span className="block text-[11px] text-gray-600 font-bold mt-0.5">
                                {att.approvedAttendanceHours} hrs credited
                              </span>
                            )}
                          </div>
                        ) : att.adminApprovalStatus === "rejected" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                            {att.adminNotes && (
                              <span className="block text-[11px] text-red-500 truncate max-w-[120px] mt-0.5" title={att.adminNotes}>
                                {att.adminNotes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full animate-pulse">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAttendanceReview(att, att.adminApprovalStatus === "approved" ? "approved" : "approved")}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Review Attendance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OVERTIME SUMMARY & REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Overtime Hours</span>
              <div className="text-3xl font-extrabold text-amber-600 mt-1">
                {reportData?.summary?.totalActualWorkedHours || 0} <span className="text-sm font-normal text-gray-500">hrs</span>
              </div>
              <span className="text-xs text-gray-400 mt-1 block">
                {reportData?.summary?.formattedTotalDuration || "0h 0m"} total logged
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Completed Sessions</span>
              <div className="text-3xl font-extrabold text-gray-900 mt-1">
                {reportData?.summary?.totalCompletedSessions || 0}
              </div>
              <span className="text-xs text-green-600 mt-1 block font-semibold">
                ● {reportData?.summary?.activeSessions || 0} actively clocked in now
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Requests</span>
              <div className="text-3xl font-extrabold text-gray-900 mt-1">
                {reportData?.summary?.totalRequests || 0}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                {reportData?.summary?.approvedRequests || 0} approved / {reportData?.summary?.pendingRequests || 0} pending
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <span className="text-xs font-semibold text-gray-500 uppercase">Approved Quota</span>
              <div className="text-3xl font-extrabold text-green-600 mt-1">
                {reportData?.summary?.totalApprovedHours || 0} <span className="text-sm font-normal text-gray-500">hrs</span>
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                vs {reportData?.summary?.totalRequestedHours || 0} hrs requested
              </span>
            </div>
          </div>

          {/* Dedicated Filter Toolbar for Reports */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Filter Overtime Report</h3>
                  <p className="text-xs text-gray-500">Filter sessions by Employee ID, name, date range, or approval status</p>
                </div>
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setReportFilters((p) => ({ ...p, startDate: today, endDate: today }));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 7);
                    setReportFilters((p) => ({
                      ...p,
                      startDate: start.toISOString().split("T")[0],
                      endDate: end.toISOString().split("T")[0],
                    }));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setReportFilters((p) => ({
                      ...p,
                      startDate: start.toISOString().split("T")[0],
                      endDate: end.toISOString().split("T")[0],
                    }));
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-600 transition-colors"
                >
                  This Month
                </button>
                <button
                  onClick={() =>
                    setReportFilters({
                      employeeId: "",
                      department: "all",
                      approvalStatus: "all",
                      startDate: "",
                      endDate: "",
                      search: "",
                    })
                  }
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Universal Search */}
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search name, notes, project..."
                  value={reportFilters.search}
                  onChange={(e) => setReportFilters((p) => ({ ...p, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Dedicated Employee ID Filter */}
              <div className="relative">
                <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Emp ID (e.g. EMP-001)"
                  value={reportFilters.employeeId}
                  onChange={(e) => setReportFilters((p) => ({ ...p, employeeId: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 text-xs placeholder:text-gray-400 focus:ring-2 focus:ring-amber-500 font-mono font-medium transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <select
                  value={reportFilters.department}
                  onChange={(e) => setReportFilters((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 text-xs focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id || dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approval Status */}
              <div>
                <select
                  value={reportFilters.approvalStatus}
                  onChange={(e) => setReportFilters((p) => ({ ...p, approvalStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-gray-900 text-xs focus:ring-2 focus:ring-amber-500 transition-all"
                >
                  <option value="all">All Approval Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Refresh / Export Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReports}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Refresh Reports"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Date Range:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reportFilters.startDate}
                  onChange={(e) => setReportFilters((p) => ({ ...p, startDate: e.target.value }))}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-800"
                />
                <span>to</span>
                <input
                  type="date"
                  value={reportFilters.endDate}
                  onChange={(e) => setReportFilters((p) => ({ ...p, endDate: e.target.value }))}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-800"
                />
              </div>
              {(reportFilters.startDate || reportFilters.endDate || reportFilters.employeeId || reportFilters.search) && (
                <button
                  onClick={() =>
                    setReportFilters((p) => ({
                      ...p,
                      startDate: "",
                      endDate: "",
                      employeeId: "",
                      search: "",
                    }))
                  }
                  className="text-rose-600 hover:underline font-medium text-xs"
                >
                  Clear search &amp; dates
                </button>
              )}
            </div>
          </div>

          {/* View Mode Toggle & Table Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {reportViewMode === "sessions" ? "Overtime Sessions Log (Date, Timestamps & Approval Time)" : "Employee Overtime Summary Breakdown"}
                </h3>
                <p className="text-xs text-gray-500">
                  {reportViewMode === "sessions"
                    ? "Detailed timestamps of check-in, check-out, duration worked, approval time, and approver details"
                    : "Aggregated verified overtime totals grouped per employee"}
                </p>
              </div>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setReportViewMode("sessions")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    reportViewMode === "sessions"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Detailed Sessions Log
                </button>
                <button
                  onClick={() => setReportViewMode("summary")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    reportViewMode === "summary"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Employee Summary
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-600" />
                <p className="text-xs">Loading overtime report data...</p>
              </div>
            ) : reportViewMode === "sessions" ? (
              /* DETAILED OVERTIME SESSIONS TABLE */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Check-In Timestamp</th>
                      <th className="p-3.5">Check-Out Timestamp</th>
                      <th className="p-3.5 text-center">Duration</th>
                      <th className="p-3.5 text-center">Approved Quota</th>
                      <th className="p-3.5 text-center">Approval Status</th>
                      <th className="p-3.5">Approval Time &amp; By</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData?.detailedSessions || []).length > 0 ? (
                      reportData.detailedSessions.map((session, index) => {
                        const isApproved = session.adminApprovalStatus === "approved";
                        const isRejected = session.adminApprovalStatus === "rejected";
                        const isPending = !isApproved && !isRejected;

                        return (
                          <tr key={session._id || index} className="hover:bg-amber-50/30 transition-colors">
                            {/* Date */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-gray-900 text-xs">
                                {session.date}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {new Date(session.date).toLocaleDateString([], { weekday: "short" })}
                              </div>
                            </td>

                            {/* Employee */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-xs">{session.employeeName}</span>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px] font-bold border border-gray-200">
                                  <IdCard className="w-2.5 h-2.5 text-gray-400" />
                                  {session.empId || session.employeeId}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {session.department || "General"}
                              </div>
                            </td>

                            {/* Check-In Timestamp */}
                            <td className="p-3.5 whitespace-nowrap">
                              {session.checkInTime ? (
                                <div>
                                  <span className="font-mono font-bold text-emerald-700 text-xs">
                                    {new Date(session.checkInTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                  <span className="block text-[10px] text-gray-400">
                                    {new Date(session.checkInTime).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>

                            {/* Check-Out Timestamp */}
                            <td className="p-3.5 whitespace-nowrap">
                              {session.checkOutTime ? (
                                <div>
                                  <span className="font-mono font-semibold text-gray-800 text-xs">
                                    {new Date(session.checkOutTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </span>
                                  <span className="block text-[10px] text-gray-400">
                                    {new Date(session.checkOutTime).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  <Timer className="w-3 h-3 animate-spin" /> In Progress
                                </span>
                              )}
                            </td>

                            {/* Duration (Xh Ym) */}
                            <td className="p-3.5 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs">
                                {session.durationFormatted || formatWorkingHours(session.durationHours)}
                              </span>
                            </td>

                            {/* Approved Overtime Hours */}
                            <td className="p-3.5 whitespace-nowrap text-center">
                              {session.approvedAttendanceHours !== undefined && session.approvedAttendanceHours !== null ? (
                                <span className="font-extrabold text-amber-700 text-xs">
                                  {session.approvedAttendanceHours} hrs
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>

                            {/* Approval Status */}
                            <td className="p-3.5 whitespace-nowrap text-center">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Approved
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                  <XCircle className="w-3 h-3" /> Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              )}
                            </td>

                            {/* Approval Time & By */}
                            <td className="p-3.5 whitespace-nowrap">
                              {session.approvedAt ? (
                                <div>
                                  <div className="font-mono text-xs font-semibold text-gray-800">
                                    {new Date(session.approvedAt).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}{" "}
                                    {new Date(session.approvedAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    by {session.approvedBy || "Admin"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic">Not yet reviewed</span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleOpenAttendanceReview(session, session.adminApprovalStatus === "approved" ? "approved" : "approved")}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-400 text-xs">
                          No overtime session logs found matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* EMPLOYEE SUMMARY BREAKDOWN TABLE */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5 text-center">Completed Sessions</th>
                      <th className="p-3.5 text-center">Total Overtime Hours</th>
                      <th className="p-3.5 text-center">Formatted Duration</th>
                      <th className="p-3.5 text-center">Total Approved Quota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData?.employeeSummary || []).length > 0 ? (
                      reportData.employeeSummary.map((emp, index) => (
                        <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-xs">{emp.employeeName}</span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[11px] font-bold border border-gray-200">
                                <IdCard className="w-2.5 h-2.5 text-gray-400" />
                                {emp.empId || emp.employeeId}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-gray-600 text-xs whitespace-nowrap">{emp.department}</td>
                          <td className="p-3.5 font-semibold text-gray-800 text-center">{emp.sessionsCount}</td>
                          <td className="p-3.5 font-extrabold text-amber-700 text-center">{emp.totalDurationHours} hrs</td>
                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {emp.durationFormatted}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-emerald-700 text-xs">
                            {emp.approvedHoursTotal > 0 ? `${emp.approvedHoursTotal} hrs` : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 text-xs">
                          No employee overtime summary data found matching filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUEST DETAILS MODAL */}
      {viewRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Overtime Request History Details
              </h3>
              <button onClick={() => setViewRequestModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl">
                <div>
                  <span className="text-gray-500 block">Employee:</span>
                  <p className="font-bold text-gray-900 text-sm">{viewRequestModal.employee?.name || viewRequestModal.employeeName}</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Department:</span>
                  <p className="font-semibold text-gray-900">{viewRequestModal.employee?.department || viewRequestModal.department || "General"}</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Target Date:</span>
                  <p className="font-semibold text-gray-900">{viewRequestModal.date}</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Time Window:</span>
                  <p className="font-semibold text-gray-900">{viewRequestModal.startTime && viewRequestModal.endTime ? `${viewRequestModal.startTime} - ${viewRequestModal.endTime}` : "Flexible"}</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Requested Hours:</span>
                  <p className="font-bold text-gray-900">{viewRequestModal.requestedHours} hrs</p>
                </div>
                <div>
                  <span className="text-gray-500 block">Approved Hours:</span>
                  <p className="font-bold text-green-700">{viewRequestModal.approvedHours !== null && viewRequestModal.approvedHours !== undefined ? `${viewRequestModal.approvedHours} hrs` : "--"}</p>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-bold block mb-1">Reason & Justification:</span>
                <div className="bg-gray-50 p-3 rounded-lg text-gray-800 leading-relaxed border border-gray-100">
                  {viewRequestModal.reason}
                </div>
              </div>

              {viewRequestModal.project && (
                <div>
                  <span className="text-gray-500 font-bold block mb-1">Associated Project / Activity:</span>
                  <p className="font-semibold text-gray-900">{viewRequestModal.project}</p>
                </div>
              )}

              {viewRequestModal.supervisorNotes && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                  <span className="font-bold block mb-0.5">Supervisor Decision Note:</span>
                  <p>{viewRequestModal.supervisorNotes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                <span>Created: {new Date(viewRequestModal.createdAt).toLocaleString()}</span>
                <span>Status: <strong className="uppercase text-gray-700">{viewRequestModal.status}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRequestModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST APPROVAL / REJECTION MODAL */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {approvalAction === "approved" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                {approvalAction === "approved" ? "Approve Overtime Request" : "Reject Overtime Request"}
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary */}
            <div className="bg-gray-50 rounded-xl p-3.5 text-xs space-y-1.5 border border-gray-100">
              <p>
                <strong className="text-gray-700">Employee:</strong> {selectedRequest.employee?.name || selectedRequest.employeeName}
              </p>
              <p>
                <strong className="text-gray-700">Date:</strong> {selectedRequest.date} ({selectedRequest.startTime || "Start"} to {selectedRequest.endTime || "End"})
              </p>
              <p>
                <strong className="text-gray-700">Requested Hours:</strong> {selectedRequest.requestedHours} hrs
              </p>
              <p>
                <strong className="text-gray-700">Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            {approvalAction === "approved" && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Authorized Approved Hours *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={approvedHours}
                  onChange={(e) => setApprovedHours(parseFloat(e.target.value) || 1)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {approvalAction === "approved" ? "Supervisor Notes / Directives (Optional)" : "Rejection Reason *"}
              </label>
              <textarea
                rows={3}
                placeholder={
                  approvalAction === "approved"
                    ? "Optional notes for the employee..."
                    : "Specify why this overtime request is rejected..."
                }
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApproval}
                disabled={actionLoading}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 ${
                  approvalAction === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm {approvalAction === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERTIME ATTENDANCE REVIEW & VERIFY (APPROVE/REJECT) MODAL */}
      {showAttendanceReviewModal && selectedAttendance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  Overtime Attendance Review & Verification
                </h3>
                <p className="text-xs text-gray-500">
                  Inspect time taken, GPS location, and facial photo proofs to approve or reject overtime attendance.
                </p>
              </div>
              <button onClick={() => setShowAttendanceReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Employee & Date Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {selectedAttendance.employee?.name || selectedAttendance.employeeName}
                </h4>
                <p className="text-xs text-gray-600">
                  {selectedAttendance.employee?.department || selectedAttendance.department || "General"} | Date: <strong>{selectedAttendance.date}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-amber-800 block font-semibold">Total Time Taken / Worked:</span>
                <span className="text-xl font-extrabold text-amber-900">
                  {selectedAttendance.durationFormatted || `${selectedAttendance.durationHours || 0} hrs`}
                </span>
              </div>
            </div>

            {/* Side-by-side Check-In and Check-Out Proofs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-In Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Check-In Details
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900">
                    {selectedAttendance.checkInTime ? new Date(selectedAttendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--"}
                  </span>
                </div>

                {/* Photo */}
                <div className="text-center">
                  {selectedAttendance.checkInPhoto ? (
                    <div className="relative group cursor-pointer" onClick={() => {
                      setSelectedPhoto(selectedAttendance.checkInPhoto);
                      setShowPhotoViewer(true);
                    }}>
                      <img
                        src={selectedAttendance.checkInPhoto}
                        alt="Check-in Photo"
                        className="w-full h-36 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Click to Enlarge
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs">
                      <Camera className="w-6 h-6 mb-1" /> No Photo Captured
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-gray-800">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    {selectedAttendance.geofenceValidation?.isValid ? "Within Designated Geofence" : "Location Captured"}
                  </div>
                  {selectedAttendance.checkInLocation && (
                    <p className="text-[11px] font-mono text-gray-500 truncate">
                      Lat: {selectedAttendance.checkInLocation.latitude?.toFixed(5)}, Lon: {selectedAttendance.checkInLocation.longitude?.toFixed(5)}
                    </p>
                  )}
                  {selectedAttendance.checkInNotes && (
                    <p className="text-[11px] bg-white p-2 rounded border text-gray-700">
                      <strong>Notes:</strong> {selectedAttendance.checkInNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Check-Out Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Check-Out Details
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900">
                    {selectedAttendance.checkOutTime ? new Date(selectedAttendance.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "In Progress"}
                  </span>
                </div>

                {/* Photo */}
                <div className="text-center">
                  {selectedAttendance.checkOutPhoto ? (
                    <div className="relative group cursor-pointer" onClick={() => {
                      setSelectedPhoto(selectedAttendance.checkOutPhoto);
                      setShowPhotoViewer(true);
                    }}>
                      <img
                        src={selectedAttendance.checkOutPhoto}
                        alt="Check-out Photo"
                        className="w-full h-36 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex items-center justify-center text-white text-xs font-bold gap-1">
                        <Eye className="w-4 h-4" /> Click to Enlarge
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs">
                      <Camera className="w-6 h-6 mb-1" /> {selectedAttendance.checkOutTime ? "No Photo" : "Session In Progress"}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-gray-800">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    {selectedAttendance.checkOutLocation ? "Check-Out Location Captured" : "Awaiting check-out"}
                  </div>
                  {selectedAttendance.checkOutLocation && (
                    <p className="text-[11px] font-mono text-gray-500 truncate">
                      Lat: {selectedAttendance.checkOutLocation.latitude?.toFixed(5)}, Lon: {selectedAttendance.checkOutLocation.longitude?.toFixed(5)}
                    </p>
                  )}
                  {selectedAttendance.checkOutNotes && (
                    <p className="text-[11px] bg-white p-2 rounded border text-gray-700">
                      <strong>Notes:</strong> {selectedAttendance.checkOutNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Decision Action Area */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-gray-800 uppercase block">
                Admin Overtime Attendance Decision
              </span>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAttendanceReviewAction("approved")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    attendanceReviewAction === "approved"
                      ? "bg-green-600 text-white border-green-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Approve Attendance
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceReviewAction("rejected")}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    attendanceReviewAction === "rejected"
                      ? "bg-red-600 text-white border-red-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Reject Attendance
                </button>
              </div>

              {attendanceReviewAction === "approved" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Verified Overtime Hours to Credit for Payroll *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    value={approvedAttendanceHours}
                    onChange={(e) => setApprovedAttendanceHours(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Actual calculated duration worked: <strong>{selectedAttendance.durationFormatted || `${selectedAttendance.durationHours || 0} hrs`}</strong>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {attendanceReviewAction === "approved" ? "Admin / Supervisor Verification Notes (Optional)" : "Rejection Reason / Discrepancy Notes *"}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    attendanceReviewAction === "approved"
                      ? "e.g. Photo and location verified, approved for payroll calculation."
                      : "e.g. Invalid photo, or employee was outside geofence during work session."
                  }
                  value={attendanceAdminNotes}
                  onChange={(e) => setAttendanceAdminNotes(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowAttendanceReviewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAttendanceReview}
                disabled={actionLoading}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all ${
                  attendanceReviewAction === "approved"
                    ? "bg-green-600 hover:bg-green-700 shadow-green-600/20"
                    : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                }`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Attendance {attendanceReviewAction === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-res Photo Viewer Modal */}
      {showPhotoViewer && selectedPhoto && (
        <AttendancePhotoViewer
          photoUrl={selectedPhoto}
          title="Overtime Attendance Photo Proof"
          onClose={() => {
            setShowPhotoViewer(false);
            setSelectedPhoto(null);
          }}
        />
      )}
    </div>
  );
}
