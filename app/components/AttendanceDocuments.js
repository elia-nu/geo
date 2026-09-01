"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function AttendanceDocuments({ employeeId, employeeName }) {
  // State management
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [statusTab, setStatusTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (statusTab !== "all" && doc.status !== statusTab) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const reasonMatch = doc.reason?.toLowerCase().includes(q);
        const typeMatch = doc.type?.toLowerCase().includes(q);
        const descMatch = doc.description?.toLowerCase().includes(q);
        const dateMatch = doc.requestDate?.includes(q);
        if (!reasonMatch && !typeMatch && !descMatch && !dateMatch) return false;
      }
      return true;
    });
  }, [documents, statusTab, searchTerm]);

  // Paginated documents
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white shadow-lg shadow-purple-600/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 ring-1 ring-white/30 flex-shrink-0">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight">
                Attendance Documents
              </h1>
              <p className="text-xs sm:text-sm text-purple-100 mt-0.5">
                Submit requests and upload supporting documents
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-700 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all text-xs sm:text-sm shadow-md active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-purple-700" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-2 text-xs sm:text-sm font-medium ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : messageType === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900">
                Your Requests & Documents
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Track the status of your submitted documents
              </p>
            </div>
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusTab(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    statusTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reason, type, or date..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="text-sm font-semibold">Loading documents...</span>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-10 sm:p-14 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
                No documents found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-4">
                {searchTerm || statusTab !== "all"
                  ? "Try adjusting your search query or status filter."
                  : "You haven't submitted any attendance requests or supporting documents yet."}
              </p>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-purple-600 text-white px-4 py-2.5 rounded-xl hover:bg-purple-700 font-semibold text-xs sm:text-sm flex items-center space-x-2 mx-auto shadow-md shadow-purple-600/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Your First Request</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {paginatedDocuments.map((doc) => {
                  const status = getStatusInfo(doc.status);
                  const StatusIcon = status.icon;

                  return (
                    <div key={doc._id} className="p-4 space-y-3 hover:bg-slate-50/80 transition-colors">
                      {/* Top Row: Type & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {getTypeLabel(doc.type)}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bgColor} ${status.color} flex-shrink-0`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.text}
                        </span>
                      </div>

                      {/* Middle Row: Reason / Description */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                        <p className="text-xs font-semibold text-slate-800 break-words">
                          {doc.reason}
                        </p>
                        {doc.description && (
                          <p className="text-[11px] text-slate-500 break-words">
                            {doc.description}
                          </p>
                        )}
                      </div>

                      {/* Details Row: Dates & Files */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-400">Date:</span>
                          <span className="font-semibold text-slate-700">{formatDate(doc.requestDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 justify-end">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-700">{doc.files?.length || 0} files</span>
                        </div>
                      </div>

                      {/* Rejection notice if rejected */}
                      {doc.status === "rejected" && (
                        <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5 space-y-0.5">
                          <span className="font-bold text-[11px] block text-rose-900">
                            Rejection Reason:
                          </span>
                          <p className="text-[11px] text-rose-800 break-words">
                            {doc.rejectionReason ||
                              doc.comments ||
                              doc.supervisorNotes ||
                              doc.notes ||
                              doc.adminApproval?.rejectionReason ||
                              "No reason provided"}
                          </p>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 text-right">
                        Submitted: {formatDate(doc.submittedAt)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Request Date
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Files
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs">
                    {paginatedDocuments.map((doc) => {
                      const status = getStatusInfo(doc.status);
                      const StatusIcon = status.icon;

                      return (
                        <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-purple-600" />
                                </div>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-semibold text-slate-900">
                                  {getTypeLabel(doc.type)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                            {formatDate(doc.requestDate)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-900 font-medium max-w-xs truncate">
                              {doc.reason}
                            </div>
                            {doc.description && (
                              <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                                {doc.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                            <div className="flex items-center space-x-1">
                              <Paperclip className="w-4 h-4 text-slate-400" />
                              <span>{doc.files?.length || 0} files</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${status.bgColor} ${status.color}`}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.text}
                            </span>
                            {doc.status === "rejected" && (
                              <div className="mt-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2 max-w-xs">
                                <span className="font-bold block text-[11px] text-rose-800">
                                  Rejection Reason:
                                </span>
                                <span className="text-rose-900">
                                  {doc.rejectionReason ||
                                    doc.comments ||
                                    doc.supervisorNotes ||
                                    doc.notes ||
                                    doc.adminApproval?.rejectionReason ||
                                    "No reason provided"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {formatDate(doc.submittedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {filteredDocuments.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredDocuments.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          </div>
        )}
      </div>

      {/* Submit Document Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Submit Attendance Request
                </h3>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Employee Info */}
              <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3.5 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-800">
                  {employeeName}
                </span>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Request Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black bg-white"
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
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Request Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="requestDate"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                  className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black"
                  required
                />
              </div>

              {/* Date Range for Absence */}
              {formData.type === "absence" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Brief reason for your request..."
                  className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black placeholder-gray-400"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide additional details about your request..."
                  rows={3}
                  className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm text-black placeholder-gray-400 resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Supporting Documents
                </label>
                <div className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-4 sm:p-6 text-center transition-colors">
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
                    className="cursor-pointer flex flex-col items-center space-y-1.5"
                  >
                    <Upload className="w-7 h-7 text-purple-600" />
                    <span className="text-xs sm:text-sm font-semibold text-purple-700">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-[11px] text-gray-500">
                      PDF, DOC, DOCX, JPG, PNG up to 10MB each
                    </span>
                  </label>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-700">
                      Selected Files:
                    </h4>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <Paperclip className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span className="text-xs text-slate-800 font-medium truncate">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 active:scale-95 transition-all"
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
