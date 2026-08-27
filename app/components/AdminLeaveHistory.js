"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Building,
  FileText,
  Eye,
  X,
  History,
  ShieldCheck,
  ChevronRight,
  IdCard,
  Briefcase,
  Layers,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

export default function AdminLeaveHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    department: "",
    leaveType: "all",
    startDate: "",
    endDate: "",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchHistory();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data?.success && Array.isArray(data.departments)) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/leave/approval-routing/requests?status=all");
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setRequests(result.data);
      } else {
        toast.error(result.error || "Failed to load leave history");
      }
    } catch (err) {
      console.error("Error fetching leave history:", err);
      toast.error("Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate working days between two dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        count++;
      }
    }
    return Math.max(1, count);
  };

  // Helper to extract employee code
  const getEmployeeCode = (req) => {
    return (
      req.employee?.employeeId ||
      req.employee?.empId ||
      req.employeeCustomId ||
      req.employeeId ||
      req.employeeDbId ||
      "EMP—"
    );
  };

  // Filtered requests with robust search by Employee ID (emp-id)
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search filter (Search by Emp ID, Name, Email, Department, Reason)
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        const name = (req.employee?.name || req.employeeName || "").toLowerCase();
        const email = (req.employee?.email || "").toLowerCase();
        const dept = (req.employee?.department || req.department || "").toLowerCase();
        const reason = (req.reason || req.description || "").toLowerCase();
        const leaveType = (req.leaveType || "").toLowerCase();
        const empCode = String(getEmployeeCode(req)).toLowerCase();
        const mongoId = String(req.employeeDbId || req._id || "").toLowerCase();

        const match =
          name.includes(q) ||
          email.includes(q) ||
          dept.includes(q) ||
          reason.includes(q) ||
          leaveType.includes(q) ||
          empCode.includes(q) ||
          mongoId.includes(q);

        if (!match) return false;
      }

      // Status filter
      if (filters.status !== "all" && req.status !== filters.status) {
        return false;
      }

      // Leave Type filter
      if (
        filters.leaveType !== "all" &&
        (req.leaveType || "Annual Leave").toLowerCase() !== filters.leaveType.toLowerCase()
      ) {
        return false;
      }

      // Department filter
      if (filters.department) {
        const dept = req.employee?.department || req.department;
        if (dept !== filters.department) {
          return false;
        }
      }

      // Date range filters
      if (filters.startDate) {
        if (new Date(req.startDate) < new Date(filters.startDate)) {
          return false;
        }
      }
      if (filters.endDate) {
        if (new Date(req.endDate) > new Date(filters.endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, filters]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const pending = requests.filter((r) => r.status === "pending" || !r.status).length;
    const totalApprovedDays = requests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + calculateDays(r.startDate, r.endDate), 0);

    return { total, approved, rejected, pending, totalApprovedDays };
  }, [requests]);

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      department: "",
      leaveType: "all",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  // Export to CSV
  const exportCsv = () => {
    if (filteredRequests.length === 0) {
      toast.info("No records to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Employee Email",
      "Department",
      "Designation",
      "Leave Type",
      "Start Date",
      "End Date",
      "Working Days",
      "Status",
      "Reason",
      "Submitted At",
      "Processed By",
      "Processed At",
      "Approver Comments",
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes("\n") || str.includes('"')
        ? `"${str}"`
        : str;
    };

    const rows = filteredRequests.map((r) => {
      const days = calculateDays(r.startDate, r.endDate);
      return [
        getEmployeeCode(r),
        r.employee?.name || r.employeeName || "Unknown",
        r.employee?.email || "",
        r.employee?.department || r.department || "N/A",
        r.employee?.designation || r.designation || "N/A",
        r.leaveType || "Annual Leave",
        r.startDate || "",
        r.endDate || "",
        days,
        r.status || "pending",
        r.reason || r.description || "",
        r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "",
        r.processedBy || "",
        r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "",
        r.comments || "",
      ].map(escape);
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave_request_history_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Leave history exported to CSV successfully");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
            Pending Review
          </span>
        );
    }
  };

  const getLeaveTypeBadge = (type) => {
    const t = (type || "Annual Leave").toLowerCase();
    if (t.includes("sick")) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Sick Leave
        </span>
      );
    }
    if (t.includes("maternity") || t.includes("paternity")) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          {type || "Parental Leave"}
        </span>
      );
    }
    if (t.includes("emergency") || t.includes("urgent")) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          Emergency
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        {type || "Annual Leave"}
      </span>
    );
  };

  const openDetailModal = (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

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
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Leave Request History
                </h2>
                <p className="text-indigo-200/90 text-xs sm:text-sm">
                  Complete leave ledger, audit trails, and instant search by Employee ID (Emp-ID).
                </p>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-sm">
                <div className="text-indigo-200 text-xs font-medium">Total Requests</div>
                <div className="text-xl sm:text-2xl font-bold text-white mt-1">{stats.total}</div>
              </div>
              <div className="bg-emerald-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-500/20 shadow-sm">
                <div className="text-emerald-300 text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Approved
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-200 mt-1">
                  {stats.approved}{" "}
                  <span className="text-xs font-normal text-emerald-300">
                    ({stats.totalApprovedDays} days)
                  </span>
                </div>
              </div>
              <div className="bg-amber-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-amber-500/20 shadow-sm">
                <div className="text-amber-300 text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Pending
                </div>
                <div className="text-xl sm:text-2xl font-bold text-amber-200 mt-1">{stats.pending}</div>
              </div>
              <div className="bg-rose-500/15 backdrop-blur-md rounded-2xl p-3.5 border border-rose-500/20 shadow-sm">
                <div className="text-rose-300 text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Rejected
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-200 mt-1">{stats.rejected}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={exportCsv}
              disabled={filteredRequests.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchHistory}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 hover:scale-[1.05]"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Filter Leave History</h3>
              <p className="text-xs text-slate-400">Search by Employee ID, Name, Department or Date Range</p>
            </div>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-indigo-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search by Emp-ID / Name / Email / Reason */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search Emp ID (e.g. EMP-001), Name, Email..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={filters.department}
              onChange={(e) => {
                setFilters({ ...filters, department: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white text-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Leave History Ledger{" "}
              <span className="text-xs text-slate-400 font-normal">
                ({filteredRequests.length} results)
              </span>
            </h3>
          </div>
          {loading && <span className="text-xs text-indigo-600 font-medium">Updating data...</span>}
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-slate-400 text-sm font-medium">Retrieving leave audit logs...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-3 text-indigo-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No leave records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No leave requests match your search criteria. Try clearing the search or changing filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Emp ID</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Leave Period</th>
                    <th className="px-6 py-4 text-center">Days</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Decision Trail</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRequests.map((req) => {
                    const days = calculateDays(req.startDate, req.endDate);
                    const empName = req.employee?.name || req.employeeName || "Employee";
                    const empCode = getEmployeeCode(req);
                    const initial = empName.charAt(0).toUpperCase();

                    return (
                      <tr
                        key={req._id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                        onClick={() => openDetailModal(req)}
                      >
                        {/* Employee Name + Email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                              {initial}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {empName}
                              </div>
                              <div className="text-slate-400 text-xs">
                                {req.employee?.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID (Emp-ID) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                            <IdCard className="w-3 h-3 text-slate-400" />
                            {empCode}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
                            {req.employee?.department || req.department || "General"}
                          </span>
                        </td>

                        {/* Leave Type */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getLeaveTypeBadge(req.leaveType)}
                        </td>

                        {/* Leave Period */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {new Date(req.startDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-slate-400 text-xs">
                            to{" "}
                            {new Date(req.endDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl text-xs">
                            {days} {days === 1 ? "day" : "days"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(req.status)}
                        </td>

                        {/* Decision Trail */}
                        <td className="px-6 py-4">
                          {req.processedBy ? (
                            <div className="text-xs">
                              <span className="font-semibold text-slate-800">
                                {req.processedBy}
                              </span>
                              {req.processedAt && (
                                <div className="text-slate-400 text-[11px]">
                                  {new Date(req.processedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Awaiting action</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetailModal(req);
                            }}
                            className="p-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-all"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRequests.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(sz) => {
                  setItemsPerPage(sz);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-indigo-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Leave Application Audit</h3>
                  <p className="text-indigo-200 text-xs">
                    Submitted on{" "}
                    {selectedRequest.submittedAt
                      ? new Date(selectedRequest.submittedAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-sm">
              {/* Employee Info Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Applicant</p>
                  <p className="font-bold text-slate-900 text-base mt-0.5">
                    {selectedRequest.employee?.name || selectedRequest.employeeName || "Unknown"}
                  </p>
                  <p className="text-slate-500 text-xs">{selectedRequest.employee?.email || ""}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <IdCard className="w-3.5 h-3.5" />
                    {getEmployeeCode(selectedRequest)}
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedRequest.employee?.department || selectedRequest.department || "General"}
                  </p>
                </div>
              </div>

              {/* Leave Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Leave Type</p>
                  <div className="mt-1">{getLeaveTypeBadge(selectedRequest.leaveType)}</div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Period</p>
                  <p className="font-semibold text-slate-900 mt-1 text-xs sm:text-sm">
                    {new Date(selectedRequest.startDate).toLocaleDateString()} –{" "}
                    {new Date(selectedRequest.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Duration</p>
                  <p className="font-bold text-indigo-700 mt-1 text-sm">
                    {calculateDays(selectedRequest.startDate, selectedRequest.endDate)} Working Days
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1.5">Reason for Leave</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 text-sm leading-relaxed">
                  {selectedRequest.reason || selectedRequest.description || (
                    <span className="text-slate-400 italic">No reason provided</span>
                  )}
                </div>
              </div>

              {/* Approval Trail */}
              {selectedRequest.processedBy && (
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Decision Audit Trail</span>
                  </div>
                  <div className="text-xs text-indigo-950 space-y-1.5">
                    <p>
                      <span className="font-semibold">Processed By:</span>{" "}
                      {selectedRequest.processedBy}
                    </p>
                    {selectedRequest.processedAt && (
                      <p>
                        <span className="font-semibold">Decision Timestamp:</span>{" "}
                        {new Date(selectedRequest.processedAt).toLocaleString()}
                      </p>
                    )}
                    {selectedRequest.comments && (
                      <p className="mt-2 bg-white/80 p-3 rounded-xl border border-indigo-100">
                        <span className="font-semibold block text-slate-700 mb-0.5">Manager Notes:</span>
                        {selectedRequest.comments}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
