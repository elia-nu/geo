"use client";

import React, { useState, useEffect } from "react";
import { subscribeToasts } from "./ui/toast";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export default function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (newToast) => {
      if (!newToast || !newToast.id) return;
      setToasts((prev) => {
        // Prevent duplicates
        if (prev.some((t) => t.id === newToast.id)) return prev;
        return [...prev, newToast];
      });

      if (newToast.autoClose > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.autoClose);
      }
    };

    // 1. Subscribe to function bus
    const unsubscribe = subscribeToasts(handleNewToast);

    // 2. Subscribe to window DOM event
    const handleDomEvent = (e) => {
      if (e && e.detail) {
        handleNewToast(e.detail);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("hrm:toast", handleDomEvent);
    }

    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("hrm:toast", handleDomEvent);
      }
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning" || t.type === "warn";
        const isInfo = t.type === "info";

        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border transition-all duration-300 transform translate-y-0 opacity-100 ${
              isSuccess
                ? "bg-slate-900 text-white border-emerald-500/40 shadow-emerald-950/30"
                : isError
                ? "bg-slate-900 text-white border-rose-500/40 shadow-rose-950/30"
                : isWarning
                ? "bg-slate-900 text-white border-amber-500/40 shadow-amber-950/30"
                : "bg-slate-900 text-white border-blue-500/40 shadow-blue-950/30"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {isError && (
                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {isWarning && (
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {isInfo && (
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm font-semibold text-white leading-snug">
                {t.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
