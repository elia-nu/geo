"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  Calendar,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Camera,
  Eye,
  RefreshCw,
  TrendingUp,
  Award,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { formatWorkingHours } from "../utils/timeUtils";
import Pagination from "./ui/Pagination";

export default function EmployeeAttendanceHistory({
  employeeId,
  employeeName,
}) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusTab, setStatusTab] = useState("all"); // all, complete, partial, absent
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (employeeId) {
      fetchAttendanceHistory();
    }
  }, [employeeId, filters.startDate, filters.endDate]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);

      let url = `/api/attendance/daily?employeeId=${employeeId}`;

      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setAttendanceRecords(result.data);
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      status: "",
    });
    setSearchTerm("");
    setStatusTab("all");
    setCurrentPage(1);
  };

  const setDatePreset = (preset) => {
    const today = new Date();
    if (preset === "this-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
      setFilters((prev) => ({ ...prev, startDate: firstDay, endDate: lastDay }));
    } else if (preset === "last-30") {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setFilters((prev) => ({
        ...prev,
        startDate: past30.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }));
    } else if (preset === "all") {
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }));
    }
    setCurrentPage(1);
  };

  const getStatusDisplay = (record) => {
    if (record.checkInTime && record.checkOutTime) {
      return {
        key: "complete",
        text: "Complete",
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
        icon: CheckCircle,
      };
    } else if (record.checkInTime) {
      return {
        key: "partial",
        text: "Partial",
        color: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        icon: Clock,
      };
    } else {
      return {
        key: "absent",
        text: "Absent",
        color: "text-rose-700 dark:text-rose-300",
        bgColor: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
        icon: XCircle,
      };
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Metrics summary
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    let complete = 0;
    let partial = 0;
    let absent = 0;
    let totalMinutes = 0;

    attendanceRecords.forEach((record) => {
      if (record.checkInTime && record.checkOutTime) {
        complete++;
        const diff =
          new Date(record.checkOutTime) - new Date(record.checkInTime);
        if (diff > 0) totalMinutes += diff / (1000 * 60);
      } else if (record.checkInTime) {
        partial++;
      } else {
        absent++;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);

    return {
      total,
      complete,
      partial,
      absent,
      hoursFormatted: `${hours}h ${mins}m`,
    };
  }, [attendanceRecords]);

  // Filtered attendance records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const statusObj = getStatusDisplay(record);

      // Status Tab filter
      if (statusTab !== "all" && statusObj.key !== statusTab) {
        return false;
      }

      // Dropdown status filter
      if (filters.status && statusObj.key !== filters.status) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const dateMatch = record.date?.toLowerCase().includes(query);
        const notesMatch = record.notes?.toLowerCase().includes(query);
        const statusMatch = statusObj.text.toLowerCase().includes(query);
        if (!dateMatch && !notesMatch && !statusMatch) return false;
      }

      return true;
    });
  }, [attendanceRecords, statusTab, filters.status, searchTerm]);

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const exportToCSV = () => {
    if (attendanceRecords.length === 0) return;
    const headers = [
      "Date",
      "Check-in",
      "Check-out",
      "Working Hours",
      "Status",
      "Location Recorded",
      "Photo Verified",
      "Notes",
    ];
    const csvData = filteredRecords.map((record) => [
      formatDate(record.date),
      formatTime(record.checkInTime),
      formatTime(record.checkOutTime),
      formatWorkingHours(record),
      getStatusDisplay(record).text,
      record.checkInLocation ? "Yes" : "No",
      record.checkInPhoto ? "Yes" : "No",
      record.notes || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_history_${(employeeName || "employee").replace(
      /\s+/g,
      "_"
    )}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Attendance History
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                Audit logs of daily check-ins, check-outs, on-site GPS verification, and logged hours
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchAttendanceHistory}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white backdrop-blur transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div
            onClick={() => {
              setStatusTab("all");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "all"
                ? "bg-white/25 border border-white/40 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-emerald-200 font-medium">Total Days Logged</div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.total}</div>
          </div>

          <div
            onClick={() => {
              setStatusTab("complete");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "complete"
                ? "bg-emerald-400/30 border border-emerald-300/50 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-emerald-200 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-300" /> Complete Days
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-200 mt-0.5">{stats.complete}</div>
          </div>

          <div
            onClick={() => {
              setStatusTab("partial");
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl backdrop-blur-md cursor-pointer transition-all ${
              statusTab === "partial"
                ? "bg-amber-400/30 border border-amber-300/50 shadow-sm"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            <div className="text-[11px] text-amber-200 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-300" /> Partial Shifts
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-200 mt-0.5">{stats.partial}</div>
          </div>

          <div className="p-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/10">
            <div className="text-[11px] text-emerald-200 font-medium flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-300" /> Total Hours
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.hoursFormatted}</div>
          </div>
        </div>
      </div>

      {/* Search & Date Controls Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD) or notes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 hover:bg-slate-300 rounded-full w-5 h-5 flex items-center justify-center font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Date Presets & Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setDatePreset("this-month")}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => setDatePreset("last-30")}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDatePreset("all")}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                All Time
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                showFilters || filters.startDate || filters.endDate || filters.status
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(filters.startDate || filters.endDate || filters.status) && (
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              )}
            </button>
          </div>
        </div>

        {/* Status Tab Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: "all", label: "All Records", count: stats.total },
            { id: "complete", label: "Complete", count: stats.complete },
            { id: "partial", label: "Partial Shifts", count: stats.partial },
            { id: "absent", label: "Absent", count: stats.absent },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === tab.id
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Collapsible Date Picker Section */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 animate-fadeIn">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Statuses</option>
                <option value="complete">Complete Only</option>
                <option value="partial">Partial Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Records List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Attendance Records
              </h2>
              <p className="text-xs text-slate-500">
                Showing {filteredRecords.length} matching {filteredRecords.length === 1 ? "record" : "records"}
              </p>
            </div>
          </div>

          {filteredRecords.length > 0 && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
              <span className="text-xs font-semibold text-slate-500">Loading attendance records...</span>
            </div>
          ) : paginatedRecords.length > 0 ? (
            <div className="space-y-3.5 sm:space-y-4">
              {paginatedRecords.map((record, index) => {
                const status = getStatusDisplay(record);
                const StatusIcon = status.icon;
                const dateObj = new Date(record.date);

                return (
                  <div
                    key={record._id || index}
                    className="border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md bg-white space-y-4"
                  >
                    {/* Top Row: Date Badge, Weekday, and Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                        {/* Calendar Day Tile */}
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-emerald-900 shrink-0">
                          <span className="text-base font-extrabold leading-none">
                            {isNaN(dateObj.getDate()) ? "--" : dateObj.getDate()}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-emerald-600 mt-0.5">
                            {isNaN(dateObj.getTime())
                              ? ""
                              : dateObj.toLocaleDateString([], { month: "short" })}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            {formatDate(record.date)}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Workday Record
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{status.text}</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
                      {/* Check-In / Check-Out times */}
                      <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                          Shift Times
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" /> Check-in:
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatTime(record.checkInTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-rose-500" /> Check-out:
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatTime(record.checkOutTime)}
                          </span>
                        </div>
                        {record.checkInTime && record.checkOutTime && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-700 font-semibold">Total Hours:</span>
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {formatWorkingHours(record)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Verification proofs */}
                      <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-2">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                          Compliance Proofs
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {record.checkInLocation ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-medium text-[11px]">
                                <MapPin className="w-3 h-3 text-emerald-600" /> Geofence Verified
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                No GPS coordinate recorded
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {record.checkInPhoto ? (
                              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-medium text-[11px]">
                                <Camera className="w-3 h-3 text-blue-600" /> Photo Proof Captured
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                No camera photo captured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes / Remarks */}
                      <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                          Notes / Remarks
                        </span>
                        <p className="text-slate-800 text-xs mt-1 leading-relaxed">
                          {record.notes ? record.notes : <span className="text-slate-400 italic">No notes added for this shift.</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-14 text-slate-400 space-y-3">
              <History className="w-14 h-14 mx-auto text-slate-300" />
              <div>
                <h3 className="text-base font-bold text-slate-700">No attendance records found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusTab !== "all" || filters.startDate || filters.endDate
                    ? "Try resetting your search query or expanding your date filters."
                    : "No attendance logs recorded yet."}
                </p>
              </div>
              {(searchTerm || statusTab !== "all" || filters.startDate || filters.endDate) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  Clear Filters & Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRecords.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 25, 50]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
