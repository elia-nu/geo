"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Send,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Download,
  Users,
  TrendingUp,
  ChevronDown,
  Shield,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

export default function ManagerLeaveApproval({
  managerId,
  managerName = "Manager",
}) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [filters, setFilters] = useState({
    status: "pending",
    department: "",
    leaveType: "",
    dateRange: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLeaveRequests();
  }, [managerId, filters]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        status: filters.status,
        ...(filters.department && { department: filters.department }),
        ...(filters.leaveType && { leaveType: filters.leaveType }),
        ...(filters.dateRange !== "all" && { dateRange: filters.dateRange }),
        ...(searchTerm && { search: searchTerm }),
      });

      // Only add managerId if it's provided
      if (managerId) {
        queryParams.append("managerId", managerId);
      }

      const response = await fetch(
        `/api/leave/approval-routing/requests?${queryParams}`
      );
      const result = await response.json();

      if (result.success) {
        setLeaveRequests(result.data);
      } else {
        showMessage(result.error || "Failed to load leave requests", "error");
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
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else if (type === "warning") toast.warning(msg);
    else toast.info(msg);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleApprovalAction = (request, action) => {
    setSelectedRequest(request);
    setApprovalAction(action);
    setApprovalNotes("");
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedRequest || !approvalAction) return;

    if (approvalAction === "reject" && !approvalNotes.trim()) {
      showMessage("Please provide a reason for rejection", "error");
      return;
    }

    try {
      const response = await fetch("/api/leave/approval-routing/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveRequestId: selectedRequest._id,
          action: approvalAction,
          managerId,
          managerName,
          notes: approvalNotes.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage(`Leave request ${approvalAction}d successfully`, "success");
        setShowApprovalModal(false);
        fetchLeaveRequests(); // Refresh the list
      } else {
        showMessage(
          result.error || `Failed to ${approvalAction} leave request`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      showMessage(`Failed to ${approvalAction} leave request`, "error");
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "approved":
        return {
          text: "Approved",
          color: "text-green-600",
          bgColor: "bg-green-100",
          icon: CheckCircle,
        };
      case "rejected":
        return {
          text: "Rejected",
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: XCircle,
        };
      case "pending":
        return {
          text: "Pending",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: Clock,
        };
      default:
        return {
          text: "Unknown",
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          icon: AlertCircle,
        };
    }
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      annual: "bg-blue-100 text-blue-800",
      sick: "bg-red-100 text-red-800",
      personal: "bg-purple-100 text-purple-800",
      maternity: "bg-pink-100 text-pink-800",
      paternity: "bg-indigo-100 text-indigo-800",
      bereavement: "bg-gray-100 text-gray-800",
    };
    return colors[leaveType] || "bg-gray-100 text-gray-800";
  };

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Exclude weekends (Saturday = 6, Sunday = 0)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days++;
      }
    }

    return days;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const filteredRequests = leaveRequests.filter((request) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        request.employeeName.toLowerCase().includes(searchLower) ||
        request.leaveType.toLowerCase().includes(searchLower) ||
        request.reason.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const totalPages = Math.ceil((filteredRequests.length || 0) / itemsPerPage) || 1;
  const paginatedRequests = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 shadow-xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-500/10 rounded-full" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-300" />
                </div>
                <h1 className="text-2xl font-bold text-white">Leave Management</h1>
              </div>
              <p className="text-indigo-200 text-sm">
                Review and manage leave requests from your team
              </p>
            </div>
            <button
              onClick={fetchLeaveRequests}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors self-start"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-yellow-300">
                {leaveRequests.filter((r) => r.status === "pending").length}
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">Pending</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-300">
                {leaveRequests.filter((r) => r.status === "approved").length}
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">Approved</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-300">
                {leaveRequests.filter((r) => r.status === "rejected").length}
              </p>
              <p className="text-xs text-indigo-200 mt-0.5">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            messageType === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : messageType === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 text-black text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Leave Type
            </label>
            <select
              value={filters.leaveType}
              onChange={(e) =>
                setFilters({ ...filters, leaveType: e.target.value })
              }
              className="w-full px-3 py-2 text-black text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="annual">Annual Leave</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              className="w-full px-3 py-2 text-black text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
              className="w-full px-3 py-2 text-black text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-black text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-800">
              Leave Requests
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredRequests.length})
              </span>
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-400 text-sm">Loading requests...</p>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div>
            <div className="divide-y divide-gray-50">
              {paginatedRequests.map((request, index) => {
                const status = getStatusDisplay(request.status);
                const StatusIcon = status.icon;
                const leaveDays = calculateLeaveDays(
                  request.startDate,
                  request.endDate
                );
                const empName = request.employeeName || "Employee";
                const initials = empName
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div key={index} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Avatar + Name */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {request.employeeName}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getLeaveTypeColor(request.leaveType)}`}
                            >
                              {request.leaveType}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {request.department} {request.designation && `· ${request.designation}`}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatDate(request.startDate)} → {formatDate(request.endDate)}
                            <span className="ml-2 text-gray-400">({leaveDays} working days)</span>
                          </p>
                          {request.reason && (
                            <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">
                              "{request.reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Status + Actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.text}
                        </span>
                        {request.status === "pending" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleApprovalAction(request, "approve")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleApprovalAction(request, "reject")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approval History */}
                    {request.approvalHistory && request.approvalHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Approval History</p>
                        <div className="space-y-1">
                          {request.approvalHistory.map((approval, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-gray-500">
                              <span>
                                <span className="font-medium text-gray-700">{approval.approverName}</span>
                                {" "}&mdash; {approval.action}
                              </span>
                              <span>{new Date(approval.approvedAt).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRequests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(sz) => {
                  setItemsPerPage(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium">No leave requests found</p>
            <p className="text-gray-400 text-sm">
              {filters.status === "pending"
                ? "No pending requests to review"
                : "No requests match your filters"}
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-black">
              {approvalAction === "approve" ? "Approve" : "Reject"} Leave
              Request
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Employee:{" "}
                <span className="font-medium">
                  {selectedRequest.employeeName}
                </span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Leave Type:{" "}
                <span className="font-medium capitalize">
                  {selectedRequest.leaveType}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Duration:{" "}
                <span className="font-medium">
                  {formatDate(selectedRequest.startDate)} -{" "}
                  {formatDate(selectedRequest.endDate)}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {approvalAction === "approve" ? "Approval" : "Rejection"} Notes
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                className="w-full p-3 text-black  border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  approvalAction === "approve"
                    ? "Optional approval notes..."
                    : "Please provide a reason for rejection..."
                }
              />
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={submitApproval}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors ${
                  approvalAction === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {approvalAction === "approve" ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
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
