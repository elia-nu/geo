"use client";

// Global window event & callback bus
const getListeners = () => {
  if (typeof window !== "undefined") {
    if (!window.__HRM_TOAST_LISTENERS__) {
      window.__HRM_TOAST_LISTENERS__ = new Set();
    }
    return window.__HRM_TOAST_LISTENERS__;
  }
  if (!globalThis.__HRM_TOAST_LISTENERS__) {
    globalThis.__HRM_TOAST_LISTENERS__ = new Set();
  }
  return globalThis.__HRM_TOAST_LISTENERS__;
};

export function emitToast(message, type = "info", options = {}) {
  const id = "toast_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
  const toastItem = {
    id,
    message: typeof message === "string" ? message : String(message || ""),
    type: type || "info",
    autoClose: options?.autoClose ?? 3500,
    createdAt: Date.now(),
  };

  // 1. Dispatch custom DOM event across window
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrm:toast", { detail: toastItem }));
  }

  // 2. Direct callback dispatch
  const listeners = getListeners();
  listeners.forEach((fn) => {
    try {
      fn(toastItem);
    } catch (e) {
      console.error("Toast listener error:", e);
    }
  });

  return id;
}

export const toast = {
  success: (msg, opts) => emitToast(msg, "success", opts),
  error: (msg, opts) => emitToast(msg, "error", opts),
  info: (msg, opts) => emitToast(msg, "info", opts),
  warning: (msg, opts) => emitToast(msg, "warning", opts),
  warn: (msg, opts) => emitToast(msg, "warning", opts),
};

if (typeof window !== "undefined") {
  window.toast = toast;
}

export function subscribeToasts(callback) {
  const listeners = getListeners();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export default toast;
