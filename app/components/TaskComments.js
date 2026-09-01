"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Comment as CommentIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
import {
  showSuccessToast,
  showErrorToast,
  showDeleteConfirmDialog,
} from "../utils/sweetAlert";

const POLL_INTERVAL_MS = 5000;

const TaskComments = ({
  taskId,
  currentUser,
  onUpdate,
  showSuccessAlert,
  showErrorAlert,
  onSuccess,
  onError,
  setLoading: setParentLoading,
  pollInterval = POLL_INTERVAL_MS,
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const commentsRef = useRef([]);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    busyRef.current = submitting || Boolean(actionId);
  }, [submitting, actionId]);

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

  const fetchComments = useCallback(
    async ({ silent = false } = {}) => {
      if (!taskId) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!silent) {
          setInitialLoading(true);
          setParentLoading?.(true);
        } else {
          setIsPolling(true);
        }

        const response = await fetch(`/api/tasks/${taskId}/comments`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!mountedRef.current) return;

        if (data.success) {
          const rawComments = data.comments || [];
          const seen = new Set();
          const deduped = [];
          for (const c of rawComments) {
            if (!c) continue;
            const idKey = c._id ? String(c._id) : null;
            const timeBucket = c.createdAt
              ? Math.floor(new Date(c.createdAt).getTime() / 10000)
              : "0";
            const signatureKey = `${c.userId || c.authorId || c.userName || ""}_${
              c.content || ""
            }_${timeBucket}`;
            if (idKey && seen.has(idKey)) continue;
            if (seen.has(signatureKey)) continue;
            if (idKey) seen.add(idKey);
            seen.add(signatureKey);
            deduped.push(c);
          }

          const next = deduped.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          const prev = commentsRef.current;
          const changed =
            next.length !== prev.length ||
            next.some((c, i) => {
              const p = prev[i];
              return (
                !p ||
                String(c._id) !== String(p._id) ||
                c.content !== p.content ||
                String(c.updatedAt || "") !== String(p.updatedAt || "")
              );
            });

          if (changed) {
            setComments(next);
          }
          setLastSyncedAt(new Date());
        } else if (!silent) {
          notifyError(data.error || "Failed to fetch comments");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!silent && mountedRef.current) {
          notifyError("Error fetching comments: " + err.message);
        }
      } finally {
        if (mountedRef.current) {
          if (!silent) {
            setInitialLoading(false);
            setParentLoading?.(false);
          }
          setIsPolling(false);
        }
      }
    },
    [taskId, notifyError, setParentLoading]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!taskId) return;

    setComments([]);
    setEditingComment(null);
    setEditContent("");
    setNewComment("");
    setInitialLoading(true);
    fetchComments({ silent: false });
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (busyRef.current) return;
      fetchComments({ silent: true });
    }, pollInterval);

    return () => clearInterval(interval);
  }, [taskId, pollInterval, fetchComments]);

  const handleAddComment = async (e) => {
    e?.preventDefault?.();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      setParentLoading?.(true);

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-employee-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          content: newComment.trim(),
          userId: currentUser?.id || null,
          userName: currentUser?.name || "Unknown",
          userEmail: currentUser?.email || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment("");
        await fetchComments({ silent: true });
        onUpdate?.();
        notifySuccess("Comment posted");
      } else {
        notifyError(data.error || "Failed to add comment");
      }
    } catch (err) {
      notifyError("Error adding comment: " + err.message);
    } finally {
      setSubmitting(false);
      setParentLoading?.(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim() || actionId) return;

    try {
      setActionId(commentId);
      setParentLoading?.(true);

      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-employee-id": currentUser?.id || "",
          },
          body: JSON.stringify({
            content: editContent.trim(),
            userId: currentUser?.id || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setEditingComment(null);
        setEditContent("");
        await fetchComments({ silent: true });
        onUpdate?.();
        notifySuccess("Comment updated");
      } else {
        notifyError(data.error || "Failed to update comment");
      }
    } catch (err) {
      notifyError("Error updating comment: " + err.message);
    } finally {
      setActionId(null);
      setParentLoading?.(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const result = await showDeleteConfirmDialog(
      "Delete comment?",
      "This comment will be permanently removed.",
      "Yes, delete it"
    );
    if (!result.isConfirmed) return;

    try {
      setActionId(commentId);
      setParentLoading?.(true);

      const response = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}?userId=${
          currentUser?.id || ""
        }`,
        {
          method: "DELETE",
          headers: {
            "x-employee-id": currentUser?.id || "",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchComments({ silent: true });
        onUpdate?.();
        notifySuccess("Comment deleted");
      } else {
        notifyError(data.error || "Failed to delete comment");
      }
    } catch (err) {
      notifyError("Error deleting comment: " + err.message);
    } finally {
      setActionId(null);
      setParentLoading?.(false);
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
      const mins = Math.max(1, Math.floor((now - date) / (1000 * 60)));
      return mins < 2 ? "Just now" : `${mins}m ago`;
    }
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const canEditComment = (comment) => {
    return (
      currentUser?.id &&
      comment.userId &&
      comment.userId.toString() === currentUser.id
    );
  };

  const busy = submitting || Boolean(actionId);

  return (
    <div className="space-y-5">
      <form onSubmit={handleAddComment} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold text-white shadow-sm">
            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAddComment(e);
                }
              }}
              placeholder="Write a comment…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              rows={3}
              disabled={submitting}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Ctrl+Enter to post</span>
                {lastSyncedAt && (
                  <span className="inline-flex items-center gap-1">
                    <SyncIcon
                      className={`!text-sm ${isPolling ? "animate-spin" : ""}`}
                    />
                    Live · {formatDate(lastSyncedAt)}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-900/40 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Posting…
                  </>
                ) : (
                  <>
                    <SendIcon fontSize="small" />
                    Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {initialLoading && comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="h-9 w-9 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
            <p className="text-sm text-slate-500 animate-pulse">
              Loading comments…
            </p>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
            <CommentIcon
              className="mx-auto mb-2 text-slate-300"
              style={{ fontSize: 40 }}
            />
            <p className="text-sm font-medium text-slate-600">No comments yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Start the discussion — new comments appear live.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isActing = actionId === comment._id;
            return (
              <div
                key={comment._id}
                className={`group flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-opacity ${
                  isActing ? "opacity-60" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-semibold text-white">
                  {(
                    comment.userName ||
                    comment.author?.name ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {comment.userName ||
                          comment.author?.name ||
                          "Unknown"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.isEdited && (
                        <span className="text-[11px] text-slate-400">
                          (edited)
                        </span>
                      )}
                    </div>
                    {canEditComment(comment) &&
                      editingComment !== comment._id && (
                        <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEditing(comment)}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-700 disabled:opacity-40"
                            title="Edit comment"
                          >
                            <EditIcon fontSize="small" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment._id)}
                            disabled={busy}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40"
                            title="Delete comment"
                          >
                            {isActing ? (
                              <span className="inline-block h-4 w-4 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </button>
                        </div>
                      )}
                  </div>

                  {editingComment === comment._id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        rows={3}
                        disabled={isActing}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isActing}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditComment(comment._id)}
                          disabled={!editContent.trim() || isActing}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
                        >
                          {isActing ? (
                            <>
                              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                              Saving…
                            </>
                          ) : (
                            "Save"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {comment.content}
                    </p>
                  )}

                  {comment.updatedAt &&
                    comment.updatedAt !== comment.createdAt &&
                    editingComment !== comment._id && (
                      <div className="mt-2 flex justify-end text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <TimeIcon className="!text-sm" />
                          Updated {formatDate(comment.updatedAt)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskComments;
