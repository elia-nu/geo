"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function EmployeeLeaveRequest({ employeeId, employeeName }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Form state
  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    documents: [],
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, [employeeId]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/documents?employeeId=${employeeId}&type=leave`
      );
      const result = await response.json();

      if (result.success) {
        setLeaveRequests(result.data);
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
      documents: files,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.leaveType ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.reason
    ) {
      showMessage("Please fill in all required fields", "error");
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
      formData.documents.forEach((file, index) => {
        submitData.append("documents", file);
      });

      const response = await fetch("/api/attendance/documents", {
        method: "POST",
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        showMessage("Leave request submitted successfully", "success");
        setShowForm(false);
        setFormData({
          leaveType: "",
          startDate: "",
          endDate: "",
          reason: "",
          documents: [],
        });
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-600 mt-1">
            Submit and track your leave requests
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Request</span>
        </button>
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

      {/* Leave Request Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            <span>Submit Leave Request</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type *
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select leave type</option>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="bereavement">Bereavement Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Leave *
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a detailed reason for your leave request..."
                required
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{loading ? "Submitting..." : "Submit Request"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <span>My Leave Requests</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : leaveRequests.length > 0 ? (
          <div className="space-y-4">
            {leaveRequests.map((request, index) => {
              const status = getStatusDisplay(request.status);
              const StatusIcon = status.icon;

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {request.leaveType} Leave
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatDate(request.startDate)} -{" "}
                          {formatDate(request.endDate)}
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

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Reason:
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {request.reason}
                      </p>
                    </div>

                    {request.submittedAt && (
                      <div className="text-xs text-gray-500">
                        Submitted on {formatDate(request.submittedAt)}
                      </div>
                    )}

                    {request.status === "rejected" &&
                      request.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <span className="text-sm font-medium text-red-700">
                            Rejection Reason:
                          </span>
                          <p className="text-sm text-red-600 mt-1">
                            {request.rejectionReason}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No leave requests yet
            </h3>
            <p className="text-gray-600">
              Submit your first leave request to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
