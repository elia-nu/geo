"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as DocumentIcon,
  Archive as ArchiveIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import {
  showSuccessToast,
  showErrorToast,
  showDeleteConfirmDialog,
} from "../utils/sweetAlert";

const TaskAttachments = ({
  taskId,
  currentUser,
  onUpdate,
  showSuccessAlert,
  showErrorAlert,
  onSuccess,
  onError,
  setLoading: setParentLoading,
}) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const fileInputRef = useRef(null);

  const notifySuccess = useCallback(
    (message) => {
      if (showSuccessAlert) showSuccessAlert(message);
      else if (onSuccess) onSuccess(message);
      else showSuccessToast("Success", message);
    },
    [showSuccessAlert, onSuccess]
  );

  const notifyError = useCallback(
    (message) => {
      if (showErrorAlert) showErrorAlert(message);
      else if (onError) onError(message);
      else showErrorToast("Error", message);
    },
    [showErrorAlert, onError]
  );

  useEffect(() => {
    if (taskId) {
      fetchAttachments();
    }
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      setParentLoading?.(true);
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await response.json();

      if (data.success) {
        setAttachments(data.attachments || []);
      } else {
        notifyError(data.error || "Failed to fetch attachments");
      }
    } catch (err) {
      notifyError("Error fetching attachments: " + err.message);
    } finally {
      setLoading(false);
      setParentLoading?.(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      setParentLoading?.(true);

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", currentUser?.id || "");
        formData.append("userName", currentUser?.name || "Unknown");
        formData.append("description", "");

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: {
            "x-employee-id": currentUser?.id || "",
          },
          body: formData,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to upload file");
        }
      }

      await fetchAttachments();
      onUpdate?.();
      notifySuccess("Files uploaded successfully");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      notifyError("Error uploading files: " + err.message);
    } finally {
      setUploading(false);
      setParentLoading?.(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const result = await showDeleteConfirmDialog(
      "Delete file?",
      "This attachment will be permanently removed.",
      "Yes, delete it"
    );
    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      setParentLoading?.(true);

      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}?userId=${
          currentUser?.id || ""
        }`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchAttachments();
        onUpdate?.();
        notifySuccess("Attachment deleted");
      } else {
        notifyError(data.error || "Failed to delete attachment");
      }
    } catch (err) {
      notifyError("Error deleting attachment: " + err.message);
    } finally {
      setLoading(false);
      setParentLoading?.(false);
    }
  };

  const handleUpdateDescription = async (attachmentId) => {
    if (!editDescription.trim()) return;

    try {
      setLoading(true);
      setParentLoading?.(true);

      const response = await fetch(
        `/api/tasks/${taskId}/attachments/${attachmentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: editDescription,
            userId: currentUser?.id || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setEditingAttachment(null);
        setEditDescription("");
        await fetchAttachments();
        onUpdate?.();
        notifySuccess("Description updated");
      } else {
        notifyError(data.error || "Failed to update attachment");
      }
    } catch (err) {
      notifyError("Error updating attachment: " + err.message);
    } finally {
      setLoading(false);
      setParentLoading?.(false);
    }
  };

  const startEditing = (attachment) => {
    setEditingAttachment(attachment._id);
    setEditDescription(attachment.description || "");
  };

  const cancelEditing = () => {
    setEditingAttachment(null);
    setEditDescription("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FileIcon className="text-gray-500" />;

    if (fileType.startsWith("image/"))
      return <ImageIcon className="text-blue-500" />;
    if (fileType === "application/pdf")
      return <PdfIcon className="text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <DocumentIcon className="text-blue-600" />;
    if (fileType.includes("zip") || fileType.includes("rar"))
      return <ArchiveIcon className="text-orange-500" />;
    return <FileIcon className="text-gray-500" />;
  };

  const canEditAttachment = (attachment) => {
    return (
      currentUser?.id &&
      attachment.uploadedBy &&
      attachment.uploadedBy.toString() === currentUser.id
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/30">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        />
        <UploadIcon
          className="mx-auto mb-2 text-slate-400"
          style={{ fontSize: 40 }}
        />
        <p className="mb-1 text-sm font-medium text-slate-700">
          Drop files here or click to upload
        </p>
        <p className="mb-4 text-xs text-slate-400">
          Images, PDFs, documents, archives · max 10MB each
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mx-auto inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/40 active:scale-[0.98]"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <AttachFileIcon fontSize="small" />
              Choose Files
            </>
          )}
        </button>
      </div>

      <div className="space-y-2.5">
        {loading && attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <div className="h-8 w-8 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
            <p className="animate-pulse text-sm text-slate-500">
              Loading files…
            </p>
          </div>
        ) : attachments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-slate-500">
            <AttachFileIcon
              className="mx-auto mb-2 text-slate-300"
              style={{ fontSize: 40 }}
            />
            <p className="text-sm">No attachments yet</p>
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                {getFileIcon(attachment.fileType)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h4 className="truncate text-sm font-medium text-slate-900">
                    {attachment.originalName}
                  </h4>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <a
                      href={attachment.filePath}
                      download={attachment.originalName}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-700"
                      title="Download file"
                    >
                      <DownloadIcon fontSize="small" />
                    </a>
                    {canEditAttachment(attachment) && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(attachment)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-700"
                          title="Edit description"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteAttachment(attachment._id)
                          }
                          disabled={loading || uploading}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40"
                          title="Delete file"
                        >
                          <DeleteIcon fontSize="small" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingAttachment === attachment._id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add a description…"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateDescription(attachment._id)}
                        disabled={loading}
                        className="rounded-lg bg-blue-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {attachment.description && (
                      <p className="text-sm text-slate-600">
                        {attachment.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>{formatFileSize(attachment.size)}</span>
                      <span className="inline-flex items-center gap-1">
                        <PersonIcon className="!text-sm" />
                        {attachment.uploadedByName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <TimeIcon className="!text-sm" />
                        {formatDate(attachment.uploadedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskAttachments;
