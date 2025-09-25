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
} from "lucide-react";

export default function ManagerLeaveApproval({
  managerId,
  managerName = "Manager",
}) {
  const [leaveRequests, setLeaveRequests] = useState([]);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Leave Request Approval
          </h1>
          <p className="text-gray-600 mt-1">
            Review and approve leave requests from your team
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLeaveRequests}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : messageType === "error"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type
            </label>
            <select
              value={filters.leaveType}
              onChange={(e) =>
                setFilters({ ...filters, leaveType: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="annual">Annual</option>
              <option value="sick">Sick</option>
              <option value="personal">Personal</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
              <option value="bereavement">Bereavement</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Leave Requests ({filteredRequests.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => {
              const status = getStatusDisplay(request.status);
              const StatusIcon = status.icon;
              const leaveDays = calculateLeaveDays(
                request.startDate,
                request.endDate
              );

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.employeeName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {request.department}
                        </p>
                        <p className="text-sm text-gray-600">
                          {request.designation}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="w-5 h-5" />
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Leave Type:
                      </span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getLeaveTypeColor(
                            request.leaveType
                          )}`}
                        >
                          {request.leaveType}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Duration:
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(request.startDate)} -{" "}
                        {formatDate(request.endDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {leaveDays} working days
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Submitted:
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(request.submittedAt)}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Reason:
                      </span>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {request.reason}
                      </p>
                    </div>
                  </div>

                  {/* Approval Actions */}
                  {request.status === "pending" && (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprovalAction(request, "approve")}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleApprovalAction(request, "reject")}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {/* Approval History */}
                  {request.approvalHistory &&
                    request.approvalHistory.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Approval History:
                        </h4>
                        <div className="space-y-2">
                          {request.approvalHistory.map((approval, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm"
                            >
                              <div>
                                <span className="font-medium">
                                  {approval.approverName}
                                </span>
                                <span className="text-gray-600">
                                  {" "}
                                  - {approval.action}
                                </span>
                              </div>
                              <span className="text-gray-500">
                                {new Date(
                                  approval.approvedAt
                                ).toLocaleDateString()}
                              </span>
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
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leave requests found
            </h3>
            <p className="text-gray-600">
              {filters.status === "pending"
                ? "No pending leave requests to review"
                : "No leave requests match your current filters"}
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
