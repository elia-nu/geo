"use client";

import { useState, useEffect, useRef } from "react";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Flag as FlagIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  AccessTime as TimeIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";

const TaskDetailView = ({ task, isOpen, onClose, onUpdate }) => {
  const [taskData, setTaskData] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Time tracking state
  const [isTrackingTime, setIsTrackingTime] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeDescription, setTimeDescription] = useState("");
  const [showTimeDialog, setShowTimeDialog] = useState(false);

  // File upload
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Progress update
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (task && isOpen) {
      fetchTaskDetails();
      setProgress(task.progress || 0);
    }
  }, [task, isOpen]);

  const fetchTaskDetails = async () => {
    if (!task) return;

    try {
      setLoading(true);

      // Fetch detailed task data
      const [
        taskResponse,
        commentsResponse,
        attachmentsResponse,
        timeResponse,
      ] = await Promise.all([
        fetch(`/api/tasks/${task._id}`),
        fetch(`/api/tasks/${task._id}/comments`),
        fetch(`/api/tasks/${task._id}/attachments`),
        fetch(`/api/tasks/${task._id}/time-tracking`),
      ]);

      const [taskData, commentsData, attachmentsData, timeData] =
        await Promise.all([
          taskResponse.json(),
          commentsResponse.json(),
          attachmentsResponse.json(),
          timeResponse.json(),
        ]);

      if (taskData.success) setTaskData(taskData.task);
      if (commentsData.success) setComments(commentsData.comments);
      if (attachmentsData.success) setAttachments(attachmentsData.attachments);
      if (timeData.success) setTimeEntries(timeData.timeTracking.timeEntries);
    } catch (err) {
      setError("Error fetching task details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsAddingComment(true);
      const response = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          userId: "admin", // TODO: Get from auth context
          mentions: [], // TODO: Implement mention detection
          attachments: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewComment("");
        await fetchTaskDetails(); // Refresh comments
      } else {
        setError(data.error || "Failed to add comment");
      }
    } catch (err) {
      setError("Error adding comment: " + err.message);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("uploadedBy", "admin"); // TODO: Get from auth context

      const response = await fetch(`/api/tasks/${task._id}/attachments`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await fetchTaskDetails(); // Refresh attachments
      } else {
        setError(data.error || "Failed to upload files");
      }
    } catch (err) {
      setError("Error uploading files: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleStartTimeTracking = () => {
    setIsTrackingTime(true);
    setStartTime(new Date());
  };

  const handleStopTimeTracking = () => {
    if (!startTime) return;

    const endTime = new Date();
    const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

    setShowTimeDialog(true);
  };

  const handleSubmitTimeEntry = async () => {
    if (!startTime) return;

    try {
      const endTime = new Date();
      const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours

      const response = await fetch(`/api/tasks/${task._id}/time-tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "admin", // TODO: Get from auth context
          description: timeDescription,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
          date: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsTrackingTime(false);
        setStartTime(null);
        setTimeDescription("");
        setShowTimeDialog(false);
        await fetchTaskDetails(); // Refresh time entries
      } else {
        setError(data.error || "Failed to log time");
      }
    } catch (err) {
      setError("Error logging time: " + err.message);
    }
  };

  const handleProgressUpdate = async () => {
    try {
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: progress,
          updatedBy: "admin", // TODO: Get from auth context
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (onUpdate) onUpdate();
      } else {
        setError(data.error || "Failed to update progress");
      }
    } catch (err) {
      setError("Error updating progress: " + err.message);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "review":
        return "text-purple-600 bg-purple-100";
      case "blocked":
        return "text-red-600 bg-red-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {taskData?.title || task.title}
              </h2>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                    taskData?.priority || task.priority
                  )}`}
                >
                  {taskData?.priority || task.priority}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    taskData?.status || task.status
                  )}`}
                >
                  {(taskData?.status || task.status).replace("_", " ")}
                </span>
              </div>
              <p className="text-gray-600">
                {taskData?.description || task.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Task Details */}
              <div className="space-y-6">
                {/* Task Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Task Information
                  </h3>
                  <div className="space-y-3">
                    {/* Assignees */}
                    {taskData?.assignedEmployees &&
                      taskData.assignedEmployees.length > 0 && (
                        <div className="flex items-center gap-3">
                          <PersonIcon className="text-gray-400" />
                          <div>
                            <span className="text-sm text-gray-600">
                              Assigned to:
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {taskData.assignedEmployees.map((emp) => (
                                <div
                                  key={emp._id}
                                  className="flex items-center gap-1"
                                >
                                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                                    {emp.name.charAt(0)}
                                  </div>
                                  <span className="text-sm text-gray-700">
                                    {emp.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      {taskData?.startDate && (
                        <div className="flex items-center gap-2">
                          <ScheduleIcon
                            className="text-gray-400"
                            fontSize="small"
                          />
                          <div>
                            <div className="text-xs text-gray-500">
                              Start Date
                            </div>
                            <div className="text-sm text-gray-700">
                              {new Date(
                                taskData.startDate
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )}
                      {taskData?.dueDate && (
                        <div className="flex items-center gap-2">
                          <ScheduleIcon
                            className="text-gray-400"
                            fontSize="small"
                          />
                          <div>
                            <div className="text-xs text-gray-500">
                              Due Date
                            </div>
                            <div className="text-sm text-gray-700">
                              {new Date(taskData.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Tracking */}
                    <div className="flex items-center gap-3">
                      <TimeIcon className="text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Time:</span>
                        <div className="text-sm text-gray-700">
                          {taskData?.actualHours || 0}h /{" "}
                          {taskData?.estimatedHours || 0}h logged
                        </div>
                      </div>
                      <div className="ml-auto">
                        {!isTrackingTime ? (
                          <button
                            onClick={handleStartTimeTracking}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            <PlayIcon fontSize="small" />
                            Start
                          </button>
                        ) : (
                          <button
                            onClick={handleStopTimeTracking}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            <StopIcon fontSize="small" />
                            Stop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Progress</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-16">
                        Progress:
                      </span>
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={(e) =>
                            setProgress(parseInt(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>
                      <span className="text-sm font-medium w-12">
                        {progress}%
                      </span>
                      <button
                        onClick={handleProgressUpdate}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Update
                      </button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {taskData?.subtasks && taskData.subtasks.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Subtasks
                    </h3>
                    <div className="space-y-2">
                      {taskData.subtasks.map((subtask) => (
                        <div
                          key={subtask._id}
                          className="flex items-center gap-3 p-2 bg-white rounded border"
                        >
                          <CheckCircleIcon
                            className={
                              subtask.status === "completed"
                                ? "text-green-500"
                                : "text-gray-300"
                            }
                            fontSize="small"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              subtask.status === "completed"
                                ? "line-through text-gray-500"
                                : "text-gray-700"
                            }`}
                          >
                            {subtask.title}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${getPriorityColor(
                              subtask.priority
                            )}`}
                          >
                            {subtask.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {taskData?.dependentTasks &&
                  taskData.dependentTasks.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Dependencies
                      </h3>
                      <div className="space-y-2">
                        {taskData.dependentTasks.map((depTask) => (
                          <div
                            key={depTask._id}
                            className="flex items-center gap-3 p-2 bg-white rounded border"
                          >
                            <TimelineIcon
                              className="text-gray-400"
                              fontSize="small"
                            />
                            <span className="flex-1 text-sm text-gray-700">
                              {depTask.title}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${getStatusColor(
                                depTask.status
                              )}`}
                            >
                              {depTask.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Right Column - Communication */}
              <div className="space-y-6">
                {/* Attachments */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Attachments ({attachments.length})
                    </h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <AttachFileIcon fontSize="small" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment._id}
                        className="flex items-center gap-3 p-2 bg-white rounded border"
                      >
                        <AttachFileIcon
                          className="text-gray-400"
                          fontSize="small"
                        />
                        <span className="flex-1 text-sm text-gray-700 truncate">
                          {attachment.originalName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <DownloadIcon fontSize="small" />
                        </button>
                      </div>
                    ))}
                    {attachments.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No attachments yet
                      </p>
                    )}
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Comments ({comments.length})
                  </h3>

                  {/* Comment Form */}
                  <form onSubmit={handleAddComment} className="mb-4">
                    <div className="flex gap-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || isAddingComment}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <SendIcon fontSize="small" />
                      </button>
                    </div>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((comment) => (
                      <div
                        key={comment._id}
                        className="bg-white rounded-lg p-3 border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {comment.userName.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900">
                                {comment.userName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No comments yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entry Dialog */}
      {showTimeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Log Time Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <p className="text-sm text-gray-600">
                  {Math.round((new Date() - startTime) / (1000 * 60))} minutes
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={timeDescription}
                  onChange={(e) => setTimeDescription(e.target.value)}
                  placeholder="What did you work on?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTimeDialog(false);
                  setIsTrackingTime(false);
                  setStartTime(null);
                  setTimeDescription("");
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTimeEntry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Log Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg z-60">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskDetailView;
