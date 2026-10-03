"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Shield,
  Search,
  ChevronDown,
  Check,
  X,
  UserCog,
  History,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Filter,
  Building,
  CheckCircle2,
  Sparkles,
  Layers,
  Lock,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import usePermissions from "../hooks/usePermissions";

export default function UserRoleAssignment() {
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission("role.manage");

  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [roleHistory, setRoleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // Pagination for Employee list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination for History tab
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);

  // Tabs
  const [activeTab, setActiveTab] = useState("assignments"); // assignments | history

  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Bulk assignment
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRole, setBulkRole] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, rolesRes, urRes] = await Promise.all([
        fetch("/api/employees?limit=500"),
        fetch("/api/roles"),
        fetch("/api/user-roles"),
      ]);

      const empData = await empRes.json();
      const rolesData = await rolesRes.json();
      const urData = await urRes.json();

      const empList = empData.employees || empData.data || [];
      setEmployees(empList);
      setRoles(rolesData.roles || []);
      setUserRoles(urData.userRoles || []);
    } catch (err) {
      setError("Failed to load staff and role assignments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/user-roles/history?limit=100");
      const data = await res.json();
      setRoleHistory(data.history || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Build employee -> role map
  const roleMap = useMemo(() => {
    const map = {};
    for (const ur of userRoles) {
      map[ur.userId] = ur;
    }
    return map;
  }, [userRoles]);

  // Merge employees with their assigned roles
  const enrichedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const empId = emp._id?.toString?.() || emp._id;
      const ur = roleMap[empId];
      return {
        id: empId,
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.personalDetails?.department || emp.department || "",
        employeeId: emp.personalDetails?.employeeId || emp.employeeId || "",
        role: ur?.roleName || ur?.role || "EMPLOYEE",
        roleAssignment: ur,
      };
    });
  }, [employees, roleMap]);

  // Extract distinct departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    enrichedEmployees.forEach((emp) => {
      if (emp.department && emp.department !== "—") set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [enrichedEmployees]);

  // KPI Statistics
  const stats = useMemo(() => {
    const totalStaff = enrichedEmployees.length;
    const explicitAssignments = userRoles.length;
    const adminRoles = enrichedEmployees.filter((e) =>
      ["ADMIN", "HR_MANAGER", "MANAGER", "PROJECT_MANAGER", "FINANCE"].includes(e.role)
    ).length;
    const standardEmployees = enrichedEmployees.filter((e) => e.role === "EMPLOYEE").length;
    return { totalStaff, explicitAssignments, adminRoles, standardEmployees };
  }, [enrichedEmployees, userRoles]);

  // Filtered employees
  const filtered = useMemo(() => {
    return enrichedEmployees.filter((emp) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q);

      const matchesRole = !filterRole || emp.role === filterRole;
      const matchesDept = !filterDepartment || emp.department === filterDepartment;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [enrichedEmployees, searchTerm, filterRole, filterDepartment]);

  // Paginated employees for assignments tab
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Paginated history entries
  const totalHistoryPages = Math.ceil(roleHistory.length / historyPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPerPage;
    return roleHistory.slice(start, start + historyPerPage);
  }, [roleHistory, historyPage, historyPerPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (e) => {
    setFilterRole(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentFilterChange = (e) => {
    setFilterDepartment(e.target.value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterRole("");
    setFilterDepartment("");
    setCurrentPage(1);
  };

  // Assign role to individual employee
  const handleAssign = async () => {
    if (!selectedEmployee || !selectedRole) return;
    try {
      setAssigning(true);
      setError("");
      const res = await fetch("/api/user-roles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          userId: selectedEmployee.id,
          roleName: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to assign role");
        return;
      }
      setAssignDialogOpen(false);
      setSelectedEmployee(null);
      setSelectedRole("");
      fetchData();
    } catch (err) {
      setError("Failed to assign role");
    } finally {
      setAssigning(false);
    }
  };

  // Bulk assign role to selected employees
  const handleBulkAssign = async () => {
    if (selectedIds.length === 0 || !bulkRole) return;
    try {
      setBulkAssigning(true);
      setError("");
      const res = await fetch("/api/user-roles/bulk", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          userIds: selectedIds,
          roleName: bulkRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bulk assignment failed");
        return;
      }
      setBulkMode(false);
      setSelectedIds([]);
      setBulkRole("");
      fetchData();
    } catch (err) {
      setError("Bulk assignment failed");
    } finally {
      setBulkAssigning(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((e) => e.id));
    }
  };

  const selectCurrentPageOnly = () => {
    const pageIds = paginatedEmployees.map((e) => e.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  // Role badge styling
  const getRoleBadgeColor = (role) => {
    const colors = {
      ADMIN: "bg-red-50 text-red-700 border-red-200/90",
      HR_MANAGER: "bg-purple-50 text-purple-700 border-purple-200/90",
      HR_STAFF: "bg-blue-50 text-blue-700 border-blue-200/90",
      MANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200/90",
      PROJECT_MANAGER: "bg-teal-50 text-teal-700 border-teal-200/90",
      FINANCE: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
      EMPLOYEE: "bg-slate-50 text-slate-700 border-slate-200/90",
    };
    return colors[role] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getRoleDisplayName = (roleName) => {
    const roleDef = roles.find((r) => r.name === roleName);
    return roleDef?.displayName || roleName;
  };

  // Avatar initials helper
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600 mx-auto mb-3" />
          <span className="text-sm font-medium text-slate-600">Loading employees & role mappings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
              <UserCog className="w-6 h-6" />
            </div>
            User Role Assignments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Map security profiles and authority roles to staff members across the organization
          </p>
        </div>

        {canManageRoles && (
          <button
            onClick={() => {
              setBulkMode(!bulkMode);
              if (bulkMode) setSelectedIds([]);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-xs ${
              bulkMode
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            {bulkMode ? "Exit Bulk Assignment" : "Bulk Assign Roles"}
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalStaff}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Staff directory</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Role Overrides</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.explicitAssignments}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Explicit role records</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Managers & Admins</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.adminRoles}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Elevated management</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Standard Portal</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.standardEmployees}</div>
          <span className="text-xs text-slate-500 mt-0.5 block">Default EMPLOYEE role</span>
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

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("assignments")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "assignments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            Personnel Directory ({enrichedEmployees.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            Audit & Change History ({roleHistory.length})
          </button>
        </div>
      </div>

      {/* TAB 1: ASSIGNMENTS */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by name, email, employee ID, or department..."
                  className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50/50 focus:bg-white placeholder:text-slate-400 text-slate-800"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <div className="relative min-w-[170px]">
                <select
                  value={filterRole}
                  onChange={handleRoleFilterChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                >
                  <option value="">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="relative min-w-[170px]">
                <select
                  value={filterDepartment}
                  onChange={handleDepartmentFilterChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(searchTerm || filterRole || filterDepartment) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start md:self-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Bulk Action Sticky Bar */}
          {bulkMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedIds.length}
                </div>
                <div>
                  <span className="text-sm font-bold text-blue-900">
                    {selectedIds.length} employee{selectedIds.length === 1 ? "" : "s"} selected
                  </span>
                  <div className="flex items-center gap-2 text-xs text-blue-700 mt-0.5">
                    <button
                      onClick={selectCurrentPageOnly}
                      className="underline hover:text-blue-900"
                    >
                      Toggle Current Page ({paginatedEmployees.length})
                    </button>
                    <span>•</span>
                    <button
                      onClick={toggleSelectAll}
                      className="underline hover:text-blue-900"
                    >
                      {selectedIds.length === filtered.length ? "Deselect All" : `Select All Filtered (${filtered.length})`}
                    </button>
                  </div>
                </div>
              </div>

              {canManageRoles && (
                <div className="flex items-center gap-2.5">
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-xl text-sm bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select target role...</option>
                    {roles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.displayName} (Lvl {r.level})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkRole || selectedIds.length === 0 || bulkAssigning}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
                  >
                    {bulkAssigning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Apply Role
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Employee Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    {bulkMode && (
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="p-4">Personnel</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Active Role</th>
                    <th className="p-4">Assigned On</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={bulkMode ? 6 : 5}
                        className="p-12 text-center text-slate-500"
                      >
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No personnel match your search</p>
                        <p className="text-xs text-slate-400 mt-1">Try resetting the department or role filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const isSelected = selectedIds.includes(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                        >
                          {bulkMode && (
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(emp.id)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                                {getInitials(emp.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{emp.name}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {emp.email || emp.employeeId}
                                  {emp.employeeId && emp.email && (
                                    <span className="text-slate-400 ml-1">({emp.employeeId})</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                              <Building className="w-3 h-3 text-slate-400" />
                              {emp.department || "General"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(
                                emp.role
                              )}`}
                            >
                              <Shield className="w-3 h-3 opacity-70" />
                              {getRoleDisplayName(emp.role)}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {emp.roleAssignment?.assignedAt
                              ? new Date(emp.roleAssignment.assignedAt).toLocaleDateString()
                              : "Default Role"}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            {canManageRoles ? (
                              <button
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setSelectedRole(emp.role);
                                  setAssignDialogOpen(true);
                                }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                              >
                                Change Role
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">View only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(sz) => {
              setItemsPerPage(sz);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            showTotal={true}
            className="rounded-2xl border border-slate-200"
          />
        </div>
      )}

      {/* TAB 2: CHANGE HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {roleHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No role assignment history logged yet.</p>
                <p className="text-xs text-slate-400 mt-1">Changes made to employee roles will be recorded here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paginatedHistory.map((entry, idx) => (
                  <div key={idx} className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 flex-shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900 font-bold truncate">
                          {entry.userName || "Staff Member"}
                          <span className="font-normal text-slate-500 ml-1.5 text-xs">
                            {entry.action === "ROLE_REVOKED" ? "role was revoked" : "role was updated"}
                          </span>
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getRoleBadgeColor(
                              entry.previousRole || "EMPLOYEE"
                            )}`}
                          >
                            {getRoleDisplayName(entry.previousRole || "EMPLOYEE")}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getRoleBadgeColor(
                              entry.newRole
                            )}`}
                          >
                            {getRoleDisplayName(entry.newRole)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Executed by: <strong className="text-slate-600">{entry.assignedByName || entry.revokedByName || "System Admin"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 text-xs text-slate-500">
                      <div className="flex items-center gap-1 justify-end font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Pagination */}
          {roleHistory.length > 0 && (
            <Pagination
              currentPage={historyPage}
              totalPages={totalHistoryPages}
              totalItems={roleHistory.length}
              itemsPerPage={historyPerPage}
              onPageChange={setHistoryPage}
              onItemsPerPageChange={(sz) => {
                setHistoryPerPage(sz);
                setHistoryPage(1);
              }}
              pageSizeOptions={[10, 20, 50]}
              showTotal={true}
              className="rounded-2xl border border-slate-200"
            />
          )}
        </div>
      )}

      {/* Assign Role Dialog */}
      {assignDialogOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Change Staff Role</h3>
                  <p className="text-xs text-slate-500">Update system privileges and access level</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedEmployee(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Employee Summary Card */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {getInitials(selectedEmployee.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{selectedEmployee.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{selectedEmployee.email || selectedEmployee.employeeId}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Current</span>
                  <span className="text-xs font-bold text-slate-700">{getRoleDisplayName(selectedEmployee.role)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select New Role
                </label>
                <div className="space-y-2">
                  {roles.map((r) => {
                    const isSelected = selectedRole === r.name;
                    return (
                      <label
                        key={r.name}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r.name}
                          checked={isSelected}
                          onChange={() => setSelectedRole(r.name)}
                          className="w-4 h-4 text-blue-600 mt-0.5 border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900">{r.displayName}</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(r.name)}`}>
                              Level {r.level}
                            </span>
                          </div>
                          {r.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                            Key: {r.name}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || selectedRole === selectedEmployee.role}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {assigning ? "Updating..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
