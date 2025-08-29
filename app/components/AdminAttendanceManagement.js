"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

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
    recordsPerPage: 20,
  });

  useEffect(() => {
    fetchAttendanceRecords();
  }, [filters, pagination.currentPage]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.status) params.append("status", filters.status);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("page", pagination.currentPage.toString());
      params.append("limit", pagination.recordsPerPage.toString());

      const url = `/api/attendance/approve?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setAttendanceRecords(result.data);
        setPagination(result.pagination);
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
    setTimeout(() => {
      setMessage("");
    }, 5000);
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
          adminId: "admin", // Replace with actual admin ID
          adminNotes: adminNotes.trim(),
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage(`Attendance ${approvalAction}d successfully`, "success");
        setShowApprovalModal(false);
        fetchAttendanceRecords(); // Refresh the list
      } else {
        showMessage(
          result.error || `Failed to ${approvalAction} attendance`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      showMessage(`Failed to ${approvalAction} attendance`, "error");
    }
  };

  const getStatusDisplay = (record) => {
    const status = record.approvalStatus || "pending";
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
          icon: AlertCircle,
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

  const filteredRecords = attendanceRecords.filter((record) => {
    if (!filters.searchTerm) return true;

    const searchLower = filters.searchTerm.toLowerCase();
    return (
      record.employeeName?.toLowerCase().includes(searchLower) ||
      record.employeeEmail?.toLowerCase().includes(searchLower) ||
      record.department?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance Management
          </h1>
          <p className="text-gray-600 mt-1">
            Review and approve employee attendance records
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{pagination.totalRecords} records</span>
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by employee name, email, or department..."
                value={filters.searchTerm}
                onChange={(e) =>
                  handleFilterChange("searchTerm", e.target.value)
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchAttendanceRecords}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Attendance Records
            </h2>
            <p className="text-sm text-gray-600">
              {filteredRecords.length} of {pagination.totalRecords} records
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const status = getStatusDisplay(record);
              const StatusIcon = status.icon;
              const workingHours = calculateWorkingHours(
                record.checkInTime,
                record.checkOutTime
              );

              return (
                <div
                  key={record._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {record.employeeName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className="w-5 h-5" />
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                        >
                          {status.text}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(record.date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.date).toLocaleDateString([], {
                            weekday: "long",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Check-in
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        {formatTime(record.checkInTime)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Check-out
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        {formatTime(record.checkOutTime)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Timer className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Hours
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        {workingHours ? `${workingHours}h` : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <MapPin className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Location
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        {record.workLocationName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      {record.checkInPhoto && (
                        <div className="flex items-center space-x-1 text-sm text-blue-600">
                          <Camera className="w-4 h-4" />
                          <span>Photo Available</span>
                        </div>
                      )}
                      {record.faceVerified && (
                        <div className="flex items-center space-x-1 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Face Verified</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>

                      {record.approvalStatus === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleApprovalAction(record, "approve")
                            }
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() =>
                              handleApprovalAction(record, "reject")
                            }
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
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
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No attendance records found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing{" "}
              {(pagination.currentPage - 1) * pagination.recordsPerPage + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.recordsPerPage,
                pagination.totalRecords
              )}{" "}
              of {pagination.totalRecords} records
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    currentPage: prev.currentPage - 1,
                  }))
                }
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1">
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
                        className={`px-3 py-1 rounded-lg ${
                          pagination.currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 hover:bg-gray-50"
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
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

      {/* Approval Modal */}
      {showApprovalModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {approvalAction === "approve" ? "Approve" : "Reject"} Attendance
              </h3>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Employee:</strong> {selectedRecord.employeeName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Date:</strong> {formatDate(selectedRecord.date)}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Hours:</strong>{" "}
                  {calculateWorkingHours(
                    selectedRecord.checkInTime,
                    selectedRecord.checkOutTime
                  ) || "N/A"}
                  h
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this attendance record..."
                />
              </div>

              {approvalAction === "reject" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide a reason for rejection..."
                    required
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={submitApproval}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-white ${
                    approvalAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {approvalAction === "approve" ? "Approve" : "Reject"}
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            Attendance Details
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Employee Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <p className="text-gray-900">{record.employeeName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Email:
                </span>
                <p className="text-gray-900">{record.employeeEmail || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Department:
                </span>
                <p className="text-gray-900">{record.department || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Employee ID:
                </span>
                <p className="text-gray-900">{record.employeeId}</p>
              </div>
            </div>
          </div>

          {/* Attendance Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Attendance Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Date:</span>
                <p className="text-gray-900">{formatDate(record.date)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Working Hours:
                </span>
                <p className="text-gray-900">
                  {calculateWorkingHours(
                    record.checkInTime,
                    record.checkOutTime
                  ) || "N/A"}
                  h
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Check-in Time:
                </span>
                <p className="text-gray-900">
                  {formatTime(record.checkInTime)}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Check-out Time:
                </span>
                <p className="text-gray-900">
                  {formatTime(record.checkOutTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-green-600" />
              <span>Location Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Work Location:
                </span>
                <p className="text-gray-900">{record.workLocationName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Location Verified:
                </span>
                <p className="text-gray-900">
                  {record.checkInLocation ? "Yes" : "No"}
                </p>
              </div>
              {record.checkInLocation && (
                <>
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      Check-in Coordinates:
                    </span>
                    <p className="text-gray-900 font-mono text-sm">
                      {record.checkInLocation.latitude?.toFixed(6)},{" "}
                      {record.checkInLocation.longitude?.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      Check-out Coordinates:
                    </span>
                    <p className="text-gray-900 font-mono text-sm">
                      {record.checkOutLocation
                        ? `${record.checkOutLocation.latitude?.toFixed(
                            6
                          )}, ${record.checkOutLocation.longitude?.toFixed(6)}`
                        : "N/A"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Verification Information */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-purple-600" />
              <span>Verification Information</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Face Verified:
                </span>
                <p className="text-gray-900">
                  {record.faceVerified ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Photo Available:
                </span>
                <p className="text-gray-900">
                  {record.checkInPhoto ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Display Photos */}
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {record.checkInPhoto && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">
                      Check-in Photo:
                    </span>
                    <img
                      src={record.checkInPhoto}
                      alt="Check-in photo"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                {record.checkOutPhoto && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">
                      Check-out Photo:
                    </span>
                    <img
                      src={record.checkOutPhoto}
                      alt="Check-out photo"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {(record.checkInNotes || record.checkOutNotes) && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                <span>Employee Notes</span>
              </h4>
              {record.checkInNotes && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Check-in Notes:
                  </span>
                  <p className="text-gray-900">{record.checkInNotes}</p>
                </div>
              )}
              {record.checkOutNotes && (
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Check-out Notes:
                  </span>
                  <p className="text-gray-900">{record.checkOutNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Admin Review */}
          {record.adminApproval && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                <span>Admin Review</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Status:
                  </span>
                  <p className="text-gray-900 capitalize">
                    {record.adminApproval.status}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">
                    Reviewed At:
                  </span>
                  <p className="text-gray-900">
                    {formatTime(record.adminApproval.reviewedAt)}
                  </p>
                </div>
                {record.adminApproval.adminNotes && (
                  <div className="md:col-span-2">
                    <span className="text-sm font-medium text-gray-600">
                      Admin Notes:
                    </span>
                    <p className="text-gray-900">
                      {record.adminApproval.adminNotes}
                    </p>
                  </div>
                )}
                {record.adminApproval.rejectionReason && (
                  <div className="md:col-span-2">
                    <span className="text-sm font-medium text-gray-600">
                      Rejection Reason:
                    </span>
                    <p className="text-red-700">
                      {record.adminApproval.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
