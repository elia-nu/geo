"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Plus,
  Loader2,
  X,
  Paperclip,
  User,
  MessageSquare,
} from "lucide-react";

export default function AttendanceDocuments({ employeeId, employeeName }) {
  // State management
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Form state
  const [formData, setFormData] = useState({
    type: "absence",
    requestDate: new Date().toISOString().split("T")[0],
    reason: "",
    description: "",
    startDate: "",
    endDate: "",
    attendanceId: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Document types
  const documentTypes = [
    {
      value: "absence",
      label: "Absence Request",
      description: "Request for planned absence",
    },
    {
      value: "late",
      label: "Late Arrival",
      description: "Explanation for late check-in",
    },
    {
      value: "early",
      label: "Early Departure",
      description: "Request for early check-out",
    },
    {
      value: "medical",
      label: "Medical Certificate",
      description: "Medical documentation",
    },
    {
      value: "other",
      label: "Other",
      description: "Other attendance-related documents",
    },
  ];

  // Fetch documents on component mount
  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
    }
  }, [employeeId]);

  // Fetch employee's attendance documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/attendance/documents?employeeId=${employeeId}`
      );
      const result = await response.json();

      if (result.success) {
        setDocuments(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      showMessage("Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  };

  // Show message to user
  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit document/request
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      showMessage("Please provide a reason for your request", "error");
      return;
    }

    setSubmitting(true);

    try {
      const submitFormData = new FormData();

      // Add form fields
      submitFormData.append("employeeId", employeeId);
      submitFormData.append("type", formData.type);
      submitFormData.append("requestDate", formData.requestDate);
      submitFormData.append("reason", formData.reason);
      submitFormData.append("description", formData.description);

      if (formData.startDate) {
        submitFormData.append("startDate", formData.startDate);
      }
      if (formData.endDate) {
        submitFormData.append("endDate", formData.endDate);
      }
      if (formData.attendanceId) {
        submitFormData.append("attendanceId", formData.attendanceId);
      }

      // Add files
      selectedFiles.forEach((file) => {
        submitFormData.append("documents", file);
      });

      const response = await fetch("/api/attendance/documents", {
        method: "POST",
        body: submitFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to submit document", "error");
        return;
      }

      // Success
      showMessage(
        "Document submitted successfully! Awaiting supervisor review.",
        "success"
      );

      // Reset form
      setFormData({
        type: "absence",
        requestDate: new Date().toISOString().split("T")[0],
        reason: "",
        description: "",
        startDate: "",
        endDate: "",
        attendanceId: "",
      });
      setSelectedFiles([]);
      setIsSubmitModalOpen(false);

      // Refresh documents list
      await fetchDocuments();
    } catch (error) {
      console.error("Error submitting document:", error);
      showMessage("Failed to submit document", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString();
  };

  // Get status info
  const getStatusInfo = (status) => {
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
      default:
        return {
          text: "Pending",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          icon: Clock,
        };
    }
  };

  // Get document type label
  const getTypeLabel = (type) => {
    const docType = documentTypes.find((t) => t.value === type);
    return docType ? docType.label : type;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Attendance Documents</h1>
              <p className="text-purple-100">
                Submit requests and upload supporting documents
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Request</span>
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

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Your Requests & Documents
          </h2>
          <p className="text-gray-600 mt-1">
            Track the status of your submitted requests
          </p>
        </div>

        <div className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span>Loading documents...</span>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No documents submitted
              </h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any attendance requests or documents yet.
              </p>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Your First Request</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Files
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => {
                    const status = getStatusInfo(doc.status);
                    const StatusIcon = status.icon;

                    return (
                      <tr key={doc._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <FileText className="w-4 h-4 text-purple-600" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {getTypeLabel(doc.type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(doc.requestDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {doc.reason}
                          </div>
                          {doc.description && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {doc.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <Paperclip className="w-4 h-4 text-gray-400" />
                            <span>{doc.files?.length || 0} files</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(doc.submittedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Submit Document Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Submit Attendance Request
                </h3>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    {employeeName}
                  </span>
                </div>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  required
                >
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Request Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="requestDate"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                  required
                />
              </div>

              {/* Date Range for Absence */}
              {formData.type === "absence" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Brief reason for your request..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide additional details about your request..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supporting Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      PDF, DOC, DOCX, JPG, PNG up to 10MB each
                    </span>
                  </label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Selected Files:
                    </h4>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
