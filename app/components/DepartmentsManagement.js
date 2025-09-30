"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Users,
  Building2,
  Edit2,
  Trash,
  Eye,
} from "lucide-react";

export default function DepartmentsManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [viewDept, setViewDept] = useState(null);
  const [editDept, setEditDept] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);

  // Safely extract a string id from MongoDB ObjectId or plain string
  const getDeptId = (dept) => {
    const id = dept?._id;
    if (!id) return "";
    if (typeof id === "string") return id;
    if (typeof id === "object")
      return id.$oid || id.oid || id.toHexString?.() || id.toString?.() || "";
    return String(id);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/departments?includeEmployees=true");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
    } catch (e) {
      setError(e?.message || "Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e?.preventDefault();
    if (!form.name.trim()) return;
    try {
      setCreating(true);
      setError("");
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Create failed");
      setForm({ name: "", description: "" });
      setIsAddOpen(false);
      await fetchDepartments();
    } catch (e) {
      setError(e?.message || "Failed to create department");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(dept) {
    setEditDept(dept);
    setForm({ name: dept.name || "", description: dept.description || "" });
  }

  function confirmDelete(dept) {
    setDeleteDept(dept);
  }

  async function handleUpdate(e) {
    e?.preventDefault();
    if (!editDept) return;
    try {
      setError("");
      setCreating(true);
      const res = await fetch(`/api/departments/${getDeptId(editDept)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Update failed");
      // Optimistically update UI and close modal immediately
      const updated = data.department || {
        ...editDept,
        name: form.name.trim(),
        description: form.description.trim(),
      };
      const editId = getDeptId(editDept);
      setDepartments((prev) =>
        prev.map((d) => (getDeptId(d) === editId ? { ...d, ...updated } : d))
      );
      setEditDept(null);
      setForm({ name: "", description: "" });
      // Background refresh to sync counts and any server-calculated fields
      fetchDepartments();
    } catch (e) {
      setError(e?.message || "Failed to update department");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteDept) return;
    try {
      const res = await fetch(`/api/departments/${getDeptId(deleteDept)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Delete failed");
      setDeleteDept(null);
      await fetchDepartments();
    } catch (e) {
      setError(e?.message || "Failed to delete department");
    }
  }

  const filtered = departments.filter((d) =>
    [d.name || "", d.description || ""].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
          <p className="text-gray-700">Create and manage company departments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Department
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or description..."
          className="flex-1 outline-none text-gray-900 placeholder-gray-500"
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-700">
            Loading departments...
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-700">
            No departments found
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((dept) => (
                <tr key={dept._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-gray-900 font-medium">
                      <Building2 className="w-4 h-4 text-blue-600" />{" "}
                      {dept.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-800">
                    {dept.description || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-800 flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />{" "}
                    {dept.employees?.length ?? dept.employeeCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewDept(dept)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(dept)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(dept)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Department Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                New Department
              </h3>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  placeholder="e.g., Human Resources"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewDept && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewDept(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                Department Details
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="text-gray-900 font-semibold">{viewDept.name}</div>
              <div className="text-gray-800">{viewDept.description || "—"}</div>
              <div className="text-gray-800 flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-400" />{" "}
                {viewDept.employees?.length ?? viewDept.employeeCount ?? 0}{" "}
                employees
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setViewDept(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal reuses add form */}
      {editDept && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditDept(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                Edit Department
              </h3>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleUpdate}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDept(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteDept && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDeleteDept(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b text-gray-900 font-semibold">
              Delete Department
            </div>
            <div className="p-6 text-gray-800">
              Are you sure you want to delete{" "}
              <span className="font-bold">{deleteDept.name}</span>? This cannot
              be undone.
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setDeleteDept(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
