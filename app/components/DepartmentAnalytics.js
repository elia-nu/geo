"use client";
import React, { useEffect, useState } from "react";

export default function DepartmentAnalytics() {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [analyticsRes, deptRes] = await Promise.all([
          fetch("/api/reports/analytics?type=departments"),
          fetch("/api/departments"),
        ]);
        if (!analyticsRes.ok)
          throw new Error("Failed to fetch department analytics");
        if (!deptRes.ok) throw new Error("Failed to fetch departments");
        const analytics = await analyticsRes.json();
        const deptPayload = await deptRes.json();
        setData(analytics);
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Department Analytics
        </h2>
        {data?.generatedAt && (
          <span className="text-sm text-gray-500">
            Generated: {new Date(data.generatedAt).toLocaleString()}
          </span>
        )}
      </div>
      {loading && <p className="text-gray-700">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Overview</h3>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Employees</th>
                  <th className="py-2 pr-4">Avg Experience (yrs)</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => {
                  const analyticsRow = (data?.departments || []).find(
                    (d) => d.name === dept.name
                  );
                  return (
                    <tr key={dept._id || dept.name} className="border-t">
                      <td className="py-2 pr-4 text-gray-800">{dept.name}</td>
                      <td className="py-2 pr-4 text-gray-800">
                        {dept.employeeCount || 0}
                      </td>
                      <td className="py-2 pr-4 text-gray-800">
                        {analyticsRow?.averageExperience ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Employee Share</h3>
            <div className="space-y-3">
              {departments.map((dept) => {
                const max =
                  Math.max(...departments.map((d) => d.employeeCount || 0)) ||
                  1;
                const pct = Math.round(((dept.employeeCount || 0) / max) * 100);
                return (
                  <div key={dept._id || dept.name} className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-800">
                      <span>{dept.name}</span>
                      <span className="font-medium">
                        {dept.employeeCount || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div
                        className="h-2 rounded bg-indigo-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
