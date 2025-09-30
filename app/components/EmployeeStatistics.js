"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function EmployeeStatistics() {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [overviewRes, deptRes] = await Promise.all([
          fetch("/api/reports/analytics?type=overview"),
          fetch("/api/departments"),
        ]);
        if (!overviewRes.ok)
          throw new Error("Failed to fetch employee overview");
        if (!deptRes.ok) throw new Error("Failed to fetch departments");
        const [overview, deptPayload] = await Promise.all([
          overviewRes.json(),
          deptRes.json(),
        ]);
        setData(overview);
        const list = Array.isArray(deptPayload?.departments)
          ? deptPayload.departments
          : Array.isArray(deptPayload)
          ? deptPayload
          : [];
        setDepartments(list);
      } catch (e) {
        setError(e.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = useMemo(() => {
    const s = data?.summary || {};
    return [
      {
        label: "Total Employees",
        value: s.totalEmployees,
        color: "from-teal-600 to-cyan-600",
      },
      {
        label: "New This Month",
        value: s.newEmployeesThisMonth,
        color: "from-emerald-600 to-lime-600",
      },
      {
        label: "Total Documents",
        value: s.totalDocuments,
        color: "from-indigo-600 to-blue-600",
      },
      {
        label: "Expiring Docs (30d)",
        value: s.expiringDocuments,
        color: "from-amber-600 to-orange-600",
      },
      {
        label: "Expired Docs",
        value: s.expiredDocuments,
        color: "from-rose-600 to-red-600",
      },
      {
        label: "Notifications (7d)",
        value: s.recentNotifications,
        color: "from-fuchsia-600 to-pink-600",
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Employee Statistics
          </h2>
          {data?.generatedAt && (
            <span className="text-sm text-gray-500">
              Generated: {new Date(data.generatedAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => location.reload()}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
          >
            Refresh
          </button>
        </div>
        {loading && <p className="text-gray-700">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-lg p-4 bg-gradient-to-r ${c.color} text-white shadow hover:shadow-lg transition-shadow`}
                >
                  <div className="text-sm opacity-90">{c.label}</div>
                  <div className="text-3xl font-semibold">{c.value ?? "-"}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    Department Distribution
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="space-y-3">
                    {(() => {
                      const total =
                        data?.summary?.totalEmployees ||
                        departments.reduce(
                          (sum, d) => sum + (d.employeeCount || 0),
                          0
                        );
                      return departments.map((d) => {
                        const count = d.employeeCount || 0;
                        const pct = total
                          ? ((count / total) * 100).toFixed(1)
                          : 0;
                        return (
                          <div key={d._id || d.name} className="space-y-1">
                            <div className="flex justify-between text-sm text-gray-800">
                              <span>{d.name}</span>
                              <span className="font-medium">
                                {count} • {pct}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded h-2">
                              <div
                                className="h-2 rounded bg-blue-600"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Location Distribution
                </h3>
                <div className="overflow-x-auto">
                  <div className="space-y-3">
                    {(data?.locationDistribution || []).map((row) => (
                      <div key={row.name} className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-800">
                          <span>{row.name}</span>
                          <span className="font-medium">
                            {row.count} • {row.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded h-2">
                          <div
                            className="h-2 rounded bg-emerald-600"
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
