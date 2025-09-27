"use client";

import { useState, useEffect } from "react";
import {
  Comment as CommentIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";

const TaskComments = ({ taskId, currentUser, onUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await response.json();

      if (data.success) {
        setComments(data.comments || []);
      } else {
        setError(data.error || "Failed to fetch comments");
      }
    } catch (err) {
      setError("Error fetching comments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          userId: currentUser?.id || null,
          userName: currentUser?.name || "Unknown",
          userEmail: currentUser?.email || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment("");
        await fetchComments(); // Refresh comments
        onUpdate && onUpdate(); // Notify parent component
      } else {
        setError(data.error || "Failed to add comment");
      }
    } catch (err) {
      setError("Error adding comment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: editContent,
            userId: currentUser?.id || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setEditingComment(null);
        setEditContent("");
        await fetchComments(); // Refresh comments
        onUpdate && onUpdate(); // Notify parent component
      } else {
        setError(data.error || "Failed to update comment");
      }
    } catch (err) {
      setError("Error updating comment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}?userId=${
          currentUser?.id || ""
        }`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchComments(); // Refresh comments
        onUpdate && onUpdate(); // Notify parent component
      } else {
        setError(data.error || "Failed to delete comment");
      }
    } catch (err) {
      setError("Error deleting comment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent("");
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

  const canEditComment = (comment) => {
    return (
      currentUser?.id &&
      comment.userId &&
      comment.userId.toString() === currentUser.id
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

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-3">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {currentUser?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={loading}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                Press Ctrl+Enter to submit
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SendIcon fontSize="small" />
                {loading ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CommentIcon
              className="mx-auto text-gray-300 mb-2"
              style={{ fontSize: 48 }}
            />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
            >
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {comment.author?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {comment.author?.name || "Unknown"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                  {canEditComment(comment) && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => startEditing(comment)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit comment"
                      >
                        <EditIcon fontSize="small" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete comment"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  )}
                </div>

                {editingComment === comment._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditComment(comment._id)}
                        disabled={!editContent.trim() || loading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}

                {/* Comment metadata */}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <PersonIcon fontSize="small" />
                    <span>{comment.author?.email || "No email"}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <TimeIcon fontSize="small" />
                    <span>
                      {comment.updatedAt &&
                      comment.updatedAt !== comment.createdAt
                        ? `Updated ${formatDate(comment.updatedAt)}`
                        : `Created ${formatDate(comment.createdAt)}`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskComments;
