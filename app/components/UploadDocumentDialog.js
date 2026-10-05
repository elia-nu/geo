"use client";
import React, { useRef } from "react";
import {
  X,
  Upload,
  User,
  Building2,
  FileText,
  Calendar,
  Mail,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  File,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";

const STANDARD_DOCUMENT_TYPES = [
  "Employment Contract",
  "National ID / Passport",
  "Resume / CV",
  "Client Agreement / SLA",
  "Certificate",
  "Educational Certificate",
  "Professional License",
  "Medical Clearance",
  "Invoice / Receipt",
  "Proposal / Quotation",
  "Recommendation Letter",
  "Other Attachment",
];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx++;
  }
  return `${size.toFixed(1)} ${units[idx]}`;
}

export default function UploadDocumentDialog({
  isOpen,
  onClose,
  employees = [],
  newDocument,
  setNewDocument,
  selectedFile,
  setSelectedFile,
  onUpload,
  loading = false,
  formErrors = {},
  isEdit = false,
  currentDocument = null,
}) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const entityType = newDocument.entityType || "employee";
  const currentFileName = currentDocument?.originalName || currentDocument?.fileName || "";
  const currentFileSize = currentDocument?.fileSize ? formatBytes(currentDocument.fileSize) : "";

  const isFormValid = Boolean(
    !loading &&
    newDocument.title?.trim() &&
    newDocument.documentType?.trim() &&
    (entityType === "client" ? newDocument.clientName?.trim() : newDocument.employeeId?.trim()) &&
    (isEdit || selectedFile)
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] border border-slate-100 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-5 sm:p-6 text-white shrink-0 border-b border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300 ring-1 ring-white/20 backdrop-blur-sm shrink-0">
                {isEdit ? <Pencil className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                    {isEdit ? "Edit Document Details" : "Upload New Document"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/20">
                    {isEdit ? "Edit Mode" : "New Document"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isEdit
                    ? "Update document metadata, reassignment, or replace the attached file"
                    : "Upload and index a new file for an employee or client in the document repository"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Assignment Selector (Employee vs Client) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Document Assignment
                </h4>
                <p className="text-xs text-slate-500">
                  Assign this record to an active staff member or an external client.
                </p>
              </div>

              {/* Segmented Switcher */}
              <div className="flex items-center bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
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
                      ? "bg-white text-blue-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
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
                      ? "bg-white text-indigo-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Client</span>
                </button>
              </div>
            </div>

            {/* Employee Dropdown or Client Fields */}
            {entityType === "employee" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newDocument.employeeId || ""}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      employeeId: e.target.value,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    formErrors.employeeId
                      ? "border-rose-300 ring-rose-200"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                >
                  <option value="">-- Choose an employee --</option>
                  {(employees || []).map((emp) => {
                    const id = String(emp._id || emp.id || "");
                    const name = emp.personalDetails?.name || emp.name || "Unnamed Employee";
                    const code = emp.employeeId || emp.personalDetails?.employeeId || "";
                    const dept = emp.department || emp.personalDetails?.department || "";
                    return (
                      <option key={id} value={id}>
                        {name} {code ? `(${code})` : ""} {dept ? `— ${dept}` : ""}
                      </option>
                    );
                  })}
                </select>
                {formErrors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.employeeId}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client / Organization Name <span className="text-rose-500">*</span>
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
                    placeholder="e.g. Acme Corp / Ministry of Urban"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                      formErrors.clientName
                        ? "border-rose-300 ring-rose-200"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {formErrors.clientName && (
                    <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.clientName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newDocument.clientEmail || ""}
                      onChange={(e) =>
                        setNewDocument({
                          ...newDocument,
                          clientEmail: e.target.value,
                        })
                      }
                      placeholder="client@company.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Document Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Document Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Document Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDocument.title || ""}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Employment Contract 2026"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    formErrors.title
                      ? "border-rose-300 ring-rose-200"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.title}</span>
                  </p>
                )}
              </div>

              {/* Document Type / Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category / Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newDocument.documentType || ""}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      documentType: e.target.value,
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-white text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    formErrors.documentType
                      ? "border-rose-300 ring-rose-200"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                >
                  <option value="">-- Select Document Category --</option>
                  {STANDARD_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {formErrors.documentType && (
                  <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.documentType}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Expiry Date</span>
                </label>
                <input
                  type="date"
                  value={newDocument.expiryDate || ""}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      expiryDate: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank if this document does not expire.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Document Status
                </label>
                <select
                  value={newDocument.status || "active"}
                  onChange={(e) =>
                    setNewDocument({
                      ...newDocument,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="archived">Archived</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Set compliance / visibility status for tracking.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Notes
              </label>
              <textarea
                value={newDocument.description || ""}
                onChange={(e) =>
                  setNewDocument({
                    ...newDocument,
                    description: e.target.value,
                  })
                }
                rows={2}
                placeholder="Optional notes, verification details, or reference numbers..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* File Upload / Attachment Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span>{isEdit ? "Attached File Management" : "File Attachment"}</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                PDF, Word, Excel, or Images (Max 20MB)
              </span>
            </h4>

            {/* Existing File Info if Editing */}
            {isEdit && currentFileName && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate" title={currentFileName}>
                        {currentFileName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                        Current File
                      </span>
                    </div>
                    {currentFileSize && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{currentFileSize}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* If a new replacement file is chosen */}
            {selectedFile ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-950 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {isEdit ? "New Replacement" : "Ready to Upload"}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-all shrink-0"
                  title="Remove selected file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Drag & Drop or Click Area */
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  formErrors.file
                    ? "border-rose-300 bg-rose-50/50 hover:bg-rose-50"
                    : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {isEdit ? "Click to select a replacement file (Optional)" : "Click to select or drag document here"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (up to 20MB)
                </p>
              </div>
            )}

            {formErrors.file && (
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{formErrors.file}</span>
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={!isFormValid}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isEdit ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{loading ? (isEdit ? "Saving..." : "Uploading...") : isEdit ? "Save Changes" : "Upload Document"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
