"use client";
import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Calendar,
  Clock,
  User,
  Building2,
  Tag,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "./ui/button";

export default function DocumentDetailViewerModal({
  isOpen,
  onClose,
  document,
  employeeName,
  onReplaceFile,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeView, setActiveView] = useState("preview"); // "preview" | "details"
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    // Reset zoom and rotation on document change
    setZoom(1);
    setRotation(0);
    setPreviewError(false);
    setActiveView("preview");
  }, [document]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const docId = document._id || document.id;
  const fileName = document.originalName || document.fileName || document.title || "Document";
  const title = document.title || document.originalName || "Document";
  const mimeType = document.mimeType || "";
  const isPdf =
    mimeType.includes("pdf") ||
    /\.pdf$/i.test(fileName) ||
    document.documentType === "pdf";
  const isImage =
    mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  const isDocx =
    mimeType.includes("word") ||
    /\.(docx|doc)$/i.test(fileName);
  const isExcel =
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    /\.(xlsx|xls|csv)$/i.test(fileName);

  const previewUrl = docId ? `/api/documents/${docId}/download?inline=true` : "";
  const downloadUrl = docId ? `/api/documents/${docId}/download` : "#";

  const isClientDoc = document.entityType === "client" || (!document.employeeId && !!document.clientName);
  const ownerLabel = isClientDoc
    ? (document.clientName || "Client")
    : (employeeName || "Employee");

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return String(dateValue);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateValue);
    }
  };

  const docTypeLabel =
    document.documentType ||
    document.type ||
    document.category ||
    "General Document";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              {isPdf ? (
                <FileText className="w-6 h-6 text-rose-400" />
              ) : isImage ? (
                <ImageIcon className="w-6 h-6 text-emerald-400" />
              ) : isExcel ? (
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              ) : (
                <FileCheck className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold truncate text-white leading-snug">
                {title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 font-medium">
                  {docTypeLabel}
                </span>
                <span>•</span>
                <span>{formatFileSize(document.fileSize)}</span>
                {ownerLabel && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-200">
                      {isClientDoc ? (
                        <Building2 className="w-3 h-3 text-purple-400" />
                      ) : (
                        <User className="w-3 h-3 text-blue-400" />
                      )}
                      <span>{ownerLabel}</span>
                      {isClientDoc && document.clientEmail && (
                        <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                          ({document.clientEmail})
                        </span>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:shadow-md"
              title="Download File"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {docId && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {onReplaceFile && (
              <button
                onClick={() => onReplaceFile(document)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                title="Replace Document File"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace File</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeView === "preview"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Document Preview
            </button>
            <button
              onClick={() => setActiveView("details")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeView === "details"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Full Details & Metadata
            </button>
          </div>

          {/* Zoom / Rotate controls for image preview */}
          {activeView === "preview" && isImage && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-l border-slate-200 dark:border-slate-700 ml-1 pl-1.5"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-950 flex flex-col">
          {activeView === "preview" ? (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              {isPdf ? (
                <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800 bg-white">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-none"
                    title={title}
                  />
                </div>
              ) : isImage ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: "transform 0.2s ease-in-out",
                    }}
                    className="flex items-center justify-center max-w-full max-h-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={title}
                      className="max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                      onError={() => setPreviewError(true)}
                    />
                  </div>
                </div>
              ) : (
                /* Non-previewable file card (Docx, Excel, Archive, etc.) */
                <div className="max-w-md w-full p-8 text-center bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                    {isDocx ? (
                      <FileText className="w-10 h-10 text-blue-500" />
                    ) : isExcel ? (
                      <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <FileCheck className="w-10 h-10 text-indigo-500" />
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
                    {fileName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    {docTypeLabel} • {formatFileSize(document.fileSize)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    This file format is not previewed inline in the browser. You can download and open it directly.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href={downloadUrl}
                      download={fileName}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </a>
                    {onReplaceFile && (
                      <button
                        onClick={() => onReplaceFile(document)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-sm font-semibold border border-slate-200 dark:border-slate-700 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Replace File
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Details and Metadata View */
            <div className="w-full h-full p-6 overflow-y-auto max-w-3xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Document Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Document Title
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {title}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Document Category / Type
                      </span>
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {docTypeLabel}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Original File Name
                      </span>
                      <span className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">
                        {fileName}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        File Size & MIME Type
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {formatFileSize(document.fileSize)} ({mimeType || "application/octet-stream"})
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Upload Date
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(document.uploadDate || document.createdAt)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Expiry Date
                      </span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {document.expiryDate ? formatDate(document.expiryDate) : "No Expiry"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 md:col-span-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                        Assigned To ({isClientDoc ? "Client" : "Employee"})
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {isClientDoc ? (
                          <>
                            <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="text-purple-700 dark:text-purple-400 font-bold text-sm">{ownerLabel}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold uppercase">Client</span>
                            {document.clientEmail && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                &bull; {document.clientEmail}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">{ownerLabel}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold uppercase">Employee</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {document.description && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Description / Notes
                    </h5>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {document.description}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Status: {document.status || "Active"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {onReplaceFile && (
                      <button
                        onClick={() => onReplaceFile(document)}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replace File
                      </button>
                    )}
                    <a
                      href={downloadUrl}
                      download={fileName}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
