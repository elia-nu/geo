"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  RefreshCcw,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  IdCard,
  Building2,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";
import { formatWorkingHours, calculateEffectiveWorkingHours } from "../utils/timeUtils";

export default function AllAttendance() {
  const [records, setRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else if (type === "warning") toast.warning(msg);
    else toast.info(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employeeId) params.append("employeeId", filters.employeeId.trim());
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("collection", "daily_attendance");

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

  const getEmpId = (r) => {
    return (
      r.employee?.employeeId ||
      r.employee?.empId ||
      r.employeeId ||
      r.empId ||
      "EMP—"
    );
  };

  const filtered = useMemo(() => {
    let out = records;
    if (filters.department) {
      out = out.filter((r) =>
        (r.employee?.department || r.department || "")
          .toLowerCase()
          .includes(filters.department.toLowerCase())
      );
    }
    if (filters.employeeId) {
      const target = filters.employeeId.toLowerCase().trim();
      out = out.filter((r) => {
        const empCode = String(getEmpId(r)).toLowerCase();
        const rawId = String(r.employeeId || "").toLowerCase();
        return empCode.includes(target) || rawId.includes(target);
      });
    }
    if (filters.search) {
      const s = filters.search.toLowerCase().trim();
      out = out.filter((r) => {
        const name = (r.employee?.name || r.employeeName || "").toLowerCase();
        const email = (r.employee?.email || "").toLowerCase();
        const desig = (r.employee?.designation || "").toLowerCase();
        const loc = (r.workLocationName || r.geofenceValidation?.workLocationName || "").toLowerCase();
        const empCode = String(getEmpId(r)).toLowerCase();

        return (
          name.includes(s) ||
          email.includes(s) ||
          desig.includes(s) ||
          loc.includes(s) ||
          empCode.includes(s)
        );
      });
    }
    return out;
  }, [records, filters.department, filters.employeeId, filters.search]);

  const totalPages = Math.ceil((filtered.length || 0) / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Key metrics
  const stats = useMemo(() => {
    const total = records.length;
    const verified = records.filter((r) => r.faceVerified).length;
    const hoursList = records
      .map((r) => {
        if (r.checkInTime && r.checkOutTime) {
          return (
            calculateEffectiveWorkingHours(
              r.checkInTime,
              r.checkOutTime,
              r.lunchOutTime,
              r.lunchInTime
            ) || 0
          );
        }
        return typeof r.workingHours === "number" ? r.workingHours : 0;
      })
      .filter((h) => h > 0);

    const avgDec =
      hoursList.length > 0
        ? hoursList.reduce((acc, curr) => acc + curr, 0) / hoursList.length
        : 0;
    const avgHours = formatWorkingHours(avgDec);

    return { total, verified, avgHours };
  }, [records]);

  const resetFilters = () => {
    setFilters({
      employeeId: "",
      department: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  const applyQuickDatePreset = (preset) => {
    const today = new Date();
    const formatDateStr = (d) => d.toISOString().split("T")[0];

    let start = "";
    let end = formatDateStr(today);

    if (preset === "today") {
      start = formatDateStr(today);
      end = formatDateStr(today);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = formatDateStr(y);
      end = formatDateStr(y);
    } else if (preset === "week") {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      start = formatDateStr(w);
    } else if (preset === "month") {
      const m = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDateStr(m);
    }

    setFilters((p) => ({ ...p, startDate: start, endDate: end }));
  };

  const toCsv = (rows) => {
    const headers = [
      "Date",
      "Employee ID",
      "Employee Name",
      "Employee Email",
      "Department",
      "Designation",
      "Check In",
      "Check Out",
      "Working Hours",
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
        getEmpId(r),
        r.employee?.name || r.employeeName || "",
        r.employee?.email || "",
        r.employee?.department || r.department || "",
        r.employee?.designation || "",
        r.checkInTime ? new Date(r.checkInTime).toLocaleString() : "",
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : "",
        formatWorkingHours(r),
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
    toast.success("Attendance logs exported successfully");
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 shadow-2xl text-white border border-indigo-900/40">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  All Attendance Records
                </h2>
                <p className="text-indigo-200/90 text-xs sm:text-sm">
                  Live timesheet registry, biometric logs, and employee ID search.
                </p>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-sm">
                <div className="text-indigo-200 text-xs font-medium">Total Logs</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.total}</div>
              </div>
              <div className="bg-emerald-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-500/20 shadow-sm">
                <div className="text-emerald-300 text-xs font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Filtered
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-200 mt-1">{filtered.length}</div>
              </div>
              <div className="bg-purple-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-purple-500/20 shadow-sm">
                <div className="text-purple-300 text-xs font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Face Verified
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-200 mt-1">{stats.verified}</div>
              </div>
              <div className="bg-blue-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-blue-500/20 shadow-sm">
                <div className="text-blue-300 text-xs font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Avg Hours
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-200 mt-1">{stats.avgHours}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 hover:scale-[1.05]"
              title="Refresh"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border ${
            messageType === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Filter Attendance Registry</h3>
              <p className="text-xs text-slate-400">Search by Employee ID, Name, Department or Date</p>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => applyQuickDatePreset("today")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => applyQuickDatePreset("yesterday")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => applyQuickDatePreset("week")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyQuickDatePreset("month")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Universal Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search name, email, designation, location..."
              value={filters.search}
              onChange={(e) =>
                setFilters((p) => ({ ...p, search: e.target.value }))
              }
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Dedicated Employee ID Search */}
          <div className="relative">
            <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Emp ID (e.g. EMP-001)"
              value={filters.employeeId}
              onChange={(e) =>
                setFilters((p) => ({ ...p, employeeId: e.target.value }))
              }
              className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Department */}
          <div>
            <input
              type="text"
              placeholder="Department"
              value={filters.department}
              onChange={(e) =>
                setFilters((p) => ({ ...p, department: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, startDate: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters((p) => ({ ...p, endDate: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="End Date"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={fetchData}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Attendance Log ({filtered.length} entries)</span>
          </div>
          {loading && <span className="text-xs text-indigo-600 font-medium">Refreshing logs...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider text-left">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Emp ID</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4 text-center">Hours</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-slate-400" colSpan={9}>
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
                      <Calendar className="w-7 h-7" />
                    </div>
                    <div className="font-semibold text-slate-700">No attendance records found</div>
                    <div className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => {
                  const empName = r.employee?.name || r.employeeName || "Unknown";
                  const initial = empName.charAt(0).toUpperCase();
                  const empCode = getEmpId(r);

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {r.date ? formatDate(r.date) : "—"}
                      </td>

                      {/* Employee Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {empName}
                            </div>
                            <div className="text-slate-400 text-xs">
                              {r.employee?.email || ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Emp ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                          <IdCard className="w-3 h-3 text-slate-400" />
                          {empCode}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                          {r.employee?.department || r.department || "General"}
                        </span>
                      </td>

                      {/* Check In */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-emerald-700 font-bold">
                        {formatTime(r.checkInTime)}
                      </td>

                      {/* Check Out */}
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-semibold">
                        {formatTime(r.checkOutTime)}
                      </td>

                      {/* Hours */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs">
                          {formatWorkingHours(r)}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {r.workLocationName ||
                              r.geofenceValidation?.workLocationName ||
                              "—"}
                          </span>
                        </div>
                      </td>

                      {/* Face Verified */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.faceVerified
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.faceVerified ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <span>Standard</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
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
          />
        </div>
      </div>
    </div>
  );
}
