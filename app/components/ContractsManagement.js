"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingDown,
  LayoutGrid,
  List,
  Sparkles,
  Send,
  ExternalLink,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

export default function ContractsManagement() {
  const [contracts, setContracts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, expiring, expired, active
  const [sendingNotifications, setSendingNotifications] = useState({});
  const [notificationResult, setNotificationResult] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/notifications/contract-expiry/test");
      const data = await response.json();

      if (data.success) {
        const contractsData = (data.employees || []).map((emp) => ({
          employeeId: emp.employeeId,
          employeeName: emp.name,
          employeeEmail: emp.email,
          employeeType: emp.employeeType,
          contractExpiryDate: emp.contractExpiryDate,
          daysUntilExpiry: emp.daysUntilExpiry,
          status: emp.status,
          shouldNotify: emp.shouldNotify,
        }));
        setContracts(contractsData);
      } else {
        setError(data.error || "Failed to fetch contracts");
      }
    } catch (err) {
      console.error("Error fetching contracts:", err);
      setError("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationForContract = async (contract) => {
    try {
      setSendingNotifications((prev) => ({
        ...prev,
        [contract.employeeId]: true,
      }));
      setNotificationResult(null);

      const response = await fetch(
        `/api/notifications/contract-expiry?force=true`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.success) {
        const msg = `Notifications sent! Sent: ${data.sent}, Failed: ${data.failed}`;
        toast.success(msg);
        setNotificationResult({
          type: "success",
          message: msg,
        });
        setTimeout(() => {
          fetchContracts();
        }, 1000);
      } else {
        const err = data.error || "Failed to send notifications";
        toast.error(err);
        setNotificationResult({
          type: "error",
          message: err,
        });
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      toast.error("Failed to send notification");
      setNotificationResult({
        type: "error",
        message: "Failed to dispatch notification",
      });
    } finally {
      setSendingNotifications((prev) => ({
        ...prev,
        [contract.employeeId]: false,
      }));
    }
  };

  const getStatusBadge = (daysUntilExpiry, shouldNotify) => {
    if (daysUntilExpiry === null) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          No Expiry
        </span>
      );
    }
    if (daysUntilExpiry < 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </span>
      );
    }
    if (daysUntilExpiry <= 15) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 gap-1">
          <AlertTriangle className="w-3 h-3" />
          Expiring Soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Active
      </span>
    );
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (contract.employeeName || "").toLowerCase().includes(term) ||
        (contract.employeeId || "").toLowerCase().includes(term) ||
        (contract.employeeEmail || "").toLowerCase().includes(term) ||
        (contract.employeeType || "").toLowerCase().includes(term) ||
        (contract.contractExpiryDate && contract.contractExpiryDate.includes(term));

      let matchesStatus = true;
      if (filterStatus === "expired") {
        matchesStatus =
          contract.daysUntilExpiry !== null && contract.daysUntilExpiry < 0;
      } else if (filterStatus === "expiring") {
        matchesStatus =
          contract.daysUntilExpiry !== null &&
          contract.daysUntilExpiry >= 0 &&
          contract.daysUntilExpiry <= 15;
      } else if (filterStatus === "active") {
        matchesStatus =
          contract.daysUntilExpiry !== null && contract.daysUntilExpiry > 15;
      }

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, filterStatus]);

  const totalPages =
    Math.ceil((filteredContracts.length || 0) / itemsPerPage) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    return {
      total: contracts.length,
      expired: contracts.filter(
        (c) => c.daysUntilExpiry !== null && c.daysUntilExpiry < 0
      ).length,
      expiring: contracts.filter(
        (c) =>
          c.daysUntilExpiry !== null &&
          c.daysUntilExpiry >= 0 &&
          c.daysUntilExpiry <= 15
      ).length,
      active: contracts.filter(
        (c) => c.daysUntilExpiry !== null && c.daysUntilExpiry > 15
      ).length,
    };
  }, [contracts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-orange-500/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Contract Management
                </h1>
                <p className="text-amber-100/80 text-xs sm:text-sm mt-0.5">
                  Track employee contract lifecycles, expiration dates, and automated notice dispatches.
                </p>
              </div>
            </div>

            {/* Quick Stat Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{stats.total} Total Contracts</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-300 flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{stats.active} Active</span>
              </div>
              {stats.expiring > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md text-xs font-semibold text-amber-200 flex items-center gap-1.5 border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{stats.expiring} Expiring Soon</span>
                </div>
              )}
              {stats.expired > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 backdrop-blur-md text-xs font-semibold text-rose-200 flex items-center gap-1.5 border border-rose-400/30">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{stats.expired} Expired</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={fetchContracts}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Refresh Contracts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Feedback */}
      {notificationResult && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-medium border shadow-sm ${
            notificationResult.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationResult.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notificationResult.message}</span>
          </div>
          <button
            onClick={() => setNotificationResult(null)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 bg-white rounded-lg border border-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Filter Contracts
            </h3>
            {(searchTerm || filterStatus !== "all") && (
              <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full">
                {filteredContracts.length} matching of {contracts.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {(searchTerm || filterStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, Email, or Type..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
            >
              <option value="all">All Statuses ({contracts.length})</option>
              <option value="active">Active ({stats.active})</option>
              <option value="expiring">Expiring Soon ({stats.expiring})</option>
              <option value="expired">Expired ({stats.expired})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading && contracts.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Loading contract directory...
            </p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              {contracts.length === 0
                ? "No contractual records registered"
                : "No contracts matching your filters"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {contracts.length === 0
                ? "Personnel with fixed-term or probationary contracts will appear here."
                : "Try clearing your search or status filter."}
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Expiry Date</th>
                  <th className="px-6 py-3.5">Remaining Days</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedContracts.map((contract) => (
                  <tr
                    key={contract.employeeId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs">
                          {contract.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {contract.employeeName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {contract.employeeId} &bull; {contract.employeeEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {contract.employeeType || "Contractual"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {contract.contractExpiryDate
                        ? new Date(contract.contractExpiryDate).toLocaleDateString()
                        : "No Expiry"}
                    </td>

                    <td className="px-6 py-4">
                      {contract.daysUntilExpiry !== null ? (
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            contract.daysUntilExpiry < 0
                              ? "text-rose-600"
                              : contract.daysUntilExpiry <= 15
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {contract.daysUntilExpiry < 0
                            ? `${Math.abs(contract.daysUntilExpiry)} days overdue`
                            : `${contract.daysUntilExpiry} days`}
                        </span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(
                        contract.daysUntilExpiry,
                        contract.shouldNotify
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {(contract.daysUntilExpiry === null ||
                        contract.daysUntilExpiry <= 15) && (
                        <button
                          type="button"
                          onClick={() => sendNotificationForContract(contract)}
                          disabled={sendingNotifications[contract.employeeId]}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>Dispatch Alert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContracts.map((contract) => (
              <div
                key={contract.employeeId}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                        {contract.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {contract.employeeName}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {contract.employeeId} &bull; {contract.employeeType || "Contractual"}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {getStatusBadge(
                        contract.daysUntilExpiry,
                        contract.shouldNotify
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">
                        {contract.employeeEmail || "No email registered"}
                      </span>
                    </div>
                    {contract.contractExpiryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>
                          Expires:{" "}
                          <strong className="text-slate-900 font-semibold">
                            {new Date(
                              contract.contractExpiryDate
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      Timeline Status:
                    </span>
                    {contract.daysUntilExpiry !== null && (
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          contract.daysUntilExpiry < 0
                            ? "text-rose-600"
                            : contract.daysUntilExpiry <= 7
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {contract.daysUntilExpiry < 0
                          ? `${Math.abs(contract.daysUntilExpiry)} days overdue`
                          : `${contract.daysUntilExpiry} days remaining`}
                      </span>
                    )}
                  </div>

                  {(contract.daysUntilExpiry === null ||
                    contract.daysUntilExpiry <= 15) && (
                    <button
                      onClick={() => sendNotificationForContract(contract)}
                      disabled={sendingNotifications[contract.employeeId]}
                      className="w-full px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingNotifications[contract.employeeId] ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching Alert...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Dispatch Expiry Notice</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredContracts.length > 0 && (
          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredContracts.length)} of{" "}
                {filteredContracts.length} records
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                  <option value={36}>36</option>
                </select>
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
