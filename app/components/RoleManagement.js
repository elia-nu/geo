"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Users,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
  Loader2,
  AlertTriangle,
  Lock,
  Info,
  RefreshCw,
  LayoutGrid,
  Table,
  List,
  Filter,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import PermissionMatrix from "./PermissionMatrix";
import Pagination from "./ui/Pagination";
import usePermissions from "../hooks/usePermissions";

export default function RoleManagement() {
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission("role.manage");
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState({});
  const [allPermKeys, setAllPermKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("cards"); // cards | table | matrix

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create"); // create | edit | clone
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    level: 10,
    permissions: [],
  });

  // Permission group expand state
  const [expandedGroups, setExpandedGroups] = useState({});
  const [permSearch, setPermSearch] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch data
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles?withUserCount=true"),
        fetch("/api/roles/permissions"),
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      setRoles(rolesData.roles || []);
      setPermissionCatalog(permsData.catalog || {});
      setAllPermKeys(permsData.allKeys || []);
    } catch (err) {
      setError("Failed to load roles");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Open dialog
  const openCreate = () => {
    setFormData({ name: "", displayName: "", description: "", level: 10, permissions: [] });
    setDialogMode("create");
    setEditingRole(null);
    setDialogOpen(true);
    setExpandedGroups({});
    setPermSearch("");
  };

  const openEdit = (role) => {
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      level: role.level,
      permissions: [...(role.permissions || [])],
    });
    setDialogMode("edit");
    setEditingRole(role);
    setDialogOpen(true);
    setExpandedGroups({});
    setPermSearch("");
  };

  const openClone = (role) => {
    setFormData({
      name: role.name + "_COPY",
      displayName: role.displayName + " (Copy)",
      description: role.description || "",
      level: role.level,
      permissions: [...(role.permissions || [])],
    });
    setDialogMode("clone");
    setEditingRole(null);
    setDialogOpen(true);
    setExpandedGroups({});
    setPermSearch("");
  };

  // Save role
  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!formData.displayName.trim()) {
        setError("Display name is required");
        setSaving(false);
        return;
      }

      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      let res;
      if (dialogMode === "edit" && editingRole) {
        res = await fetch(`/api/roles/${editingRole._id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            displayName: formData.displayName,
            description: formData.description,
            level: formData.level,
            permissions: formData.permissions,
          }),
        });
      } else {
        // Create or Clone
        const name =
          dialogMode === "create" || dialogMode === "clone"
            ? formData.name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
            : formData.name;

        res = await fetch("/api/roles", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name,
            displayName: formData.displayName,
            description: formData.description,
            level: formData.level,
            permissions: formData.permissions,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save role");
        setSaving(false);
        return;
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setError("Failed to save role");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/roles/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete role");
        setDeleting(false);
        return;
      }
      setDeleteTarget(null);
      fetchRoles();
    } catch (err) {
      setError("Failed to delete role");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Seed roles
  const [seeding, setSeeding] = useState(false);
  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch("/api/roles/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchRoles();
      } else {
        setError(data.error || "Failed to seed roles");
      }
    } catch (err) {
      setError("Failed to seed roles");
    } finally {
      setSeeding(false);
    }
  };

  // Permission toggle
  const togglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleGroup = (category) => {
    const groupPerms = permissionCatalog[category]?.map((p) => p.key) || [];
    const allSelected = groupPerms.every((p) => formData.permissions.includes(p));
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !groupPerms.includes(p))
        : [...new Set([...prev.permissions, ...groupPerms])],
    }));
  };

  const selectAll = () => {
    setFormData((prev) => ({ ...prev, permissions: [...allPermKeys] }));
  };

  const selectNone = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  // Filter permissions by search
  const filteredCatalog = Object.entries(permissionCatalog).reduce((acc, [cat, perms]) => {
    if (!permSearch) {
      acc[cat] = perms;
    } else {
      const lower = permSearch.toLowerCase();
      const filtered = perms.filter(
        (p) => p.key.toLowerCase().includes(lower) || p.label.toLowerCase().includes(lower)
      );
      if (filtered.length > 0) acc[cat] = filtered;
    }
    return acc;
  }, {});

  // Quick KPI Statistics
  const stats = useMemo(() => {
    const totalRoles = roles.length;
    const systemRoles = roles.filter((r) => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    const totalAssignedUsers = roles.reduce((acc, r) => acc + (r.userCount || 0), 0);
    return { totalRoles, systemRoles, customRoles, totalAssignedUsers };
  }, [roles]);

  // Filtered roles based on search and level
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        role.name?.toLowerCase().includes(q) ||
        role.displayName?.toLowerCase().includes(q) ||
        role.description?.toLowerCase().includes(q) ||
        role.permissions?.some((p) => p.toLowerCase().includes(q));

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "100" && role.level >= 100) ||
        (levelFilter === "80" && role.level >= 80 && role.level < 100) ||
        (levelFilter === "60" && role.level >= 60 && role.level < 80) ||
        (levelFilter === "40" && role.level >= 40 && role.level < 60) ||
        (levelFilter === "20" && role.level >= 20 && role.level < 40) ||
        (levelFilter === "basic" && role.level < 20);

      return matchesSearch && matchesLevel;
    });
  }, [roles, searchQuery, levelFilter]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage) || 1;
  const paginatedRoles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRoles.slice(start, start + itemsPerPage);
  }, [filteredRoles, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleLevelChange = (e) => {
    setLevelFilter(e.target.value);
    setCurrentPage(1);
  };

  // Role level labels
  const getLevelLabel = (level) => {
    if (level >= 100) return "System Admin";
    if (level >= 80) return "Senior Management";
    if (level >= 60) return "Staff";
    if (level >= 40) return "Specialist";
    if (level >= 20) return "Standard";
    return "Basic";
  };

  const getLevelColor = (level) => {
    if (level >= 100) return "bg-red-50 text-red-700 border-red-200/80";
    if (level >= 80) return "bg-purple-50 text-purple-700 border-purple-200/80";
    if (level >= 60) return "bg-blue-50 text-blue-700 border-blue-200/80";
    if (level >= 40) return "bg-teal-50 text-teal-700 border-teal-200/80";
    if (level >= 20) return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto mb-3" />
          <span className="text-sm font-medium text-slate-600">Loading role definitions & permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
              <Shield className="w-6 h-6" />
            </div>
            Role Management & Access Control
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure permission matrices, hierarchical authority levels, and role definitions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canManageRoles && roles.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-sm font-semibold disabled:opacity-50 shadow-xs"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Seed Default Roles
            </button>
          )}
          {canManageRoles && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all text-sm font-semibold shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Custom Role
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Roles</span>
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalRoles}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Configured in system</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">System Protected</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.systemRoles}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Core built-in roles</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Custom Roles</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.customRoles}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">User-defined roles</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Privileges Catalog</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{allPermKeys.length}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Granular permission keys</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm font-medium">{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and View Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by role title, key, or permission..."
              className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50/50 focus:bg-white placeholder:text-slate-400 text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={levelFilter}
              onChange={handleLevelChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
            >
              <option value="all">All Levels (0 - 100)</option>
              <option value="100">Level 100 — Admin</option>
              <option value="80">Level 80-99 — Senior Mgmt</option>
              <option value="60">Level 60-79 — Staff</option>
              <option value="40">Level 40-59 — Specialist</option>
              <option value="20">Level 20-39 — Standard</option>
              <option value="basic">Level &lt; 20 — Basic</option>
            </select>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start md:self-auto">
          <button
            onClick={() => setActiveView("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "cards"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setActiveView("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "table"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table List
          </button>
          <button
            onClick={() => setActiveView("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === "matrix"
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Matrix Grid
          </button>
        </div>
      </div>

      {/* VIEW: CARDS */}
      {activeView === "cards" && (
        <div className="space-y-6">
          {filteredRoles.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {searchQuery || levelFilter !== "all" ? "No Matching Roles Found" : "No Roles Configured"}
              </h3>
              <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                {searchQuery || levelFilter !== "all"
                  ? "Try adjusting your search criteria or clearing active filters to see all available roles."
                  : "Click 'Seed Default Roles' to create the standard roles, or create a custom role."}
              </p>
              {searchQuery || levelFilter !== "all" ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setLevelFilter("all");
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                >
                  Clear Filters
                </button>
              ) : canManageRoles ? (
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {seeding ? "Seeding..." : "Seed Default Roles"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedRoles.map((role) => {
                const perms = role.permissions || [];
                const isWildcard = perms.includes("*");
                const previewPerms = isWildcard ? ["*"] : perms.slice(0, 3);
                const remainingPerms = isWildcard ? 0 : Math.max(0, perms.length - 3);

                return (
                  <div
                    key={role._id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Role Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 truncate text-base" title={role.displayName}>
                              {role.displayName}
                            </h3>
                            {role.isSystem ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/70 rounded-md text-[11px] font-semibold">
                                <Lock className="w-3 h-3 text-amber-600" />
                                System
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-semibold">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{role.name}</p>
                        </div>

                        {/* Action buttons */}
                        {canManageRoles && (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(role)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Role"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openClone(role)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Clone Role"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {!role.isSystem && (
                              <button
                                onClick={() => setDeleteTarget(role)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Role"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 mb-3.5 line-clamp-2 min-h-[32px]">
                        {role.description || "No specific description provided for this role."}
                      </p>

                      {/* Level Badge */}
                      <div className="mb-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelColor(role.level)}`}
                        >
                          Level {role.level} — {getLevelLabel(role.level)}
                        </span>
                      </div>

                      {/* Permissions Preview Tags */}
                      <div className="mb-4">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Privilege Scope
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {isWildcard ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/80 rounded-md text-[11px] font-bold">
                              Full Administrative Access (*)
                            </span>
                          ) : previewPerms.length > 0 ? (
                            previewPerms.map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/70 rounded-md text-[11px] font-mono"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No permissions assigned</span>
                          )}
                          {remainingPerms > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200/70 rounded-md text-[11px] font-semibold">
                              +{remainingPerms} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        {isWildcard ? "All Permissions" : `${perms.length} privileges`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <strong className="text-slate-800">{role.userCount || 0}</strong> users
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRoles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 9, 15, 30]}
            showTotal={true}
            className="rounded-2xl border border-slate-200"
          />
        </div>
      )}

      {/* VIEW: TABLE */}
      {activeView === "table" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Role & Identifier</th>
                    <th className="p-4">Authority Level</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Assigned Users</th>
                    <th className="p-4">Permission Scope</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No roles match the selected filter or search term.
                      </td>
                    </tr>
                  ) : (
                    paginatedRoles.map((role) => (
                      <tr key={role._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{role.displayName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{role.name}</div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getLevelColor(role.level)}`}
                          >
                            Lvl {role.level} — {getLevelLabel(role.level)}
                          </span>
                        </td>
                        <td className="p-4">
                          {role.isSystem ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-semibold">
                              <Lock className="w-3 h-3" /> System
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-semibold">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-400" />
                            {role.userCount || 0}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                            {role.permissions?.includes("*") ? "All Permissions (*)" : `${role.permissions?.length || 0} permissions`}
                          </span>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          {canManageRoles && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(role)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Role"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openClone(role)}
                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                title="Clone Role"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {!role.isSystem && (
                                <button
                                  onClick={() => setDeleteTarget(role)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Role"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRoles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 9, 15, 30]}
            showTotal={true}
            className="rounded-2xl border border-slate-200"
          />
        </div>
      )}

      {/* VIEW: MATRIX */}
      {activeView === "matrix" && (
        <PermissionMatrix onEditRole={canManageRoles ? (role) => openEdit(role) : null} />
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {dialogMode === "edit" ? "Edit Role" : dialogMode === "clone" ? "Clone Role" : "Create Role"}
              </h3>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Role Name (Key)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      }))
                    }
                    disabled={dialogMode === "edit"}
                    placeholder="e.g. HR_MANAGER"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Uppercase letters, numbers, underscores</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder="e.g. HR Manager"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of this role's responsibilities..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role Level: {formData.level} — {getLevelLabel(formData.level)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.level}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, level: parseInt(e.target.value) }))
                  }
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Basic (1)</span>
                  <span>Admin (100)</span>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Permissions ({formData.permissions.length} / {allPermKeys.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={selectNone}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    placeholder="Search permissions..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Permission Groups */}
                <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                  {Object.entries(filteredCatalog).map(([category, perms]) => {
                    const isExpanded = expandedGroups[category] ?? false;
                    const selectedCount = perms.filter((p) =>
                      formData.permissions.includes(p.key)
                    ).length;
                    const allSelected = selectedCount === perms.length;

                    return (
                      <div key={category} className="border-b border-slate-100 last:border-b-0">
                        <button
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [category]: !prev[category],
                            }))
                          }
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-700">
                              {category}
                            </span>
                            <span className="text-xs text-slate-400">
                              {selectedCount}/{perms.length}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(category);
                            }}
                            className={`text-xs px-2 py-0.5 rounded ${
                              allSelected
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-1">
                            {perms.map((perm) => {
                              const isSelected = formData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-blue-50 border border-blue-200"
                                      : "hover:bg-slate-50 border border-transparent"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => togglePermission(perm.key)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-slate-700">{perm.label}</span>
                                    <span className="block text-xs text-slate-400 font-mono">
                                      {perm.key}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : dialogMode === "edit" ? "Update Role" : "Create Role"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Role</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete the role{" "}
              <strong>{deleteTarget.displayName}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
