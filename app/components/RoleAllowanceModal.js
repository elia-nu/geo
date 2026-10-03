"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";

export default function RoleAllowanceModal({ isOpen, onClose, onNavigateSection }) {
  const { user, role, permissions, isAdmin, roleLevel } = usePermissions();
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadCatalog() {
      try {
        setLoading(true);
        const res = await fetch("/api/roles/permissions");
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.catalog || {});
        }
      } catch (err) {
        console.error("Failed to load permissions catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [isOpen]);

  // Check if a permission is granted
  const hasPerm = (permKey) => {
    if (isAdmin) return true;
    if (permissions.includes("*")) return true;
    if (permissions.includes(permKey)) return true;
    const parts = permKey.split(".");
    if (parts.length > 2) {
      const broader = parts.slice(0, 2).join(".");
      if (permissions.includes(broader)) return true;
    }
    return false;
  };

  // Grouped summary of allowed vs not allowed
  const categoryStats = useMemo(() => {
    const stats = {};
    for (const [cat, perms] of Object.entries(catalog)) {
      const total = perms.length;
      const granted = perms.filter((p) => hasPerm(p.key)).length;
      stats[cat] = { total, granted, hasAccess: granted > 0 };
    }
    return stats;
  }, [catalog, permissions, isAdmin]);

  // Filtered categories and permissions based on search
  const filteredCatalog = useMemo(() => {
    const result = {};
    const term = searchTerm.toLowerCase();

    for (const [cat, perms] of Object.entries(catalog)) {
      const matching = perms.filter((p) => {
        if (!term) return true;
        return (
          p.label.toLowerCase().includes(term) ||
          p.key.toLowerCase().includes(term) ||
          cat.toLowerCase().includes(term)
        );
      });

      if (matching.length > 0) {
        result[cat] = matching;
      }
    }
    return result;
  }, [catalog, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Your Role & Allowed Access</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Review all system capabilities and dashboard modules permitted for your account.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isAdmin ? "Full System Access (*)" : `${permissions.length} Permissions Active`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Layers className="w-3.5 h-3.5" />
              Level {roleLevel} Authority
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search allowed features, permissions, or modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Permissions Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium">Loading permissions catalog...</p>
            </div>
          ) : Object.keys(filteredCatalog).length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Info className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No permissions matched your search.</p>
            </div>
          ) : (
            Object.entries(filteredCatalog).map(([category, perms]) => {
              const allowedInCat = perms.filter((p) => hasPerm(p.key));
              const allAllowed = allowedInCat.length === perms.length;
              const hasAny = allowedInCat.length > 0;

              return (
                <div
                  key={category}
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs"
                >
                  {/* Category Header */}
                  <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{category}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          hasAny
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isAdmin ? "All Allowed" : `${allowedInCat.length} of ${perms.length} Allowed`}
                      </span>
                    </div>
                  </div>

                  {/* Permissions List */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((perm) => {
                      const granted = hasPerm(perm.key);
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                            granted
                              ? "bg-emerald-50/40 border-emerald-200/70 text-slate-800"
                              : "bg-slate-50/50 border-slate-200/50 text-slate-400 opacity-60"
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {granted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-xs font-semibold block ${
                                granted ? "text-slate-800" : "text-slate-500"
                              }`}
                            >
                              {perm.label}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {perm.key}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500">
            Permissions are enforced across all views, sidebar menus, and backend API endpoints.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
