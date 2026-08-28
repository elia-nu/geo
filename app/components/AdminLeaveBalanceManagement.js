"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  BarChart3,
  Eye,
  Edit,
  Save,
  X,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function AdminLeaveBalanceManagement() {
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [adjustmentData, setAdjustmentData] = useState({
    leaveType: "annual",
    days: 0,
    reason: "",
  });
  const [filters, setFilters] = useState({
    department: "",
    lowBalance: false,
    highUsage: false,
  });
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
    fetchLeaveBalances();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaveBalances, 30000);
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, filters]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch("/api/departments");
        const data = await res.json();
        if (data?.success && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      }
    };
    fetchDepartments();
  }, []);

  const fetchLeaveBalances = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.department) params.append("department", filters.department);
      if (filters.lowBalance) params.append("lowBalance", "true");
      if (filters.highUsage) params.append("highUsage", "true");
      params.append("includeNotifications", "true");

      const endpoint = realTimeMode
        ? `/api/leave/balances/realtime?${params.toString()}`
        : `/api/leave/balances?${params.toString()}`;

      const response = await fetch(endpoint);
      const result = await response.json();

      if (result.success) {
        setLeaveBalances(result.data.balances || []);
      } else {
        showMessage(result.error || "Failed to load leave balances", "error");
      }
    } catch (error) {
      console.error("Error fetching leave balances:", error);
      showMessage("Failed to load leave balances", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleAdjustment = async () => {
    if (
      !selectedEmployee ||
      !adjustmentData.reason
    ) {
      showMessage("Please fill in all required fields", "error");
      return;
    }

    try {
      const response = await fetch("/api/leave/balances/realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          action: "adjust",
          leaveType: "annual",
          days: adjustmentData.days,
          reason: adjustmentData.reason,
          adminId: "admin",
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage("Annual leave balance adjusted successfully", "success");
        setShowAdjustmentModal(false);
        setAdjustmentData({ leaveType: "annual", days: 0, reason: "" });
        setSelectedEmployee(null);
        fetchLeaveBalances();
      } else {
        showMessage(result.error || "Failed to adjust leave balance", "error");
      }
    } catch (error) {
      console.error("Error adjusting leave balance:", error);
      showMessage("Failed to adjust leave balance", "error");
    }
  };

  const recalculateBalance = async (employeeId) => {
    try {
      const response = await fetch("/api/leave/balances/realtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          action: "recalculate",
          adminId: "admin",
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage("Leave balance recalculated successfully", "success");
        fetchLeaveBalances();
      } else {
        showMessage(
          result.error || "Failed to recalculate leave balance",
          "error"
        );
      }
    } catch (error) {
      console.error("Error recalculating leave balance:", error);
      showMessage("Failed to recalculate leave balance", "error");
    }
  };

  const exportLeaveBalances = async () => {
    try {
      const response = await fetch("/api/leave/balances/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: "csv",
          department: filters.department,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leave-balances-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage("Leave balances exported successfully", "success");
      } else {
        showMessage("Failed to export leave balances", "error");
      }
    } catch (error) {
      console.error("Error exporting leave balances:", error);
      showMessage("Failed to export leave balances", "error");
    }
  };

  const getEmployeeOverallUsagePct = (employee) => {
    const annual = employee?.balances?.annual || {};
    const totalAvailable = annual.available || 0;
    const totalUsed = annual.used || 0;
    const totalAll = totalAvailable + totalUsed;
    return totalAll > 0 ? Math.round((totalUsed / totalAll) * 100) : 0;
  };

  const lowCount = leaveBalances.filter(
    (emp) => (emp.balances?.annual?.available ?? 16) <= 4
  ).length;
  const mediumCount = leaveBalances.filter((emp) => {
    const avail = emp.balances?.annual?.available ?? 16;
    return avail > 4 && avail <= 10;
  }).length;
  const totalUsedDays = leaveBalances.reduce(
    (sum, emp) => sum + (emp.balances?.annual?.used || 0),
    0
  );

  const totalItems = leaveBalances.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedBalances = leaveBalances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              Leave Balance Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor employee annual leave balances (16 days standard) and usage across the organization
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Real-time</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Auto-refresh</span>
            </label>

            <button
              onClick={fetchLeaveBalances}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              onClick={exportLeaveBalances}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Live sync banner */}
        <div className="mt-4 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live sync enabled • 16 Days Standard Annual Leave</span>
          </div>
          <div>{totalItems} employees monitored</div>
        </div>

        {/* Filters */}
        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 mt-5">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.lowBalance}
                  onChange={(e) =>
                    setFilters({ ...filters, lowBalance: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Low balance (≤ 4 days)
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.highUsage}
                  onChange={(e) =>
                    setFilters({ ...filters, highUsage: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                High usage
              </label>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Filters apply immediately
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : messageType === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Employees
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {totalItems}
              </p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Low Balances
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {lowCount}
              </p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Medium Balances
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {mediumCount}
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 border-slate-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Days Used
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {totalUsedDays}
              </p>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <TrendingDown className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Employee Annual Leave Balances
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
            Standard 16 Days Entitlement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/75">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider min-w-[240px]">
                  Annual Leave Balance (16 Days)
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading leave balances...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBalances.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No leave balances found for the current filters.
                  </td>
                </tr>
              ) : (
                paginatedBalances.map((employee) => {
                  const annual = employee.balances?.annual || {
                    available: 16,
                    used: 0,
                    pending: 0,
                  };
                  const available = annual.available ?? 16;
                  const used = annual.used ?? 0;
                  const pending = annual.pending ?? 0;
                  const usagePct = Math.round((used / 16) * 100);

                  const status =
                    available <= 4
                      ? "Low"
                      : available <= 10
                      ? "Medium"
                      : "Good";

                  return (
                    <tr
                      key={employee.employeeId}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {employee.employee?.name || employee.employeeName || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {employee.employee?.email || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {employee.employee?.department || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-1.5 shadow-sm">
                          <span className="font-semibold text-emerald-950 text-xs">
                            Annual:
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded-lg font-bold text-emerald-700 border border-emerald-200/60 shadow-xs text-xs">
                            {available} / 16 Days
                          </span>
                          {used > 0 && (
                            <span className="text-amber-800 text-xs font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                              {used} used
                            </span>
                          )}
                          {pending > 0 && (
                            <span className="text-blue-800 text-xs font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                              {pending} pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {status === "Low" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                              Low ({available}d)
                            </span>
                          )}
                          {status === "Medium" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              Medium ({available}d)
                            </span>
                          )}
                          {status === "Good" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Good ({available}d)
                            </span>
                          )}
                          <span className="text-xs text-gray-500 font-medium">
                            {usagePct}% used
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setSelectedLeaveType("annual");
                              setShowAdjustmentModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Adjust Annual Leave"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setSelectedLeaveType("annual");
                              setShowViewModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Annual Leave Balance"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              recalculateBalance(employee.employeeId)
                            }
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Recalculate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 38, 50]}
        />
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Adjust Annual Leave Balance
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-black">
                    {selectedEmployee.employee?.name || "Unknown"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedEmployee.employee?.email || ""}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={adjustmentData.leaveType}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      leaveType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="annual">Annual Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days to Adjust
                </label>
                <input
                  type="number"
                  value={adjustmentData.days}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      days: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter positive or negative number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={adjustmentData.reason}
                  onChange={(e) =>
                    setAdjustmentData({
                      ...adjustmentData,
                      reason: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Enter reason for adjustment"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Balances Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-black flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  {selectedEmployee.employee?.name || "Employee"}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">Leave balances</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Leave Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Available
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Used
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployee.balances &&
                    Object.entries(selectedEmployee.balances).map(
                      ([leaveType, balance]) => (
                        <tr
                          key={leaveType}
                          className={
                            selectedLeaveType === leaveType
                              ? "bg-blue-50"
                              : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 capitalize font-medium text-black">
                            {leaveType}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                              {balance.available ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                              {balance.used ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700">
                              {balance.pending ?? 0}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
