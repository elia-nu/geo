"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Users,
  Building2,
  Edit2,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  LayoutGrid,
  List,
  Mail,
  User,
} from "lucide-react";
import { toast } from "./ui/toast";

export default function DepartmentsManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [viewDept, setViewDept] = useState(null);
  const [editDept, setEditDept] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Safely extract string ID
  const getDeptId = (dept) => {
    if (!dept || !dept._id) return "";
    const id = dept._id;
    if (typeof id === "string") return id;
    if (typeof id === "object") {
      if (id.$oid) return id.$oid;
      if (id.oid) return id.oid;
      if (typeof id.toHexString === "function") return id.toHexString();
      if (typeof id.toString === "function") return id.toString();
      return String(id);
    }
    return String(id);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      setLoading(true);
      const res = await fetch("/api/departments?includeEmployees=true");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch departments");
      }
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e?.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Please enter a department name");
      return;
    }
    try {
      setCreating(true);
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create department");
      }
      toast.success(`Department "${form.name.trim()}" created successfully!`);
      setForm({ name: "", description: "" });
      setIsAddOpen(false);
      await fetchDepartments();
    } catch (e) {
      toast.error(e?.message || "Failed to create department");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(dept) {
    setEditDept(dept);
    setForm({ name: dept.name || "", description: dept.description || "" });
  }

  async function handleUpdate(e) {
    e?.preventDefault();
    if (!editDept) return;
    if (!form.name.trim()) {
      toast.warning("Department name cannot be empty");
      return;
    }
    try {
      setCreating(true);
      const deptId = getDeptId(editDept);
      const res = await fetch(`/api/departments/${deptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update department");
      }

      toast.success(`Department updated to "${form.name.trim()}"!`);
      const updated = data.department || {
        ...editDept,
        name: form.name.trim(),
        description: form.description.trim(),
      };
      setDepartments((prev) =>
        prev.map((d) => (getDeptId(d) === deptId ? { ...d, ...updated } : d))
      );
      setEditDept(null);
      setForm({ name: "", description: "" });
      fetchDepartments();
    } catch (e) {
      toast.error(e?.message || "Failed to update department");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteDept) return;
    try {
      setDeleting(true);
      const deptId = getDeptId(deleteDept);
      const res = await fetch(`/api/departments/${deptId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete department");
      }
      toast.success(`Department "${deleteDept.name}" deleted!`);
      setDeleteDept(null);
      await fetchDepartments();
    } catch (e) {
      toast.error(e?.message || "Failed to delete department");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    return departments.filter((d) =>
      [d.name || "", d.description || ""].some((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [departments, search]);

  const totalEmployees = useMemo(() => {
    return departments.reduce(
      (sum, d) => sum + (d.employees?.length ?? d.employeeCount ?? 0),
      0
    );
  }, [departments]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-7 text-white shadow-lg bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-sm border border-blue-400/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Organization Structure</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Departments Management
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Organize company divisions, configure job units, and monitor employee allocations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDepartments()}
              disabled={loading}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 text-xs sm:text-sm font-medium inline-flex items-center gap-2 backdrop-blur transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setForm({ name: "", description: "" });
                setIsAddOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/25 border border-blue-400/30 inline-flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Department
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Departments
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {departments.length}
            </h3>
            <p className="text-xs text-blue-600 mt-0.5">Active organizational units</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Assigned Personnel
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalEmployees}
            </h3>
            <p className="text-xs text-emerald-600 mt-0.5">Across all departments</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Department Size
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
              {departments.length > 0
                ? (totalEmployees / departments.length).toFixed(1)
                : 0}
            </h3>
            <p className="text-xs text-indigo-600 mt-0.5">Employees per unit</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Layout Control Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments by name or keyword..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-blue-600 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm"
            >
              <div className="h-6 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            {search ? `No departments matching "${search}"` : "No departments registered"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? "Try clearing or adjusting your search query."
              : "Get started by creating your organization's first department."}
          </p>
          {!search && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((dept) => {
            const empCount = dept.employees?.length ?? dept.employeeCount ?? 0;
            return (
              <div
                key={dept._id}
                className="bg-white rounded-2xl border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80" />

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-blue-600 transition-colors">
                          {dept.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {empCount} {empCount === 1 ? "Employee" : "Employees"}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {empCount} staff
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {dept.description || "No description provided for this department."}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewDept(dept)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Members
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(dept)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteDept(dept)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Team Size
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((dept) => {
                  const empCount = dept.employees?.length ?? dept.employeeCount ?? 0;
                  return (
                    <tr key={dept._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 text-sm">
                            {dept.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-md truncate">
                        {dept.description || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          <Users className="w-3.5 h-3.5" />
                          {empCount} Members
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewDept(dept)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEdit(dept)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Department"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteDept(dept)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">New Department</h3>
                  <p className="text-xs text-slate-400">Add a new company division</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Human Resources, IT Support"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Brief description of department responsibilities..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDept && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Department</h3>
                  <p className="text-xs text-slate-400">Update department details</p>
                </div>
              </div>
              <button
                onClick={() => setEditDept(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditDept(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Update Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Department Details Modal */}
      {viewDept && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">
                    {viewDept.name}
                  </h3>
                  <p className="text-xs text-slate-400">Department Profile & Members</p>
                </div>
              </div>
              <button
                onClick={() => setViewDept(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {viewDept.description || "No description recorded."}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Employees ({viewDept.employees?.length || 0})
                  </h4>
                </div>

                {viewDept.employees && viewDept.employees.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    {viewDept.employees.map((emp, idx) => (
                      <div key={idx} className="p-3 flex items-center gap-3 hover:bg-slate-50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {emp.name || emp.personalDetails?.name || "Employee"}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {emp.designation || emp.role || "Staff"} • {emp.email || emp.personalDetails?.email || ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 text-center text-slate-400 border border-slate-100">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs font-medium">No employees currently assigned to this department.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewDept(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDept && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete Department?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove <strong className="text-slate-800">{deleteDept.name}</strong>?
                  {((deleteDept.employees?.length ?? deleteDept.employeeCount ?? 0) > 0) && (
                    <span className="block text-rose-600 font-semibold mt-1">
                      Warning: This department has {deleteDept.employees?.length ?? deleteDept.employeeCount} assigned employees.
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteDept(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
