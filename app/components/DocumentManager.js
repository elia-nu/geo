"use client";
import React, { useState, useEffect } from "react";
import UploadDocumentDialog from "./UploadDocumentDialog";

export default function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [newDocument, setNewDocument] = useState({
    employeeId: "",
    documentType: "",
    title: "",
    description: "",
    uploadDate: new Date(),
    expiryDate: "",
    status: "active",
    tags: [],
  });

  useEffect(() => {
    fetchDocuments();
    fetchEmployees();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/documents");
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee");
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`);
      }
      const data = await response.json();

      // Check if the API response has the correct structure
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        setEmployees(data);
      } else {
        console.error("Invalid API response format:", data);
        setEmployees([]);
        setError("Invalid data format received from server");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Failed to load employees. Please try again.");
      setEmployees([]);
    }
  };

  const validateDocument = (document, file) => {
    const errors = {};

    if (!document.employeeId.trim()) {
      errors.employeeId = "Please select an employee";
    }

    if (!document.documentType.trim()) {
      errors.documentType = "Please select a document type";
    }

    if (!document.title.trim()) {
      errors.title = "Document title is required";
    }

    if (!file) {
      errors.file = "Please select a file to upload";
    } else {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        errors.file = "File size must be less than 10MB";
      }

      // Check file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/jpg",
      ];

      if (!allowedTypes.includes(file.type)) {
        errors.file =
          "Only PDF, Word documents, and images (JPG, PNG) are allowed";
      }
    }

    return errors;
  };

  const handleFileUpload = async () => {
    try {
      setFormErrors({});
      setError("");
      setSuccess("");

      // Validate form
      const errors = validateDocument(newDocument, selectedFile);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      // Add timestamp to document data
      const documentData = {
        ...newDocument,
        uploadDate: new Date(),
        status: "active",
      };

      formData.append("documentData", JSON.stringify(documentData));

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload document");
      }

      const result = await response.json();
      setSuccess("Document uploaded successfully!");
      setIsUploadDialogOpen(false);
      setSelectedFile(null);

      // Reset form
      setNewDocument({
        employeeId: "",
        documentType: "",
        title: "",
        description: "",
        uploadDate: new Date(),
        expiryDate: "",
        status: "active",
        tags: [],
      });

      await fetchDocuments();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error uploading document:", error);
      setError(error.message || "Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId, documentTitle) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${documentTitle}"? This action cannot be undone.`
      )
    ) {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/documents/${documentId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete document");
        }

        setSuccess("Document deleted successfully!");
        await fetchDocuments();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } catch (error) {
        console.error("Error deleting document:", error);
        setError(
          error.message || "Failed to delete document. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const getExpiringDocuments = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      const expiryDate = new Date(doc.expiryDate);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
    });
  };

  const getExpiredDocuments = () => {
    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;
      return new Date(doc.expiryDate) < new Date();
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id === employeeId);
    return employee ? employee.personalDetails.name : "Unknown";
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return "No Expiry";
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    if (expiry < now) return "Expired";
    if (expiry <= thirtyDaysFromNow) return "Expiring Soon";
    return "Active";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Expired":
        return "bg-red-100 text-red-800";
      case "Expiring Soon":
        return "bg-orange-100 text-orange-800";
      case "Active":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const expiringDocuments = getExpiringDocuments();
  const expiredDocuments = getExpiredDocuments();

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-red-400">⚠</div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError("")}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-green-400">✓</div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccess("")}
                className="inline-flex text-green-400 hover:text-green-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Document Management
            </h2>
            <p className="text-gray-600 mt-1">
              Upload, manage, and track document expiry dates
            </p>
          </div>
          <button
            onClick={() => setIsUploadDialogOpen(true)}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Loading..." : "Upload Document"}
          </button>
        </div>
      </div>

      {/* Expiry Alerts */}
      {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
        <div className="space-y-4">
          {expiredDocuments.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                ⚠️ Expired Documents ({expiredDocuments.length})
              </h3>
              <div className="space-y-2">
                {expiredDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex justify-between items-center bg-white p-2 rounded"
                  >
                    <span className="text-sm">
                      {getEmployeeName(doc.employeeId)} - {doc.title}
                    </span>
                    <span className="text-xs text-red-600">
                      Expired: {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {expiredDocuments.length > 5 && (
                  <p className="text-sm text-red-600">
                    +{expiredDocuments.length - 5} more expired documents
                  </p>
                )}
              </div>
            </div>
          )}

          {expiringDocuments.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">
                ⏰ Expiring Soon ({expiringDocuments.length})
              </h3>
              <div className="space-y-2">
                {expiringDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex justify-between items-center bg-white p-2 rounded"
                  >
                    <span className="text-sm">
                      {getEmployeeName(doc.employeeId)} - {doc.title}
                    </span>
                    <span className="text-xs text-orange-600">
                      Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {expiringDocuments.length > 5 && (
                  <p className="text-sm text-orange-600">
                    +{expiringDocuments.length - 5} more expiring documents
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((document) => (
                <tr key={document._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {document.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {document.originalName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(document.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.documentType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(document.uploadDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {document.expiryDate
                      ? new Date(document.expiryDate).toLocaleDateString()
                      : "No Expiry"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        getDocumentStatus(document.expiryDate)
                      )}`}
                    >
                      {getDocumentStatus(document.expiryDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() =>
                        handleDeleteDocument(document._id, document.title)
                      }
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Document"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Dialog */}
      {isUploadDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Upload New Document</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Employee
                </label>
                <select
                  value={newDocument.employeeId}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      employeeId: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Select an employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.personalDetails.name} - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Type
                </label>
                <select
                  value={newDocument.documentType}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      documentType: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Select document type</option>
                  <option value="ID Card">ID Card</option>
                  <option value="Contract">Contract</option>
                  <option value="Certificate">Certificate</option>
                  <option value="License">License</option>
                  <option value="Medical Report">Medical Report</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Document Title
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
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
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
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Expiry Date (Optional)
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
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsUploadDialogOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || !newDocument.employeeId}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
