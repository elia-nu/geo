"use client";
import React from "react";
import {
  ShieldAlert,
  ArrowLeft,
  Lock,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

export default function AccessRestrictedSection({
  section,
  requiredPermission,
  userRole,
  onReturnToDashboard,
  onNavigateSection,
}) {
  const { permissions, isAdmin } = usePermissions();

  // Helper to format section name nicely
  const formatSectionName = (sec) => {
    if (!sec) return "Requested Page";
    return sec
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-amber-950 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-rose-500/10 blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center flex-shrink-0 backdrop-blur-sm text-rose-300">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-1">
                <Lock className="w-3 h-3" />
                Access Restricted
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Permission Required: {formatSectionName(section)}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                Your role does not have permission to view or manage this section.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                Attempted Section
              </span>
              <span className="font-semibold text-slate-800 text-sm mt-1 block">
                {formatSectionName(section)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                Required Permission
              </span>
              <span className="font-mono text-xs font-semibold text-rose-600 mt-1 block bg-rose-50 px-2 py-1 rounded inline-block border border-rose-100">
                {requiredPermission || "Restricted Access"}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
                Your Assigned Role
              </span>
              <span className="font-semibold text-blue-700 text-sm mt-1 block bg-blue-50 px-2 py-1 rounded inline-block border border-blue-100">
                {userRole || "Employee"}
              </span>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-sm flex gap-3 items-start">
            <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Why am I seeing this?</p>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 leading-relaxed">
                The GEO HRM system uses Role-Based Access Control (RBAC). Only personnel with the
                designated privileges for this module can access these records or actions.
                If you require access for your daily work responsibilities, please ask your System
                Administrator to adjust your role permissions.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onReturnToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>

            <span className="text-xs text-slate-400">
              Need assistance? Contact your HR or IT Administrator.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
