"use client";

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Download,
  Eye,
  Filter,
} from "lucide-react";

export default function EmployeeRequestStatus({ employeeId, employeeName }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [employeeId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/documents?employeeId=${employeeId}`
      );
      const result = await response.json();

      if (result.success) {
        setRequests(result.data);
      }
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
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      status: "",
    });
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

  const getTypeDisplay = (type) => {
    switch (type) {
      case "leave":
        return {
          text: "Leave Request",
          icon: Calendar,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
        };
      case "document":
        return {
          text: "Document Upload",
          icon: FileText,
          color: "text-purple-600",
          bgColor: "bg-purple-100",
        };
      case "absence":
        return {
          text: "Absence Request",
          icon: AlertCircle,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
        };
      default:
        return {
          text: "Other Request",
          icon: FileText,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
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

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRequests = requests.filter((request) => {
    if (filters.type && request.type !== filters.type) return false;
    if (filters.status && request.status !== filters.status) return false;
    return true;
  });

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Status</h1>
          <p className="text-gray-600 mt-1">
            Track the status of your submitted requests
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="leave">Leave Requests</option>
                <option value="document">Document Uploads</option>
                <option value="absence">Absence Requests</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <AlertCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">My Requests</h2>
            <p className="text-sm text-gray-600">
              {filteredRequests.length} request
              {filteredRequests.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => {
              const status = getStatusDisplay(request.status);
              const type = getTypeDisplay(request.type);
              const StatusIcon = status.icon;
              const TypeIcon = type.icon;

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${type.bgColor}`}>
                        <TypeIcon className={`w-6 h-6 ${type.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {type.text}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Submitted on {formatDateTime(request.submittedAt)}
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

                  <div className="space-y-4">
                    {/* Request Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Request Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          {request.type === "leave" && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Leave Type:
                                </span>
                                <span className="font-medium capitalize">
                                  {request.leaveType}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  Start Date:
                                </span>
                                <span className="font-medium">
                                  {formatDate(request.startDate)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">End Date:</span>
                                <span className="font-medium">
                                  {formatDate(request.endDate)}
                                </span>
                              </div>
                            </>
                          )}
                          {request.reason && (
                            <div>
                              <span className="text-gray-600">Reason:</span>
                              <p className="text-gray-900 mt-1">
                                {request.reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Status Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          {request.reviewedAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Reviewed on:
                              </span>
                              <span className="font-medium">
                                {formatDateTime(request.reviewedAt)}
                              </span>
                            </div>
                          )}
                          {request.reviewedBy && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Reviewed by:
                              </span>
                              <span className="font-medium">
                                {request.reviewedBy}
                              </span>
                            </div>
                          )}
                          {request.status === "rejected" &&
                            request.rejectionReason && (
                              <div>
                                <span className="text-gray-600">
                                  Rejection Reason:
                                </span>
                                <p className="text-red-600 mt-1">
                                  {request.rejectionReason}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Attached Documents */}
                    {request.documents && request.documents.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          Attached Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc, docIndex) => (
                            <div
                              key={docIndex}
                              className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg"
                            >
                              <FileText className="w-4 h-4 text-gray-600" />
                              <span className="text-sm text-gray-700">
                                {doc.filename}
                              </span>
                              <button
                                onClick={() =>
                                  downloadDocument(doc._id, doc.filename)
                                }
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No requests found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or submit a new request
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
