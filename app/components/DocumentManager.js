"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
  Calendar,
  User,
  Building2,
  Shield,
  Layers,
  X,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import UploadDocumentDialog from "./UploadDocumentDialog";
import DocumentDetailViewerModal from "./DocumentDetailViewerModal";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

const DOCUMENT_CATEGORIES = [
  "All Types",
  "National ID / Passport",
  "Resume / CV",
  "Employment Contract",
  "Client Agreement / SLA",
  "Certificate",
  "Invoice / Receipt",
  "Proposal / Quotation",
  "Educational Certificate",
  "Professional License",
  "Medical Clearance",
  "Recommendation Letter",
  "Other Attachment",
];

export default function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [editingDocumentId, setEditingDocumentId] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all"); // "all" | "active" | "expiring" | "expired"

  const [newDocument, setNewDocument] = useState({
    entityType: "employee",
    employeeId: "",
    clientName: "",
    clientEmail: "",
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
      setDocuments(Array.isArray(data) ? data : []);
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

      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      } else if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  const clientNames = useMemo(() => {
    const set = new Set();
    documents.forEach((d) => {
      if (d.clientName && typeof d.clientName === "string" && d.clientName.trim()) {
        set.add(d.clientName.trim());
      }
    });
    return Array.from(set).sort();
  }, [documents]);

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return "Unassigned";
    const employee = employees.find(
      (emp) =>
        String(emp._id || emp.id) === String(employeeId) ||
        String(emp.employeeId) === String(employeeId)
    );
    if (!employee) return "Employee";
    return employee.personalDetails?.name || employee.name || "Employee";
  };

  const getEmployeeIdCode = (employeeId) => {
    if (!employeeId) return "";
    const employee = employees.find(
      (emp) =>
        String(emp._id || emp.id) === String(employeeId) ||
        String(emp.employeeId) === String(employeeId)
    );
    return employee?.employeeId || employee?.personalDetails?.employeeId || "";
  };

  const getDocumentOwner = (doc) => {
    const isClient = doc?.entityType === "client" || (!doc?.employeeId && !!doc?.clientName);
    if (isClient) {
      return {
        isClient: true,
        name: doc?.clientName || "Client",
        email: doc?.clientEmail || "",
        code: "Client",
      };
    }
    return {
      isClient: false,
      name: getEmployeeName(doc?.employeeId),
      email: doc?.employeeEmail || "",
      code: getEmployeeIdCode(doc?.employeeId) || "Employee",
    };
  };

  const validateDocument = (document, file) => {
    const errors = {};
    const isClient = document.entityType === "client";

    if (isClient) {
      if (!document.clientName?.trim()) {
        errors.clientName = "Please enter the client name";
      }
    } else {
      if (!document.employeeId?.trim()) {
        errors.employeeId = "Please select an employee";
      }
    }

    if (!document.documentType?.trim()) {
      errors.documentType = "Please select a document type";
    }

    if (!document.title?.trim()) {
      errors.title = "Document title is required";
    }

    if (!editingDocumentId && !file) {
      errors.file = "Please select a file to upload";
    } else if (file) {
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        errors.file = "File size must be less than 20MB";
      }
    }

    return errors;
  };

  const handleFileUpload = async () => {
    try {
      setFormErrors({});
      setError("");
      setSuccess("");

      const errors = validateDocument(newDocument, selectedFile);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setLoading(true);
      let response;

      if (editingDocumentId && !selectedFile) {
        const updateData = {
          entityType: newDocument.entityType || "employee",
          employeeId: newDocument.entityType === "client" ? "" : newDocument.employeeId,
          clientName: newDocument.entityType === "client" ? newDocument.clientName : "",
          clientEmail: newDocument.entityType === "client" ? newDocument.clientEmail : "",
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
        const formData = new FormData();
        formData.append("file", selectedFile);

        const documentData = {
          ...newDocument,
          uploadDate: new Date(),
          status: "active",
        };

        formData.append("documentData", JSON.stringify(documentData));

        if (editingDocumentId) {
          response = await fetch(`/api/documents/${editingDocumentId}/upload`, {
            method: "POST",
            body: formData,
          });
        } else {
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

      toast.success("Document saved successfully!");
      setSuccess("Document saved successfully!");
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setEditingDocumentId(null);

      setNewDocument({
        entityType: "employee",
        employeeId: "",
        clientName: "",
        clientEmail: "",
        documentType: "",
        title: "",
        description: "",
        uploadDate: new Date(),
        expiryDate: "",
        status: "active",
        tags: [],
      });

      await fetchDocuments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error(error.message || "Failed to upload document");
      setError(error.message || "Failed to upload document");
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

        toast.success("Document deleted successfully!");
        setSuccess("Document deleted successfully!");
        await fetchDocuments();
        setTimeout(() => setSuccess(""), 3000);
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error(error.message || "Failed to delete document");
        setError(error.message || "Failed to delete document");
      } finally {
        setLoading(false);
      }
    }
  };

  const getReadableSize = (bytes) => {
    if (!bytes && bytes !== 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let idx = 0;
    while (size >= 1024 && idx < units.length - 1) {
      size /= 1024;
      idx++;
    }
    return `${size.toFixed(1)} ${units[idx]}`;
  };

  const openViewDialog = (doc) => {
    setError("");
    setViewingDocument(doc);
    setIsViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setViewingDocument(null);
    setIsViewDialogOpen(false);
  };

  const openEditDialog = (doc) => {
    try {
      setFormErrors({});
      setEditingDocumentId(doc?._id || null);
      setSelectedFile(null);
      const isClient = doc?.entityType === "client" || (!doc?.employeeId && !!doc?.clientName);
      setNewDocument({
        entityType: isClient ? "client" : "employee",
        employeeId: isClient ? "" : (doc?.employeeId || ""),
        clientName: isClient ? (doc?.clientName || "") : "",
        clientEmail: isClient ? (doc?.clientEmail || "") : "",
        documentType: doc?.documentType || doc?.type || "",
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

  // Status calculation helpers
  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return "Active";
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    if (expiry < now) return "Expired";
    if (expiry <= thirtyDays) return "Expiring Soon";
    return "Active";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Expired":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Expiring Soon":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const title = (doc.title || "").toLowerCase();
      const fileName = (doc.originalName || doc.fileName || "").toLowerCase();
      const empName = getEmployeeName(doc.employeeId).toLowerCase();
      const empCode = getEmployeeIdCode(doc.employeeId).toLowerCase();
      const clientName = (doc.clientName || "").toLowerCase();
      const clientEmail = (doc.clientEmail || "").toLowerCase();
      const docType = (doc.documentType || doc.type || "").toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        title.includes(search) ||
        fileName.includes(search) ||
        empName.includes(search) ||
        empCode.includes(search) ||
        clientName.includes(search) ||
        clientEmail.includes(search) ||
        docType.includes(search);

      let matchesEmployee = true;
      if (selectedEmployeeFilter === "ALL_CLIENTS") {
        matchesEmployee = doc.entityType === "client" || (!doc.employeeId && !!doc.clientName);
      } else if (selectedEmployeeFilter === "ALL_EMPLOYEES") {
        matchesEmployee = doc.entityType === "employee" || (!doc.clientName && !!doc.employeeId);
      } else if (selectedEmployeeFilter.startsWith("CLIENT:")) {
        const targetClient = selectedEmployeeFilter.replace("CLIENT:", "");
        matchesEmployee = doc.clientName === targetClient;
      } else if (selectedEmployeeFilter) {
        matchesEmployee = String(doc.employeeId) === String(selectedEmployeeFilter);
      }

      const matchesType =
        !selectedTypeFilter ||
        selectedTypeFilter === "All Types" ||
        (doc.documentType || doc.type) === selectedTypeFilter;

      const docStatus = getDocumentStatus(doc.expiryDate);
      const matchesStatus =
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "active" && docStatus === "Active") ||
        (selectedStatusFilter === "expiring" && docStatus === "Expiring Soon") ||
        (selectedStatusFilter === "expired" && docStatus === "Expired");

      return (
        matchesSearch && matchesEmployee && matchesType && matchesStatus
      );
    });
  }, [
    documents,
    searchTerm,
    selectedEmployeeFilter,
    selectedTypeFilter,
    selectedStatusFilter,
    employees,
  ]);

  // Stats calculation
  const stats = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let totalSize = 0;

    documents.forEach((doc) => {
      totalSize += doc.fileSize || 0;
      const status = getDocumentStatus(doc.expiryDate);
      if (status === "Expired") expired++;
      else if (status === "Expiring Soon") expiring++;
      else active++;
    });

    return {
      total: documents.length,
      active,
      expiring,
      expired,
      totalSize: getReadableSize(totalSize),
    };
  }, [documents]);

  const totalPages = Math.ceil((filteredDocuments.length || 0) / itemsPerPage) || 1;
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEmployeeFilter("");
    setSelectedTypeFilter("");
    setSelectedStatusFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Document Management
                </h1>
                <p className="text-indigo-200/80 text-xs sm:text-sm mt-0.5">
                  Organize, verify, track expiry, and inspect employee documentation & credentials.
                </p>
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>{stats.total} Total Files</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-300 flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{stats.active} Active</span>
              </div>
              {stats.expiring > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md text-xs font-semibold text-amber-200 flex items-center gap-1.5 border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{stats.expiring} Expiring Soon</span>
                </div>
              )}
              {stats.expired > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 backdrop-blur-md text-xs font-semibold text-rose-200 flex items-center gap-1.5 border border-rose-400/30">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{stats.expired} Expired</span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-slate-300 flex items-center gap-1.5 border border-white/10 hidden sm:flex">
                <span>Storage: {stats.totalSize}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Refresh Documents"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setEditingDocumentId(null);
                setSelectedFile(null);
                setNewDocument({
                  entityType: "employee",
                  employeeId: "",
                  clientName: "",
                  documentType: "",
                  title: "",
                  description: "",
                  uploadDate: new Date(),
                  expiryDate: "",
                  status: "active",
                  tags: [],
                });
                setIsUploadDialogOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Filter Documents
            </h3>
            {(searchTerm || selectedEmployeeFilter || selectedTypeFilter || selectedStatusFilter !== "all") && (
              <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-0.5 rounded-full">
                {filteredDocuments.length} matching of {documents.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-indigo-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {(searchTerm || selectedEmployeeFilter || selectedTypeFilter || selectedStatusFilter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, file, employee, client..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Filter by Employee / Client */}
          <div>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => {
                setSelectedEmployeeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            >
              <option value="">All Assignments (Employees & Clients)</option>
              <option value="ALL_EMPLOYEES">👤 All Employee Documents</option>
              <option value="ALL_CLIENTS">🏢 All Client Documents</option>
              {employees.length > 0 && (
                <optgroup label="Employees">
                  {employees.map((emp) => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>
                      {emp.personalDetails?.name || emp.name} ({emp.employeeId || emp.personalDetails?.employeeId || "ID"})
                    </option>
                  ))}
                </optgroup>
              )}
              {clientNames.length > 0 && (
                <optgroup label="Clients">
                  {clientNames.map((client) => (
                    <option key={client} value={`CLIENT:${client}`}>
                      🏢 {client}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Filter by Document Type */}
          <div>
            <select
              value={selectedTypeFilter}
              onChange={(e) => {
                setSelectedTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat === "All Types" ? "" : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Expiry Status */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            >
              <option value="all">All Expiry Statuses</option>
              <option value="active">Active (Valid)</option>
              <option value="expiring">Expiring Soon (&le; 30 days)</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Document Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading && (!Array.isArray(documents) || documents.length === 0) ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Loading documents directory...
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              No documents match your filters
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || selectedEmployeeFilter || selectedTypeFilter || selectedStatusFilter !== "all"
                ? "Try adjusting or clearing your search filters."
                : "Upload your first employee or client document using the button above."}
            </p>
            {(searchTerm || selectedEmployeeFilter || selectedTypeFilter || selectedStatusFilter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Document</th>
                  <th className="px-6 py-3.5">Assigned To</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Upload Date</th>
                  <th className="px-6 py-3.5">Expiry Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedDocuments.map((doc) => {
                  const docId = doc._id || doc.id;
                  const isPdf =
                    doc.mimeType?.includes("pdf") ||
                    doc.originalName?.toLowerCase().endsWith(".pdf") ||
                    doc.documentType === "pdf";
                  const isImage =
                    doc.mimeType?.startsWith("image/") ||
                    doc.originalName?.match(/\.(jpg|jpeg|png|webp)$/i);
                  const isExcel =
                    doc.mimeType?.includes("sheet") ||
                    doc.mimeType?.includes("excel") ||
                    doc.originalName?.match(/\.(xlsx|xls|csv)$/i);
                  const status = getDocumentStatus(doc.expiryDate);

                  return (
                    <tr
                      key={docId}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex-shrink-0">
                            {isPdf ? (
                              <FileText className="w-5 h-5 text-rose-500" />
                            ) : isImage ? (
                              <ImageIcon className="w-5 h-5 text-emerald-500" />
                            ) : isExcel ? (
                              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <FileCheck className="w-5 h-5 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[220px]">
                              {doc.title || doc.originalName || "Document"}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                              {doc.originalName} ({getReadableSize(doc.fileSize)})
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {(() => {
                          const owner = getDocumentOwner(doc);
                          return (
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  owner.isClient
                                    ? "bg-purple-100 border border-purple-200 text-purple-700"
                                    : "bg-blue-50 border border-blue-200 text-blue-700"
                                }`}
                              >
                                {owner.isClient ? (
                                  <Building2 className="w-3.5 h-3.5" />
                                ) : (
                                  owner.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate max-w-[150px]">
                                  {owner.name}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      owner.isClient
                                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                                        : "text-slate-400 font-mono"
                                    }`}
                                  >
                                    {owner.code}
                                  </span>
                                  {owner.email && (
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]" title={owner.email}>
                                      &bull; {owner.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {doc.documentType || doc.type || "General"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {doc.uploadDate
                          ? new Date(doc.uploadDate).toLocaleDateString()
                          : "N/A"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {doc.expiryDate
                          ? new Date(doc.expiryDate).toLocaleDateString()
                          : "No Expiry"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View in Detail */}
                          <button
                            type="button"
                            onClick={() => openViewDialog(doc)}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all font-semibold"
                            title="See in Detail & Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download */}
                          <a
                            href={`/api/documents/${docId}/download`}
                            download={doc.originalName || "document"}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-semibold"
                            title="Download File"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Edit / Replace */}
                          <button
                            type="button"
                            onClick={() => openEditDialog(doc)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all font-semibold"
                            title="Edit / Replace File"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteDocument(docId, doc.title || doc.originalName)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Card View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedDocuments.map((doc) => {
              const docId = doc._id || doc.id;
              const isPdf =
                doc.mimeType?.includes("pdf") ||
                doc.originalName?.toLowerCase().endsWith(".pdf") ||
                doc.documentType === "pdf";
              const isImage =
                doc.mimeType?.startsWith("image/") ||
                doc.originalName?.match(/\.(jpg|jpeg|png|webp)$/i);
              const status = getDocumentStatus(doc.expiryDate);

              return (
                <div
                  key={docId}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex-shrink-0">
                      {isPdf ? (
                        <FileText className="w-6 h-6 text-rose-500" />
                      ) : isImage ? (
                        <ImageIcon className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <FileCheck className="w-6 h-6 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadgeClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {getReadableSize(doc.fileSize)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">
                        {doc.title || doc.originalName || "Document"}
                      </h4>
                      <p className="text-xs text-indigo-600 font-medium">
                        {doc.documentType || doc.type || "Document"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    {(() => {
                      const owner = getDocumentOwner(doc);
                      return (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-400 text-[11px] flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {owner.isClient ? (
                              <Building2 className="w-3 h-3 text-purple-500" />
                            ) : (
                              <User className="w-3 h-3 text-blue-500" />
                            )}
                            <span>Assigned To:</span>
                          </span>
                          <div className="text-right min-w-0">
                            <span className="font-semibold text-slate-800 truncate max-w-[150px] block">
                              {owner.name}
                            </span>
                            {owner.email && (
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] block" title={owner.email}>
                                {owner.email}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Upload Date:</span>
                      <span>
                        {doc.uploadDate
                          ? new Date(doc.uploadDate).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Expiry Date:</span>
                      <span className="font-medium">
                        {doc.expiryDate
                          ? new Date(doc.expiryDate).toLocaleDateString()
                          : "No Expiry"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openViewDialog(doc)}
                      className="flex-1 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <a
                      href={`/api/documents/${docId}/download`}
                      download={doc.originalName || "document"}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => openEditDialog(doc)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all"
                      title="Edit / Replace"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteDocument(docId, doc.title || doc.originalName)
                      }
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredDocuments.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} of{" "}
                {filteredDocuments.length} documents
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* Upload & Edit Document Dialog */}
      <UploadDocumentDialog
        isOpen={isUploadDialogOpen}
        onClose={() => {
          setIsUploadDialogOpen(false);
          setEditingDocumentId(null);
        }}
        employees={employees}
        newDocument={newDocument}
        setNewDocument={setNewDocument}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        onUpload={handleFileUpload}
        loading={loading}
        formErrors={formErrors}
      />

      {/* Detail Viewer Modal */}
      {isViewDialogOpen && viewingDocument && (
        <DocumentDetailViewerModal
          isOpen={isViewDialogOpen}
          document={viewingDocument}
          employeeName={getEmployeeName(viewingDocument.employeeId)}
          onClose={closeViewDialog}
          onReplaceFile={(doc) => {
            closeViewDialog();
            openEditDialog(doc);
          }}
        />
      )}
    </div>
  );
}
