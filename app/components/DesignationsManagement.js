"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Briefcase,
  Building2,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Check,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { toast } from "./ui/toast";

export default function DesignationsManagement() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptDesignations, setDeptDesignations] = useState([]);
  const [newDesignation, setNewDesignation] = useState("");
  const [rename, setRename] = useState({ oldName: "", newName: "" });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [viewFilter, setViewFilter] = useState("department"); // 'department' | 'all'
  const [copiedName, setCopiedName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [desRes, deptRes] = await Promise.all([
        fetch("/api/designations"),
        fetch("/api/departments"),
      ]);

      if (!desRes.ok || !deptRes.ok) {
        throw new Error("Failed to load designations data");
      }

      const desJson = await desRes.json();
      const deptJson = await deptRes.json();

      const desList = Array.isArray(desJson?.designations)
        ? desJson.designations
        : Array.isArray(desJson)
        ? desJson
        : [];
      const deptList = Array.isArray(deptJson?.departments)
        ? deptJson.departments
        : Array.isArray(deptJson)
        ? deptJson
        : [];

      setDesignations(desList);
      setDepartments(deptList);
      if (!selectedDeptId && deptList.length > 0) {
        setSelectedDeptId(deptList[0]._id);
      }
    } catch (e) {
      toast.error(e.message || "Failed to fetch designations");
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load designations for selected department
  const loadDeptDesignations = useCallback(async (deptId) => {
    if (!deptId) return;
    try {
      const res = await fetch(`/api/departments/${deptId}/designations`);
      if (res.ok) {
        const js = await res.json();
        const list = Array.isArray(js?.designations) ? js.designations : [];
        setDeptDesignations(list);
      }
    } catch (e) {
      console.error("Failed to load dept designations:", e);
    }
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      loadDeptDesignations(selectedDeptId);
    }
  }, [selectedDeptId, loadDeptDesignations]);

  const selectedDept = useMemo(
    () => departments.find((d) => String(d._id) === String(selectedDeptId)),
    [departments, selectedDeptId]
  );

  const refreshLists = async () => {
    setLoading(true);
    await Promise.all([
      fetch("/api/designations")
        .then((r) => r.json())
        .then((j) => {
          setDesignations(Array.isArray(j?.designations) ? j.designations : []);
        })
        .catch(() => {}),
      selectedDeptId ? loadDeptDesignations(selectedDeptId) : Promise.resolve(),
    ]);
    setLoading(false);
    toast.info("Designations synchronized");
  };

  const addDesignation = async () => {
    const name = newDesignation.trim();
    if (!selectedDeptId) {
      toast.warning("Please select a department first");
      return;
    }
    if (!name) {
      toast.warning("Please enter a designation title");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to add designation");
      }
      toast.success(`Designation "${name}" added to ${selectedDept?.name || "department"}!`);
      setNewDesignation("");
      await Promise.all([
        loadDeptDesignations(selectedDeptId),
        fetch("/api/designations")
          .then((r) => r.json())
          .then((j) => setDesignations(Array.isArray(j?.designations) ? j.designations : [])),
      ]);
    } catch (e) {
      toast.error(e.message || "Failed to add designation");
    } finally {
      setActionLoading(false);
    }
  };

  const updateDesignation = async () => {
    const oldName = rename.oldName.trim();
    const newName = rename.newName.trim();
    if (!selectedDeptId || !oldName || !newName) {
      toast.warning("Please select an existing title and provide the new name");
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update designation");
      }
      toast.success(`Renamed "${oldName}" to "${newName}"!`);
      setRename({ oldName: "", newName: "" });
      await Promise.all([
        loadDeptDesignations(selectedDeptId),
        fetch("/api/designations")
          .then((r) => r.json())
          .then((j) => setDesignations(Array.isArray(j?.designations) ? j.designations : [])),
      ]);
    } catch (e) {
      toast.error(e.message || "Failed to update designation");
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRemoveDesignation = async () => {
    if (!deleteTarget || !selectedDeptId) return;
    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: deleteTarget }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to remove designation");
      }
      toast.success(`Removed designation "${deleteTarget}"`);
      setDeleteTarget(null);
      await Promise.all([
        loadDeptDesignations(selectedDeptId),
        fetch("/api/designations")
          .then((r) => r.json())
          .then((j) => setDesignations(Array.isArray(j?.designations) ? j.designations : [])),
      ]);
    } catch (e) {
      toast.error(e.message || "Failed to remove designation");
    } finally {
      setActionLoading(false);
    }
  };

  const copyDesignation = async (name) => {
    try {
      await navigator.clipboard.writeText(String(name));
      setCopiedName(String(name));
      toast.info(`Copied "${name}" to clipboard`, { autoClose: 1500 });
      setTimeout(() => setCopiedName(""), 2000);
    } catch {}
  };

  // List of designations to display based on tab/search
  const displayedDesignations = useMemo(() => {
    const list = viewFilter === "department" ? deptDesignations : designations;
    if (!query.trim()) return list;
    return list.filter((item) =>
      String(item).toLowerCase().includes(query.toLowerCase())
    );
  }, [viewFilter, deptDesignations, designations, query]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/20">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Roles & Titles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Designations Management
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Configure job titles by department and standardize company-wide designation roles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshLists}
              disabled={loading}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs sm:text-sm font-medium inline-flex items-center gap-2 backdrop-blur transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Designations
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {designations.length}
            </h3>
            <p className="text-xs text-blue-600 mt-0.5">Across all departments</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Departments Configured
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {departments.length}
            </h3>
            <p className="text-xs text-emerald-600 mt-0.5">Active organizational units</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Dept Roles
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {deptDesignations.length}
            </h3>
            <p className="text-xs text-indigo-600 mt-0.5">{selectedDept?.name || "Selected department"}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Department Context & Role Creation (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Department Selector Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Select Department</h3>
                <p className="text-xs text-slate-400">Choose division to manage roles</p>
              </div>
            </div>

            <div>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                {departments.length === 0 && (
                  <option value="">No departments available</option>
                )}
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Designation Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Add Designation</h3>
                <p className="text-xs text-slate-400">
                  Assign title to <strong className="text-slate-700">{selectedDept?.name || "department"}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Designation Title *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addDesignation();
                    }}
                    placeholder="e.g. Senior Software Engineer"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={addDesignation}
                    disabled={!newDesignation.trim() || !selectedDeptId || actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Rename / Modify Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Rename Designation</h3>
                <p className="text-xs text-slate-400">Update existing title in {selectedDept?.name || "department"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Current Title
                </label>
                <select
                  value={rename.oldName}
                  onChange={(e) => setRename({ ...rename, oldName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose existing role --</option>
                  {deptDesignations.map((n) => (
                    <option key={`old-${n}`} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  New Title
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rename.newName}
                    onChange={(e) => setRename({ ...rename, newName: e.target.value })}
                    placeholder="Enter updated name"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    onClick={updateDesignation}
                    disabled={!rename.oldName || !rename.newName.trim() || actionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 shrink-0"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Designations Explorer (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            {/* Explorer Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Designation Explorer</h3>
                  <p className="text-xs text-slate-400">
                    {viewFilter === "department"
                      ? `Roles in ${selectedDept?.name || "department"} (${deptDesignations.length})`
                      : `All system roles (${designations.length})`}
                  </p>
                </div>
              </div>

              {/* View filter buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setViewFilter("department")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewFilter === "department"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Current Dept ({deptDesignations.length})
                </button>
                <button
                  onClick={() => setViewFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    viewFilter === "all"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Roles ({designations.length})
                </button>
              </div>
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter designations..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Designations Grid / List */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : displayedDesignations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Briefcase className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  {query
                    ? `No designations matching "${query}"`
                    : viewFilter === "department"
                    ? `No designations configured for ${selectedDept?.name || "this department"}`
                    : "No designations registered in the system"}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Add one using the form on the left to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {displayedDesignations.map((des) => (
                  <div
                    key={`des-${des}`}
                    className="flex items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={String(des)}>
                        {des}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyDesignation(des)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copy designation name"
                      >
                        {copiedName === String(des) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {viewFilter === "department" && (
                        <button
                          onClick={() => setDeleteTarget(des)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove from department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Target Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Remove Designation?
                </h3>
                <p className="text-xs text-slate-500">
                  Remove <strong className="text-slate-800">"{deleteTarget}"</strong> from{" "}
                  <strong className="text-slate-800">{selectedDept?.name || "this department"}</strong>?
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveDesignation}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
