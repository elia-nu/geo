"use client";
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

export default function DesignationsManagement() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [rename, setRename] = useState({ oldName: "", newName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copiedName, setCopiedName] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [desRes, deptRes] = await Promise.all([
          fetch("/api/designations"),
          fetch("/api/departments"),
        ]);
        if (!desRes.ok) throw new Error("Failed to load designations");
        if (!deptRes.ok) throw new Error("Failed to load departments");
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
        setSelectedDeptId(deptList[0]?._id || "");
      } catch (e) {
        setError(e.message || "Failed to fetch designations");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = designations.filter((d) =>
    String(d).toLowerCase().includes(query.toLowerCase())
  );

  const selectedDept = useMemo(
    () => departments.find((d) => String(d._id) === String(selectedDeptId)),
    [departments, selectedDeptId]
  );

  const [deptDesignations, setDeptDesignations] = useState([]);

  useEffect(() => {
    const loadDeptDes = async () => {
      if (!selectedDeptId) return;
      try {
        const res = await fetch(
          `/api/departments/${selectedDeptId}/designations`
        );
        if (res.ok) {
          const js = await res.json();
          const list = Array.isArray(js?.designations) ? js.designations : [];
          setDeptDesignations(list);
        }
      } catch {}
    };
    loadDeptDes();
  }, [selectedDeptId]);

  const refreshLists = async () => {
    const [allRes, deptRes] = await Promise.all([
      fetch("/api/designations"),
      selectedDeptId
        ? fetch(`/api/departments/${selectedDeptId}/designations`)
        : Promise.resolve(null),
    ]);
    if (allRes.ok) {
      const j = await allRes.json();
      setDesignations(Array.isArray(j?.designations) ? j.designations : []);
    }
    if (deptRes?.ok) {
      const j = await deptRes.json();
      setDeptDesignations(Array.isArray(j?.designations) ? j.designations : []);
    }
  };

  const addDesignation = async () => {
    const name = newDesignation.trim();
    if (!selectedDeptId || !name) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (!res.ok) throw new Error("Failed to add designation");
      setNewDesignation("");
      await refreshLists();
    } catch (e) {
      setError(e.message || "Failed to add designation");
    } finally {
      setLoading(false);
    }
  };

  const updateDesignation = async () => {
    const oldName = rename.oldName.trim();
    const newName = rename.newName.trim();
    if (!selectedDeptId || !oldName || !newName) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldName, newName }),
        }
      );
      if (!res.ok) throw new Error("Failed to update designation");
      setRename({ oldName: "", newName: "" });
      await refreshLists();
    } catch (e) {
      setError(e.message || "Failed to update designation");
    } finally {
      setLoading(false);
    }
  };

  const removeDesignation = async (name) => {
    if (!selectedDeptId || !name) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/departments/${selectedDeptId}/designations`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      if (!res.ok) throw new Error("Failed to remove designation");
      await refreshLists();
    } catch (e) {
      setError(e.message || "Failed to remove designation");
    } finally {
      setLoading(false);
    }
  };

  const copyDesignation = async (name) => {
    try {
      await navigator.clipboard.writeText(String(name));
      setCopiedName(String(name));
      setTimeout(() => setCopiedName(""), 1500);
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Designations
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Manage job titles by department and browse all designations in use
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {designations.length} total
          </span>
          <button
            onClick={refreshLists}
            disabled={loading}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg border hover:bg-gray-200 disabled:opacity-50 inline-flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Manage by department */}
        <div className="xl:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-black">Manage by Department</h3>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {departments.length === 0 && (
                  <option value="">No departments</option>
                )}
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add */}
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-black">
                  Add designation
                </h4>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDesignation();
                  }}
                  placeholder="e.g. Senior Engineer"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addDesignation}
                  disabled={!newDesignation.trim() || !selectedDeptId || loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg inline-flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Rename */}
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/60">
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-black">
                  Rename designation
                </h4>
              </div>
              <div className="space-y-2">
                <select
                  value={rename.oldName}
                  onChange={(e) =>
                    setRename({ ...rename, oldName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select existing</option>
                  {deptDesignations.map((n) => (
                    <option key={`old-${n}`} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rename.newName}
                    onChange={(e) =>
                      setRename({ ...rename, newName: e.target.value })
                    }
                    placeholder="New name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={updateDesignation}
                    disabled={
                      !rename.oldName || !rename.newName.trim() || loading
                    }
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg shrink-0"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            {/* Department list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-black">
                  In {selectedDept?.name || "department"}
                </h4>
                <span className="text-xs text-gray-500">
                  {deptDesignations.length} items
                </span>
              </div>
              {deptDesignations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                  No designations yet. Add one above.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                  {deptDesignations.map((n) => (
                    <li
                      key={`chip-${n}`}
                      className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-black truncate">
                        {n}
                      </span>
                      <button
                        onClick={() => removeDesignation(n)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* All designations */}
        <div className="xl:col-span-3 bg-white rounded-lg shadow overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-black">All Designations</h3>
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search designations..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-5 flex-1">
            {loading && designations.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                Loading designations...
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-gray-500 text-sm gap-1">
                <Briefcase className="w-8 h-8 text-gray-300 mb-1" />
                No designations found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((des) => (
                  <div
                    key={`des-${des}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-black truncate">
                      {des}
                    </span>
                    <button
                      onClick={() => copyDesignation(des)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg shrink-0"
                      title="Copy designation"
                    >
                      {copiedName === String(des) ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Department designations can be managed here. Titles also appear when
            set on employee profiles.
          </div>
        </div>
      </div>
    </div>
  );
}
