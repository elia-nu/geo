"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function LeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    leaveType: "all",
    department: "all",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, [filters]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.leaveType !== "all")
        params.append("leaveType", filters.leaveType);
      if (filters.department !== "all")
        params.append("department", filters.department);

      const response = await fetch(
        `/api/leave/approval-routing/requests?${params.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        console.log("Leave requests received:", result.data);
        if (result.data.length > 0) {
          console.log("Sample leave request structure:", result.data[0]);
          console.log("Sample leave request _id:", result.data[0]._id);
        }
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

  const handleRequestClick = (request) => {
    console.log("Request clicked:", request);
    console.log("Request _id:", request._id);
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleApprove = async (requestId, action) => {
    try {
      console.log(`Attempting to ${action} request:`, requestId);
      console.log(`Selected request object:`, selectedRequest);
      console.log(`Selected request _id:`, selectedRequest?._id);
      console.log(
        `Selected request _id toString:`,
        selectedRequest?._id?.toString()
      );

      const response = await fetch("/api/leave/approval-routing/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action,
          comments: `${action}ed via calendar`,
        }),
      });

      const result = await response.json();
      console.log(`Approval response:`, result);

      if (result.success) {
        showMessage(`Leave request ${action}d successfully`, "success");
        setShowModal(false);
        fetchLeaveRequests();

        // Dispatch custom event to notify other components of leave balance update
        if (action === "approve") {
          window.dispatchEvent(
            new CustomEvent("leaveBalanceUpdated", {
              detail: {
                employeeId: selectedRequest.employeeId,
                leaveType: selectedRequest.leaveType,
                action: "approved",
              },
            })
          );
        }
      } else {
        showMessage(
          result.error || `Failed to ${action} leave request`,
          "error"
        );
      }
    } catch (error) {
      console.error(`Error ${action}ing leave request:`, error);
      showMessage(`Failed to ${action} leave request`, "error");
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getLeaveRequestsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return leaveRequests.filter((request) => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      return date >= startDate && date <= endDate;
    });
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      annual: "bg-blue-100 text-blue-800 border-blue-200",
      sick: "bg-red-100 text-red-800 border-red-200",
      personal: "bg-purple-100 text-purple-800 border-purple-200",
      maternity: "bg-pink-100 text-pink-800 border-pink-200",
      paternity: "bg-indigo-100 text-indigo-800 border-indigo-200",
      bereavement: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[leaveType] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-200"></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      const dayRequests = getLeaveRequestsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-1 ${
            isToday ? "bg-blue-50" : "bg-white"
          } hover:bg-gray-50`}
        >
          <div className="flex justify-between items-start mb-1">
            <span
              className={`text-sm font-medium ${
                isToday ? "text-blue-600" : "text-gray-900"
              }`}
            >
              {day}
            </span>
            {isToday && (
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            )}
          </div>
          <div className="space-y-1">
            {dayRequests.slice(0, 2).map((request, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded border cursor-pointer ${getLeaveTypeColor(
                  request.leaveType
                )}`}
                onClick={() => handleRequestClick(request)}
                title={`${request.employeeName} - ${request.leaveType} leave`}
              >
                <div className="truncate">{request.employeeName}</div>
                <div className="truncate">{request.leaveType}</div>
              </div>
            ))}
            {dayRequests.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayRequests.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Calendar</h1>
          <p className="text-gray-600 mt-1">
            View and manage leave requests in calendar format
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
            <AlertCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filters.leaveType}
            onChange={(e) =>
              setFilters({ ...filters, leaveType: e.target.value })
            }
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Leave Types</option>
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="maternity">Maternity</option>
            <option value="paternity">Paternity</option>
            <option value="bereavement">Bereavement</option>
          </select>

          <select
            value={filters.department}
            onChange={(e) =>
              setFilters({ ...filters, department: e.target.value })
            }
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Departments</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>

          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
          {/* Day Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-gray-100 p-2 text-center font-medium text-gray-700"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {renderCalendar()}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Leave Requests Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {leaveRequests.filter((r) => r.status === "pending").length}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {leaveRequests.filter((r) => r.status === "approved").length}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {leaveRequests.filter((r) => r.status === "rejected").length}
            </p>
          </div>
        </div>
      </div>

      {/* Request Details Modal */}
      {showModal &&
        selectedRequest &&
        (() => {
          console.log("Modal showing with selectedRequest:", selectedRequest);
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    Leave Request Details
                  </h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Employee
                    </label>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-900">
                        {selectedRequest.employeeName}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Leave Type
                    </label>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(
                        selectedRequest.leaveType
                      )}`}
                    >
                      {selectedRequest.leaveType}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration
                    </label>
                    <span className="text-gray-900">
                      {new Date(selectedRequest.startDate).toLocaleDateString()}{" "}
                      - {new Date(selectedRequest.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        selectedRequest.status
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>

                  {selectedRequest.reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason
                      </label>
                      <p className="text-gray-900 text-sm">
                        {selectedRequest.reason}
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "pending" && (
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => {
                          console.log(
                            "Approve button clicked, selectedRequest:",
                            selectedRequest
                          );
                          if (selectedRequest && selectedRequest._id) {
                            handleApprove(selectedRequest._id, "approve");
                          } else {
                            console.error(
                              "selectedRequest or _id is missing:",
                              selectedRequest
                            );
                          }
                        }}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          console.log(
                            "Reject button clicked, selectedRequest:",
                            selectedRequest
                          );
                          if (selectedRequest && selectedRequest._id) {
                            handleApprove(selectedRequest._id, "reject");
                          } else {
                            console.error(
                              "selectedRequest or _id is missing:",
                              selectedRequest
                            );
                          }
                        }}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
