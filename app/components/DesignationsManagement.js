"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function DesignationsManagement() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [newDesignation, setNewDesignation] = useState("");
  const [rename, setRename] = useState({ oldName: "", newName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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
      // refresh lists
      const [allRes, deptRes] = await Promise.all([
        fetch("/api/designations"),
        fetch(`/api/departments/${selectedDeptId}/designations`),
      ]);
      if (allRes.ok) {
        const j = await allRes.json();
        setDesignations(Array.isArray(j?.designations) ? j.designations : []);
      }
      if (deptRes.ok) {
        const j = await deptRes.json();
        setDeptDesignations(
          Array.isArray(j?.designations) ? j.designations : []
        );
      }
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
      const deptRes = await fetch(
        `/api/departments/${selectedDeptId}/designations`
      );
      if (deptRes.ok) {
        const j = await deptRes.json();
        setDeptDesignations(
          Array.isArray(j?.designations) ? j.designations : []
        );
      }
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
      const deptRes = await fetch(
        `/api/departments/${selectedDeptId}/designations`
      );
      if (deptRes.ok) {
        const j = await deptRes.json();
        setDeptDesignations(
          Array.isArray(j?.designations) ? j.designations : []
        );
      }
    } catch (e) {
      setError(e.message || "Failed to remove designation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Designations</h2>
        <div className="text-sm text-gray-600">{designations.length} total</div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search designations..."
          className="w-full max-w-md p-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            Manage by Department
          </h3>
          <div className="flex flex-col gap-3">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="p-2 border border-gray-300 rounded bg-white text-gray-900"
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="text"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                placeholder="New designation name"
                className="flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
              />
              <button
                onClick={addDesignation}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Add
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={rename.oldName}
                onChange={(e) =>
                  setRename({ ...rename, oldName: e.target.value })
                }
                className="flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900"
              >
                <option value="">Select existing</option>
                {deptDesignations.map((n) => (
                  <option key={`old-${n}`} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={rename.newName}
                onChange={(e) =>
                  setRename({ ...rename, newName: e.target.value })
                }
                placeholder="New name"
                className="flex-1 p-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
              />
              <button
                onClick={updateDesignation}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Rename
              </button>
            </div>

            <div className="mt-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Designations in {selectedDept?.name || "Department"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {deptDesignations.map((n) => (
                  <span
                    key={`chip-${n}`}
                    className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs"
                  >
                    {n}
                    <button
                      onClick={() => removeDesignation(n)}
                      className="ml-2 text-red-600 hover:text-red-800"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {deptDesignations.length === 0 && (
                  <span className="text-sm text-gray-500">
                    No designations yet.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">All Designations</h3>
          {loading && <p className="text-gray-700">Loading...</p>}
          {error && <p className="text-red-600">{error}</p>}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((des) => (
                <div
                  key={`des-${des}`}
                  className="flex items-center justify-between border rounded-lg p-3 bg-gray-50"
                >
                  <span className="text-gray-900 font-medium">{des}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(des))}
                    className="text-sm px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    title="Copy designation"
                  >
                    Copy
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-gray-600 p-4">No designations found.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6">
        Designations are derived from employee profiles. To add a new
        designation, create or update an employee and set their designation.
      </p>
    </div>
  );
}
