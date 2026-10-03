"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Check,
  X,
  Search,
  Download,
  Filter,
  Loader2,
  ChevronDown,
  ChevronRight,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function PermissionMatrix({ onEditRole = null }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    async function loadMatrixData() {
      try {
        setLoading(true);
        const [rolesRes, permsRes] = await Promise.all([
          fetch("/api/roles"),
          fetch("/api/roles/permissions"),
        ]);
        const rolesData = await rolesRes.json();
        const permsData = await permsRes.json();
        setRoles(rolesData.roles || []);
        setCatalog(permsData.catalog || {});
      } catch (err) {
        console.error("Failed to load permission matrix data:", err);
        setError("Failed to load permission matrix data");
      } finally {
        setLoading(false);
      }
    }
    loadMatrixData();
  }, []);

  const categories = useMemo(() => Object.keys(catalog), [catalog]);

  const toggleCategoryCollapse = (cat) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const expandAll = () => setCollapsedCategories({});
  const collapseAll = () => {
    const all = {};
    categories.forEach((c) => (all[c] = true));
    setCollapsedCategories(all);
  };

  // Filter permissions
  const filteredCatalog = useMemo(() => {
    const result = {};
    for (const [category, perms] of Object.entries(catalog)) {
      if (selectedCategory !== "all" && selectedCategory !== category) {
        continue;
      }
      const matching = perms.filter((p) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          p.label.toLowerCase().includes(term) ||
          p.key.toLowerCase().includes(term) ||
          category.toLowerCase().includes(term)
        );
      });
      if (matching.length > 0) {
        result[category] = matching;
      }
    }
    return result;
  }, [catalog, selectedCategory, searchTerm]);

  // Check if a role has a permission
  const roleHasPermission = (role, permKey) => {
    if (role.name === "ADMIN" || role.permissions?.includes("*")) return true;
    if (role.permissions?.includes(permKey)) return true;
    const parts = permKey.split(".");
    if (parts.length > 2) {
      const broader = parts.slice(0, 2).join(".");
      if (role.permissions?.includes(broader)) return true;
    }
    return false;
  };

  // Export matrix to CSV
  const exportToCSV = () => {
    const headers = ["Category", "Permission Name", "Permission Key", ...roles.map((r) => r.displayName || r.name)];
    const rows = [headers.join(",")];

    for (const [category, perms] of Object.entries(catalog)) {
      for (const perm of perms) {
        const row = [
          `"${category}"`,
          `"${perm.label}"`,
          `"${perm.key}"`,
          ...roles.map((r) => (roleHasPermission(r, perm.key) ? '"YES"' : '"NO"')),
        ];
        rows.push(row.join(","));
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `role_permission_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-slate-600 font-medium">Loading Permission Matrix...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls & Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 w-full md:w-auto gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search permissions or keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="relative min-w-[180px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={expandAll}
            className="text-xs text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded border border-slate-200 hover:border-blue-200 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded border border-slate-200 hover:border-blue-200 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition-colors ml-2"
            title="Export matrix as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[750px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-900 p-4 text-xs font-semibold uppercase tracking-wider min-w-[280px] border-r border-slate-800">
                  Permission / Resource
                </th>
                {roles.map((role) => (
                  <th
                    key={role._id || role.name}
                    className="p-3 text-center min-w-[130px] border-r border-slate-800"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-sm truncate max-w-[140px]" title={role.displayName}>
                        {role.displayName || role.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            role.level >= 100
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : role.level >= 80
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : role.level >= 50
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          Lvl {role.level}
                        </span>
                        {role.isSystem && (
                          <span
                            title="System Role"
                            className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded flex items-center gap-0.5"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      {onEditRole && (
                        <button
                          onClick={() => onEditRole(role)}
                          className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 underline"
                        >
                          Edit Role
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {Object.keys(filteredCatalog).length === 0 ? (
                <tr>
                  <td colSpan={roles.length + 1} className="p-8 text-center text-slate-500">
                    No permissions match your filter.
                  </td>
                </tr>
              ) : (
                Object.entries(filteredCatalog).map(([category, perms]) => {
                  const isCollapsed = !!collapsedCategories[category];
                  return (
                    <React.Fragment key={category}>
                      {/* Category Header Row */}
                      <tr className="bg-slate-100/80 sticky top-[68px] z-10 font-medium">
                        <td
                          className="sticky left-0 z-10 bg-slate-100/95 p-3 font-semibold text-slate-800 flex items-center justify-between cursor-pointer select-none border-r border-slate-200"
                          onClick={() => toggleCategoryCollapse(category)}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                            <span>{category}</span>
                            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-normal">
                              {perms.length}
                            </span>
                          </div>
                        </td>
                        {roles.map((r) => {
                          const count = perms.filter((p) => roleHasPermission(r, p.key)).length;
                          return (
                            <td
                              key={r._id || r.name}
                              className="p-2 text-center text-xs font-semibold text-slate-500 bg-slate-100/80 border-r border-slate-200"
                            >
                              {r.name === "ADMIN" || r.permissions?.includes("*")
                                ? "All"
                                : `${count}/${perms.length}`}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Permissions Rows */}
                      {!isCollapsed &&
                        perms.map((perm) => (
                          <tr key={perm.key} className="hover:bg-blue-50/40 transition-colors">
                            <td className="sticky left-0 bg-white hover:bg-blue-50/40 z-1 p-3 border-r border-slate-200 min-w-[280px]">
                              <div className="font-medium text-slate-800 text-xs sm:text-sm">
                                {perm.label}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {perm.key}
                              </div>
                            </td>
                            {roles.map((role) => {
                              const has = roleHasPermission(role, perm.key);
                              const isWildcard = role.name === "ADMIN" || role.permissions?.includes("*");
                              return (
                                <td
                                  key={role._id || role.name}
                                  className={`p-3 text-center border-r border-slate-100 ${
                                    has ? "bg-emerald-50/30" : "bg-transparent"
                                  }`}
                                >
                                  {isWildcard ? (
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700"
                                      title="Admin Wildcard Access (*)"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </span>
                                  ) : has ? (
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 shadow-xs"
                                      title="Granted"
                                    >
                                      <Check className="w-4 h-4" strokeWidth={2.5} />
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-300"
                                      title="Not Granted"
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
