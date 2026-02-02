"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  RefreshCcw,
  Search,
  Filter,
  Calendar,
  Users,
} from "lucide-react";

export default function AllAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  const [filters, setFilters] = useState({
    employeeId: "",
    department: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append("employeeId", filters.employeeId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("collection", "daily_attendance"); // Use daily_attendance collection for enriched data

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        showMessage(json.error || "Failed to load attendance", "error");
        setRecords([]);
        return;
      }
      setRecords(json || []);
    } catch (e) {
      console.error(e);
      showMessage("Failed to load attendance", "error");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let out = records;
    if (filters.department) {
      out = out.filter((r) =>
        (r.employee?.department || r.department || "")
          .toLowerCase()
          .includes(filters.department.toLowerCase())
      );
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      out = out.filter(
        (r) =>
          (r.employee?.name || r.employeeName || "")
            .toLowerCase()
            .includes(s) ||
          (r.employee?.email || "").toLowerCase().includes(s) ||
          (r.employee?.designation || "").toLowerCase().includes(s) ||
          (r.workLocationName || "").toLowerCase().includes(s)
      );
    }
    return out;
  }, [records, filters.department, filters.search]);

  const resetFilters = () => {
    setFilters({
      employeeId: "",
      department: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  const toCsv = (rows) => {
    const headers = [
      "Date",
      "Employee Name",
      "Employee Email",
      "Department",
      "Designation",
      "Check In",
      "Check Out",
      "Hours",
      "Work Location",
      "Face Verified",
    ];

    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      if (s.search(/[",\n]/g) >= 0) return `"${s}"`;
      return s;
    };

    const lines = [headers.join(",")];
    for (const r of rows) {
      const row = [
        r.date || "",
        r.employee?.name || r.employeeName || "",
        r.employee?.email || "",
        r.employee?.department || r.department || "",
        r.employee?.designation || "",
        r.checkInTime ? new Date(r.checkInTime).toLocaleString() : "",
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : "",
        typeof r.workingHours === "number" ? r.workingHours : "",
        r.workLocationName || r.geofenceValidation?.workLocationName || "",
        r.faceVerified ? "Yes" : "No",
      ].map(escape);
      lines.push(row.join(","));
    }
    return lines.join("\n");
  };

  const exportCsv = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const namePart =
      filters.startDate && filters.endDate
        ? `${filters.startDate}_to_${filters.endDate}`
        : filters.startDate ||
          filters.endDate ||
          new Date().toISOString().split("T")[0];
    a.download = `all_attendance_${namePart}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyFilters = () => {
    fetchData();
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const formatTime = (d) =>
    d
      ? new Date(d).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">All Attendance</h2>
          <p className="text-black">
            Browse all attendance records with filters and export to CSV
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCcw
              className="w-4 h-4 text-black"
              fill="currentColor"
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            messageType === "error"
              ? "bg-red-200 text-red-900"
              : messageType === "success"
              ? "bg-green-200 text-green-900"
              : "bg-blue-200 text-blue-900"
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search name, email, designation, location..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-black placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="col-span-1">
            <input
              type="text"
              placeholder="Employee ID"
              value={filters.employeeId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, employeeId: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-black placeholder:text-gray-500"
            />
          </div>
          <div className="col-span-1">
            <input
              type="text"
              placeholder="Department"
              value={filters.department}
              onChange={(e) =>
                setFilters((p) => ({ ...p, department: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-black placeholder:text-gray-500"
            />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-black"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-black"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Apply
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b">
          <div className="flex items-center gap-2 text-sm text-black">
            <Users className="w-4 h-4" />
            <span>{filtered.length} records</span>
          </div>
          {loading && <span className="text-sm text-black">Loading...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-black">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Designation</th>
                <th className="px-4 py-2">Check In</th>
                <th className="px-4 py-2">Check Out</th>
                <th className="px-4 py-2">Hours</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Verified</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-black" colSpan={9}>
                    No attendance found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id} className="border-b last:border-b-0">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {r.date ? formatDate(r.date) : ""}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium">
                        {r.employee?.name || r.employeeName || ""}
                      </div>
                      <div className="text-black text-xs">
                        {r.employee?.email || ""}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {r.employee?.department || r.department || ""}
                    </td>
                    <td className="px-4 py-2">
                      {r.employee?.designation || ""}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {formatTime(r.checkInTime)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {formatTime(r.checkOutTime)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {typeof r.workingHours === "number"
                        ? `${r.workingHours}h`
                        : ""}
                    </td>
                    <td className="px-4 py-2">
                      {r.workLocationName ||
                        r.geofenceValidation?.workLocationName ||
                        ""}
                    </td>
                    <td className="px-4 py-2">
                      {r.faceVerified ? "Yes" : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
