"use client";

import { useState, useEffect, useRef } from "react";
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
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";

const TaskAttachments = ({ taskId, currentUser, onUpdate }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [editingAttachment, setEditingAttachment] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (taskId) {
      fetchAttachments();
    }
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      const data = await response.json();

      if (data.success) {
        setAttachments(data.attachments || []);
      } else {
        setError(data.error || "Failed to fetch attachments");
      }
    } catch (err) {
      setError("Error fetching attachments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", currentUser?.id || "");
        formData.append("userName", currentUser?.name || "Unknown");
        formData.append("description", "");

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to upload file");
        }
      }

      await fetchAttachments(); // Refresh attachments
      onUpdate && onUpdate(); // Notify parent component
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Error uploading files: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      setLoading(true);
      setError(null);

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
        await fetchAttachments(); // Refresh attachments
        onUpdate && onUpdate(); // Notify parent component
      } else {
        setError(data.error || "Failed to delete attachment");
      }
    } catch (err) {
      setError("Error deleting attachment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDescription = async (attachmentId) => {
    if (!editDescription.trim()) return;

    try {
      setLoading(true);
      setError(null);

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
        await fetchAttachments(); // Refresh attachments
        onUpdate && onUpdate(); // Notify parent component
      } else {
        setError(data.error || "Failed to update attachment");
      }
    } catch (err) {
      setError("Error updating attachment: " + err.message);
    } finally {
      setLoading(false);
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
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        />
        <UploadIcon
          className="mx-auto text-gray-400 mb-2"
          style={{ fontSize: 48 }}
        />
        <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
        <p className="text-sm text-gray-500 mb-4">
          Supports images, PDFs, documents, and archives (max 10MB each)
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
        >
          <AttachFileIcon fontSize="small" />
          {uploading ? "Uploading..." : "Choose Files"}
        </button>
      </div>

      {/* Attachments List */}
      <div className="space-y-3">
        {loading && attachments.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AttachFileIcon
              className="mx-auto text-gray-300 mb-2"
              style={{ fontSize: 48 }}
            />
            <p>No attachments yet. Upload some files to get started!</p>
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment._id}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0">
                {getFileIcon(attachment.fileType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {attachment.originalName}
                  </h4>
                  <div className="flex items-center space-x-1">
                    <a
                      href={attachment.filePath}
                      download={attachment.originalName}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Download file"
                    >
                      <DownloadIcon fontSize="small" />
                    </a>
                    {canEditAttachment(attachment) && (
                      <>
                        <button
                          onClick={() => startEditing(attachment)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit description"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment._id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                      placeholder="Add a description..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateDescription(attachment._id)}
                        disabled={loading}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {attachment.description && (
                      <p className="text-sm text-gray-600">
                        {attachment.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(attachment.fileSize)}</span>
                      <span className="flex items-center space-x-1">
                        <PersonIcon fontSize="small" />
                        <span>{attachment.uploadedByName}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <TimeIcon fontSize="small" />
                        <span>{formatDate(attachment.uploadedAt)}</span>
                      </span>
                      {attachment.downloadCount > 0 && (
                        <span>{attachment.downloadCount} downloads</span>
                      )}
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
