"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  Flag,
  Target,
  MessageSquare,
  Paperclip,
  Send,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  CheckSquare,
  Upload,
  Download,
  Eye,
} from "lucide-react";

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdate,
  employeeId,
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && task) {
      fetchTaskDetails();
    }
  }, [isOpen, task]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Fetch task details with comments and attachments
      const response = await fetch(`/api/tasks/${task._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task details");
      }

      const data = await response.json();
      if (data.success) {
        setComments(data.task.comments || []);
        setAttachments(data.task.attachments || []);
      } else {
        setError(data.error || "Failed to load task details");
      }
    } catch (err) {
      console.error("Error fetching task details:", err);
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      console.log("Adding comment with employeeId:", employeeId);

      const response = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-employee-id": employeeId,
        },
        body: JSON.stringify({
          content: newComment.trim(),
          type: "comment",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const data = await response.json();
      if (data.success) {
        setComments([...comments, data.comment]);
        setNewComment("");
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    try {
      setUploadingFile(true);
      setError("");

      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", task._id);

      const response = await fetch(`/api/tasks/${task._id}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-employee-id": employeeId,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      if (data.success) {
        setAttachments([...attachments, data.attachment]);
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `/api/tasks/${task._id}/attachments/${attachment._id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download file");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Play className="w-4 h-4" />;
      case "review":
        return <AlertCircle className="w-4 h-4" />;
      case "blocked":
        return <Pause className="w-4 h-4" />;
      default:
        return <CheckSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (date) => {
    if (!date) return "No date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    <span className="capitalize">{task.priority}</span>
                  </div>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {getStatusIcon(task.status)}
                    <span className="ml-1 capitalize">
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Task Description */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {task.description || "No description available"}
                  </p>
                </div>

                {/* Task Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                    {task.startDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Start: {formatDate(task.startDate)}</span>
                      </div>
                    )}
                    {task.project && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Target className="w-4 h-4 mr-2" />
                        <span className="truncate">{task.project.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>Created: {formatDate(task.createdAt)}</span>
                    </div>
                    {task.estimatedHours && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Est. Hours: {task.estimatedHours}</span>
                      </div>
                    )}
                    {task.actualHours > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Actual Hours: {task.actualHours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {task.progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      Attachments
                    </h4>
                    <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                      <Upload className="w-3 h-3 mr-1" />
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>
                  </div>
                  {uploadingFile && (
                    <div className="flex items-center text-sm text-blue-600 mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Uploading file...
                    </div>
                  )}
                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-500">No attachments</p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <Paperclip className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {attachment.originalName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)} •{" "}
                                {attachment.uploadedByName || "Unknown"} •{" "}
                                {formatDate(attachment.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadAttachment(attachment)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Comments
                  </h4>
                  <div className="space-y-3 mb-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-gray-500">No comments yet</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment._id} className="flex space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-900">
                                {comment.content}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {comment.userName ||
                                  comment.author?.name ||
                                  "Unknown"}{" "}
                                • {formatDate(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
