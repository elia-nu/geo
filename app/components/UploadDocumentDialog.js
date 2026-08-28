"use client";
import React from "react";
import { X, Upload, User, Building2, FileText, Calendar, Briefcase, Mail } from "lucide-react";

export default function UploadDocumentDialog({
  isOpen,
  onClose,
  employees,
  newDocument,
  setNewDocument,
  selectedFile,
  setSelectedFile,
  onUpload,
  loading,
  formErrors,
}) {
  if (!isOpen) return null;

  const entityType = newDocument.entityType || "employee";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                <Upload className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Upload Document</h3>
                <p className="text-blue-100 text-sm">
                  Add a new document to the system for an Employee or Client
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all ring-1 ring-white/30"
            >
              <X className="w-5 h-5 text-white" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Target Assignment Section (Employee vs Client) */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center ring-1 ring-blue-200">
                    {entityType === "client" ? (
                      <Building2 className="w-5 h-5 text-blue-700" aria-hidden="true" />
                    ) : (
                      <User className="w-5 h-5 text-blue-700" aria-hidden="true" />
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-black">
                    Assign Document To
                  </h4>
                </div>

                {/* Entity Selector Toggle Buttons */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-blue-200 shadow-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setNewDocument({
                        ...newDocument,
                        entityType: "employee",
                        clientName: "",
                        clientEmail: "",
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      entityType === "employee"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Employee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewDocument({
                        ...newDocument,
                        entityType: "client",
                        employeeId: "",
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      entityType === "client"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Client</span>
                  </button>
                </div>
              </div>

              {entityType === "employee" ? (
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Select Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newDocument.employeeId || ""}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        employeeId: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black ${
                      formErrors.employeeId
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">Select an employee</option>
                    {(employees || []).map((employee) => (
                      <option key={employee?._id} value={employee?._id}>
                        {employee?.personalDetails?.name ||
                          employee?.name ||
                          "Unknown"}{" "}
                        - {employee?.department || ""}
                      </option>
                    ))}
                  </select>
                  {formErrors.employeeId && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.employeeId}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Client Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newDocument.clientName || ""}
                      onChange={(e) =>
                        setNewDocument({
                          ...newDocument,
                          clientName: e.target.value,
                        })
                      }
                      placeholder="e.g. Acme Corp, Ministry of Health"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black ${
                        formErrors.clientName
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-purple-500"
                      }`}
                    />
                    {formErrors.clientName && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.clientName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Client Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={newDocument.clientEmail || ""}
                        onChange={(e) =>
                          setNewDocument({
                            ...newDocument,
                            clientEmail: e.target.value,
                          })
                        }
                        placeholder="client@organization.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Information Section */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center ring-1 ring-green-200">
                  <FileText
                    className="w-5 h-5 text-green-700"
                    aria-hidden="true"
                  />
                </div>
                <h4 className="text-lg font-semibold text-black">
                  Document Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newDocument.documentType}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        documentType: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black ${
                      formErrors.documentType
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500"
                    }`}
                  >
                    <option value="">Select document type</option>
                    <option value="ID Document">ID Document</option>
                    <option value="Contract">Contract</option>
                    <option value="Client Agreement / SLA">Client Agreement / SLA</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Invoice / Receipt">Invoice / Receipt</option>
                    <option value="Proposal / Quotation">Proposal / Quotation</option>
                    <option value="Resume">Resume</option>
                    <option value="Medical Record">Medical Record</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.documentType && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.documentType}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Document Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDocument.title}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        title: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black ${
                      formErrors.title
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500"
                    }`}
                    placeholder="Enter document title"
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.title}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-2">
                    Description
                  </label>
                  <textarea
                    value={newDocument.description}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter document description"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none bg-white text-black"
                  />
                </div>
              </div>
            </div>

            {/* File Upload & Expiry Section */}
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center ring-1 ring-purple-200">
                  <Calendar
                    className="w-5 h-5 text-purple-700"
                    aria-hidden="true"
                  />
                </div>
                <h4 className="text-lg font-semibold text-black">
                  File & Expiry Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Select File <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                      formErrors.file
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                    }`}
                  >
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile
                          ? selectedFile.name
                          : "Click to select file"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, Word, or Image files (max 10MB)
                      </p>
                    </label>
                  </div>
                  {formErrors.file && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.file}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newDocument.expiryDate}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank if document doesn't expire
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onUpload}
              disabled={
                loading ||
                !selectedFile ||
                (entityType === "client" ? !newDocument.clientName?.trim() : !newDocument.employeeId) ||
                !newDocument.documentType ||
                !newDocument.title
              }
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
            >
              {loading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
