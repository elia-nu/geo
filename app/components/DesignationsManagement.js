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
  Users,
  Globe,
  LayoutGrid,
  List,
  ChevronDown,
  ShieldCheck,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";
import { toast } from "./ui/toast";
import Pagination from "./ui/Pagination";
import { usePermissions } from "../hooks/usePermissions";


export default function DesignationsManagement() {
  const { hasPermission } = usePermissions();

  // Data state
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, universal: 0, totalAssignedEmployees: 0 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all"); // 'all' | 'universal' | deptId
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Interaction feedback
  const [copiedId, setCopiedId] = useState("");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    isUniversal: true,
    departmentIds: [],
    departments: [],
    description: "",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);

  // Fetch all designations and departments
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
      if (desJson?.stats) {
        setStats(desJson.stats);
      } else {
        // Derive stats if not provided
        const activeCount = desList.filter((d) => (d.status || "active") === "active").length;
        const universalCount = desList.filter((d) => d.isUniversal !== false).length;
        const totalEmp = desList.reduce((sum, d) => sum + (d.employeeCount || 0), 0);
        setStats({
          total: desList.length,
          active: activeCount,
          universal: universalCount,
          totalAssignedEmployees: totalEmp,
        });
      }
    } catch (e) {
      toast.error(e.message || "Failed to fetch designations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Copy designation title
  const copyDesignation = async (des) => {
    const text = typeof des === "string" ? des : des?.name || "";
    const id = des?._id || des?.id || text;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.info(`Copied "${text}" to clipboard`, { autoClose: 1500 });
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingDesignation(null);
    setFormData({
      name: "",
      isUniversal: true,
      departmentIds: [],
      departments: [],
      description: "",
      status: "active",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (des) => {
    setEditingDesignation(des);
    setFormData({
      name: des.name || des.title || "",
      isUniversal: des.isUniversal !== false && (!des.departmentIds || des.departmentIds.length === 0),
      departmentIds: Array.isArray(des.departmentIds) ? des.departmentIds : [],
      departments: Array.isArray(des.departments) ? des.departments : [],
      description: des.description || "",
      status: des.status || "active",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Toggle department selection for specific scope
  const toggleDepartmentSelection = (dept) => {
    const deptId = String(dept._id);
    const deptName = dept.name;

    setFormData((prev) => {
      const exists = prev.departmentIds.includes(deptId);
      const newIds = exists
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId];
      const newNames = exists
        ? prev.departments.filter((name) => name !== deptName)
        : [...prev.departments, deptName];

      return {
        ...prev,
        departmentIds: newIds,
        departments: newNames,
      };
    });
  };

  // Handle Form Submit (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) {
      setFormErrors({ name: "Designation title is required" });
      return;
    }

    try {
      setActionLoading(true);
      const isEdit = Boolean(editingDesignation);
      const url = isEdit ? `/api/designations/${editingDesignation._id || editingDesignation.id}` : "/api/designations";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        name,
        isUniversal: formData.isUniversal,
        departmentIds: formData.isUniversal ? [] : formData.departmentIds,
        departments: formData.isUniversal ? [] : formData.departments,
        description: formData.description.trim(),
        status: formData.status,
      };

      if (isEdit) {
        payload.id = editingDesignation._id || editingDesignation.id;
        payload.oldName = editingDesignation.name;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save designation");
      }

      toast.success(
        isEdit
          ? `Designation "${name}" updated successfully!`
          : `Designation "${name}" created successfully!`
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save designation");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (des) => {
    setDeleteTarget(des);
    setForceDelete(false);
  };

  // Confirm Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setActionLoading(true);
      const targetId = deleteTarget._id || deleteTarget.id;
      const url = `/api/designations/${targetId}?force=${forceDelete}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.canForce) {
          toast.warning(data.error);
          setForceDelete(true);
          return;
        }
        throw new Error(data.error || "Failed to delete designation");
      }

      toast.success(`Designation "${deleteTarget.name}" deleted successfully!`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete designation");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered designations based on search and selected filters
  const filteredDesignations = useMemo(() => {
    return designations.filter((des) => {
      const name = String(des.name || des.title || "").toLowerCase();
      const desc = String(des.description || "").toLowerCase();
      const search = searchQuery.toLowerCase().trim();

      // Search match
      if (search && !name.includes(search) && !desc.includes(search)) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "all") {
        const status = des.status || "active";
        if (status !== selectedStatusFilter) return false;
      }

      // Department filter
      if (selectedDeptFilter !== "all") {
        if (selectedDeptFilter === "universal") {
          if (des.isUniversal === false && des.departments?.length > 0) return false;
        } else {
          // Specific department selected
          const isAssigned =
            des.departmentIds?.includes(selectedDeptFilter) ||
            des.departments?.some((d) => d === selectedDeptFilter);
          // If universal, it's also available to this department
          if (!des.isUniversal && !isAssigned) return false;
        }
      }

      return true;
    });
  }, [designations, searchQuery, selectedStatusFilter, selectedDeptFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatusFilter, selectedDeptFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredDesignations.length / itemsPerPage) || 1;
  const paginatedDesignations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesignations.slice(start, start + itemsPerPage);
  }, [filteredDesignations, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/20">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Architecture & Roles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Designations Management
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Define and standardize company roles independently. Designations are decoupled from departments and can be assigned across the organization or tailored to any department in any combination.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 backdrop-blur transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {hasPermission("designation.manage") && (
              <button
                onClick={openCreateModal}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md inline-flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Designation</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Designations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Designations
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {stats.total || designations.length}
              </h3>
              <p className="text-xs text-blue-600 font-medium mt-1">Standardized job roles</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Designations */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Roles
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {stats.active || designations.filter((d) => (d.status || "active") === "active").length}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">Available for assignment</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Universal Roles */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Universal Roles
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {stats.universal || designations.filter((d) => d.isUniversal !== false).length}
              </h3>
              <p className="text-xs text-indigo-600 font-medium mt-1">Any department combination</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Assigned Employees */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assigned Employees
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {stats.totalAssignedEmployees || designations.reduce((sum, d) => sum + (d.employeeCount || 0), 0)}
              </h3>
              <p className="text-xs text-purple-600 font-medium mt-1">Active staff members</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
        {/* Control Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or description..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 transition-all bg-slate-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Mode */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Scope Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Department Scopes</option>
                <option value="universal">🌐 Universal (Any Dept)</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    🏢 {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body: Loading / Empty / Grid / Table */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        ) : filteredDesignations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <Briefcase className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">No Designations Found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedDeptFilter !== "all" || selectedStatusFilter !== "all"
                ? "No roles match your search filters. Try clearing or relaxing your filters."
                : "No designations registered yet. Click 'New Designation' to create your first company role."}
            </p>
            {(searchQuery || selectedDeptFilter !== "all" || selectedStatusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDeptFilter("all");
                  setSelectedStatusFilter("all");
                }}
                className="mt-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedDesignations.map((des) => {
              const isActive = (des.status || "active") === "active";
              const isUniversal = des.isUniversal !== false && (!des.departments || des.departments.length === 0);

              return (
                <div
                  key={des._id || des.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle top indicator bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isActive ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-200"
                    }`}
                  />

                  <div className="space-y-3">
                    {/* Header: Title + Status */}
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate"
                            title={des.name}
                          >
                            {des.name}
                          </h3>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                      {des.description || "Standard organizational job role with full assignment flexibility."}
                    </p>

                    {/* Department Scope Badge */}
                    <div className="pt-2 border-t border-slate-50 flex flex-wrap items-center gap-1.5">
                      {isUniversal ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/70 text-[11px] font-semibold">
                          <Globe className="w-3 h-3 text-teal-600" />
                          <span>Any Department (Universal)</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Tailored to:
                          </span>
                          {des.departments?.slice(0, 2).map((deptName, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100 truncate max-w-[140px]"
                              title={deptName}
                            >
                              {deptName}
                            </span>
                          ))}
                          {des.departments?.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              +{des.departments.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Employee Count + Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {des.employeeCount || 0} {des.employeeCount === 1 ? "Employee" : "Employees"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyDesignation(des)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copy designation name"
                      >
                        {copiedId === (des._id || des.id) ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {hasPermission("designation.manage") && (
                        <>
                          <button
                            onClick={() => openEditModal(des)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit designation"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openDeleteModal(des)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete designation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Designation Title</th>
                  <th className="px-4 py-3.5">Department Scope</th>
                  <th className="px-4 py-3.5 text-center">Assigned Employees</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDesignations.map((des) => {
                  const isActive = (des.status || "active") === "active";
                  const isUniversal = des.isUniversal !== false && (!des.departments || des.departments.length === 0);

                  return (
                    <tr
                      key={des._id || des.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Name & Desc */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{des.name}</div>
                        {des.description && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">
                            {des.description}
                          </div>
                        )}
                      </td>

                      {/* Scope */}
                      <td className="px-4 py-3.5">
                        {isUniversal ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                            <Globe className="w-3 h-3 text-teal-600" />
                            <span>Universal (Any Dept)</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">
                            {des.departments?.join(", ") || "Specific"}
                          </span>
                        )}
                      </td>

                      {/* Employee Count */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                          <Users className="w-3 h-3 text-slate-500" />
                          {des.employeeCount || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => copyDesignation(des)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copy title"
                          >
                            {copiedId === (des._id || des.id) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {hasPermission("designation.manage") && (
                            <>
                              <button
                                onClick={() => openEditModal(des)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openDeleteModal(des)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredDesignations.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredDesignations.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[12, 24, 48, 96]}
            />
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {editingDesignation ? "Edit Designation" : "Create New Designation"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingDesignation
                      ? "Update job title details and organizational configuration"
                      : "Define a standardized role selectable across departments"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Designation Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  placeholder="e.g. Senior Structural Engineer"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                    formErrors.name
                      ? "border-rose-300 ring-rose-200"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Department Scope Selector (Separate from department / chosen in any combination) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Department Assignment Scope
                    </h4>
                    <p className="text-xs text-slate-500">
                      Decide whether this role is universally available or tailored to specific units.
                    </p>
                  </div>
                </div>

                {/* Segmented Choice */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        isUniversal: true,
                        departmentIds: [],
                        departments: [],
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      formData.isUniversal
                        ? "border-teal-500 bg-teal-50/70 text-teal-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Globe
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        formData.isUniversal ? "text-teal-600" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold">Universal (Any Department)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Can be chosen with any department in any combination.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isUniversal: false })}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      !formData.isUniversal
                        ? "border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Building2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        !formData.isUniversal ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold">Department Specific</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Assign to primary departments while remaining flexible.
                      </div>
                    </div>
                  </button>
                </div>

                {/* Specific Department Chips / Checkboxes */}
                {!formData.isUniversal && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Select Primary Department(s):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {departments.map((dept) => {
                        const isChecked = formData.departmentIds.includes(String(dept._id));
                        return (
                          <div
                            key={dept._id}
                            onClick={() => toggleDepartmentSelection(dept)}
                            className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                              isChecked
                                ? "border-blue-500 bg-blue-50 text-blue-900"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{dept.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role Description & Responsibilities
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Summarize key responsibilities, requirements, or qualifications for this position..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <span className="text-xs font-bold text-slate-800">Active Status</span>
                  <p className="text-xs text-slate-400">
                    Inactive designations won't appear as primary suggestions in employee profiles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      status: formData.status === "active" ? "inactive" : "active",
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    formData.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      formData.status === "active" ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingDesignation ? "Save Changes" : "Create Designation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete Designation?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove{" "}
                  <strong className="text-slate-800 font-semibold">"{deleteTarget.name}"</strong>{" "}
                  from the system?
                </p>
              </div>

              {/* Notice if employees are assigned */}
              {(deleteTarget.employeeCount || 0) > 0 ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs text-left space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Deletion Blocked</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    This designation is currently assigned to{" "}
                    <strong className="text-rose-950 font-bold">
                      {deleteTarget.employeeCount}{" "}
                      {deleteTarget.employeeCount === 1 ? "employee" : "employees"}
                    </strong>
                    . Designations with assigned employees cannot be deleted. Please reassign them to another designation before deleting.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center font-medium">
                  This designation has 0 assigned employees and can be safely deleted.
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={actionLoading || (deleteTarget.employeeCount || 0) > 0}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
