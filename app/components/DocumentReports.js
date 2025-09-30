"use client";
import React, { useEffect, useMemo, useState } from "react";

export default function DocumentReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });

  const load = async (startDate, endDate) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ type: "documents" });
      if (startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      const res = await fetch(`/api/reports/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch document reports");
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byType = useMemo(() => data?.byType || {}, [data]);
  const byStatus = useMemo(() => data?.byStatus || {}, [data]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Document Reports</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={range.start}
              onChange={(e) => setRange({ ...range, start: e.target.value })}
              className="border rounded p-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange({ ...range, end: e.target.value })}
              className="border rounded p-2 text-sm"
            />
            <button
              onClick={() => load(range.start, range.end)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
            >
              Apply
            </button>
          </div>
        </div>
        {loading && <p className="text-gray-700">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <div className="text-sm text-gray-600">Total Documents</div>
                <div className="text-2xl font-semibold">{data.total}</div>
              </div>
              <div className="rounded-lg p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <div className="text-sm opacity-90">Active</div>
                <div className="text-2xl font-semibold">{byStatus.active}</div>
              </div>
              <div className="rounded-lg p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
                <div className="text-sm opacity-90">Expiring Soon</div>
                <div className="text-2xl font-semibold">
                  {byStatus.expiring}
                </div>
              </div>
              <div className="rounded-lg p-4 bg-gradient-to-r from-rose-600 to-red-600 text-white">
                <div className="text-sm opacity-90">Expired</div>
                <div className="text-2xl font-semibold">{byStatus.expired}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">By Type</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byType).map(([type, count]) => (
                        <tr key={type} className="border-t">
                          <td className="py-2 pr-4 text-gray-800">{type}</td>
                          <td className="py-2 pr-4 text-gray-800">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Upload Trend (by month)
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-2 pr-4">Month</th>
                        <th className="py-2 pr-4">Uploads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.uploadTrend || {}).map(
                        ([month, count]) => (
                          <tr key={month} className="border-t">
                            <td className="py-2 pr-4 text-gray-800">{month}</td>
                            <td className="py-2 pr-4 text-gray-800">{count}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
