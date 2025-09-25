"use client";
import React from "react";
import { X, Upload, User, FileText, Calendar } from "lucide-react";

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
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Upload Document</h3>
                <p className="text-blue-100 text-sm">
                  Add a new document to the system
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Employee Selection Section */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Employee Selection
                </h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  value={newDocument.employeeId}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      employeeId: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                    formErrors.employeeId
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.personalDetails.name} - {employee.department}
                    </option>
                  ))}
                </select>
                {formErrors.employeeId && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.employeeId}
                  </p>
                )}
              </div>
            </div>

            {/* Document Information Section */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Document Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      formErrors.documentType
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500"
                    }`}
                  >
                    <option value="">Select document type</option>
                    <option value="ID Document">ID Document</option>
                    <option value="Contract">Contract</option>
                    <option value="Certificate">Certificate</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* File Upload & Expiry Section */}
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  File & Expiry Details
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                !newDocument.employeeId ||
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
