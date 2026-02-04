"use client";
import React, { useState, useEffect } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import UploadDocumentDialog from "./UploadDocumentDialog";

export default function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [docxRenderError, setDocxRenderError] = useState("");
  const [isRenderingDocx, setIsRenderingDocx] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);
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

      let response;

      // If editing an existing document WITHOUT a new file selected → metadata-only update
      if (editingDocumentId && !selectedFile) {
        const updateData = {
          employeeId: newDocument.employeeId,
          documentType: newDocument.documentType,
          title: newDocument.title,
          description: newDocument.description,
          expiryDate: newDocument.expiryDate || "",
          status: newDocument.status || "active",
          tags: Array.isArray(newDocument.tags) ? newDocument.tags : [],
        };
        response = await fetch(`/api/documents/${editingDocumentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
      } else {
        // New file upload (either new document or replacing file on existing one)
        const formData = new FormData();
        formData.append("file", selectedFile);

        // Add timestamp to document data
        const documentData = {
          ...newDocument,
          uploadDate: new Date(),
          status: "active",
        };

        formData.append("documentData", JSON.stringify(documentData));

        if (editingDocumentId) {
          // Replace existing file and update metadata in-place
          response = await fetch(`/api/documents/${editingDocumentId}/upload`, {
            method: "POST",
            body: formData,
          });
        } else {
          // Create new document
          response = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload document");
      }

      const result = await response.json();
      setSuccess("Document uploaded successfully!");
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setEditingDocumentId(null);

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

  const getReadableSize = (bytes) => {
    if (bytes === undefined || bytes === null) return "";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx++;
    }
    return `${size.toFixed(1)} ${units[idx]}`;
  };

  const openViewDialog = async (doc) => {
    try {
      setError("");
      setDocxRenderError("");
      setViewingDocument(doc);
      setIsViewDialogOpen(true);
      setPreviewUnavailable(false);

      // Only preview PDFs inline; other types are not supported here
      const isPdf =
        doc.mimeType === "application/pdf" ||
        /\.pdf$/i.test(doc.originalName || doc.title || "");
      if (isPdf) {
        try {
          const res = await fetch(`/api/documents/${doc._id}/download`);
          if (!res.ok) {
            setPreviewUrl("");
            setPreviewUnavailable(true);
            return;
          }
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setPreviewUrl(objUrl);
        } catch (e) {
          console.error(e);
          setPreviewUrl("");
          setPreviewUnavailable(true);
        }
        return;
      }

      // Non-PDF: show message to download
      setPreviewUrl("");
      setPreviewUnavailable(true);
      return;
    } catch (e) {
      console.error("Preview error:", e);
      setPreviewUrl("");
      setPreviewUnavailable(true);
    }
  };

  const closeViewDialog = () => {
    if (previewUrl && previewUrl.startsWith("blob:"))
      URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setViewingDocument(null);
    setIsViewDialogOpen(false);
    setPreviewUnavailable(false);
  };

  // Open upload dialog prefilled with an existing document (edit/replace flow)
  const openEditDialog = (doc) => {
    try {
      setFormErrors({});
      setEditingDocumentId(doc?._id || null);
      setSelectedFile(null);
      setNewDocument({
        employeeId: doc?.employeeId || "",
        documentType: doc?.documentType || "",
        title: doc?.title || doc?.originalName || "",
        description: doc?.description || "",
        uploadDate: doc?.uploadDate ? new Date(doc.uploadDate) : new Date(),
        expiryDate: doc?.expiryDate ? doc.expiryDate : "",
        status: doc?.status || "active",
        tags: Array.isArray(doc?.tags) ? doc.tags : [],
      });
      setIsUploadDialogOpen(true);
    } catch (_) {
      setIsUploadDialogOpen(true);
    }
  };

  // Render DOCX preview dynamically using docx-preview
  useEffect(() => {
    const renderDocx = async () => {
      if (
        !isViewDialogOpen ||
        previewUrl !== "__DOCX_RENDER__" ||
        !viewingDocument
      )
        return;
      try {
        setIsRenderingDocx(true);
        setDocxRenderError("");
        const res = await fetch(
          `/api/documents/${viewingDocument._id}/download`
        );
        if (!res.ok) throw new Error("Failed to fetch DOCX for preview");
        const blob = await res.blob();
        const container = document.getElementById("docx-preview-container");
        if (!container) return;
        container.innerHTML = "";
        const mod = await import("docx-preview");
        const renderAsync = mod.renderAsync || mod.default?.renderAsync;
        if (!renderAsync) throw new Error("docx-preview renderAsync not found");
        await renderAsync(blob, container, undefined, {
          className: "docx",
          inWrapper: true,
        });
      } catch (err) {
        console.error("DOCX render error:", err);
        setDocxRenderError(
          "Unable to render DOCX preview. Please download to view."
        );
      } finally {
        setIsRenderingDocx(false);
      }
    };
    renderDocx();
  }, [isViewDialogOpen, previewUrl, viewingDocument]);

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id === employeeId);
    if (!employee) return "Unknown";
    const name = employee.personalDetails?.name || employee.name;
    return name || "Unknown";
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
            <h2 className="text-2xl font-bold text-black">
              Document Management
            </h2>
            <p className="text-black mt-1">
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
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                ⚠️ Expired Documents ({expiredDocuments.length})
              </h3>
              <div className="space-y-2">
                {expiredDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex justify-between items-center bg-white p-2 rounded"
                  >
                    <span className="text-sm text-black">
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
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                ⏰ Expiring Soon ({expiringDocuments.length})
              </h3>
              <div className="space-y-2">
                {expiringDocuments.slice(0, 5).map((doc) => (
                  <div
                    key={doc._id}
                    className="flex justify-between items-center bg-white p-2 rounded"
                  >
                    <span className="text-sm text-black">
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
                      <div className="text-sm font-medium text-black">
                        {document.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {document.originalName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {getEmployeeName(document.employeeId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {document.documentType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                    {new Date(document.uploadDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewDialog(document)}
                        disabled={loading}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="View Document"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openEditDialog(document)}
                        disabled={loading}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="Edit/Replace Document"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteDocument(document._id, document.title)
                        }
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="Delete Document"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Dialog - Consistent with stepper UI */}
      <UploadDocumentDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        employees={employees}
        newDocument={newDocument}
        setNewDocument={setNewDocument}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        onUpload={handleFileUpload}
        loading={loading}
        formErrors={formErrors}
      />

      {/* View Document Dialog */}
      {isViewDialogOpen && viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-black">
                  {viewingDocument.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {getEmployeeName(viewingDocument.employeeId)} •{" "}
                  {viewingDocument.documentType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${viewingDocument._id}/download`}
                  className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
                >
                  Download
                </a>
                <button
                  onClick={closeViewDialog}
                  className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mb-4">
              {previewUrl && previewUrl !== "__DOCX_RENDER__" && (
                <embed
                  src={previewUrl}
                  type="application/pdf"
                  className="w-full h-[70vh] border rounded bg-white"
                />
              )}
              {previewUrl === "__DOCX_RENDER__" && (
                <div className="w-full border rounded bg-white">
                  {isRenderingDocx ? (
                    <div className="p-6 text-gray-600 text-sm">
                      Rendering document...
                    </div>
                  ) : (
                    <div
                      id="docx-preview-container"
                      className="p-4 overflow-auto max-h-[70vh]"
                    />
                  )}
                  {docxRenderError && (
                    <div className="p-4 text-red-600 text-sm">
                      {docxRenderError}
                    </div>
                  )}
                </div>
              )}
              {!previewUrl && !previewUnavailable && (
                <div className="p-6 bg-gray-50 border rounded text-gray-600 text-sm">
                  Loading preview or preview not available.
                </div>
              )}
              {!previewUrl && previewUnavailable && (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  Preview is not available for this file type. Please download
                  to view.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Original File</div>
                <div className="text-black">
                  {viewingDocument.originalName}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Size</div>
                <div className="text-black">
                  {getReadableSize(viewingDocument.fileSize)}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">MIME Type</div>
                <div className="text-black">{viewingDocument.mimeType}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Upload Date</div>
                <div className="text-black">
                  {new Date(viewingDocument.uploadDate).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Expiry Date</div>
                <div className="text-black">
                  {viewingDocument.expiryDate
                    ? new Date(viewingDocument.expiryDate).toLocaleDateString()
                    : "No Expiry"}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">Status</div>
                <div className="text-black">
                  {getDocumentStatus(viewingDocument.expiryDate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
