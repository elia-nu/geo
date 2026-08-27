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
    leaveType: "",
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

  useEffect(() => {
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
      !adjustmentData.leaveType ||
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
          leaveType: adjustmentData.leaveType,
          days: adjustmentData.days,
          reason: adjustmentData.reason,
          adminId: "admin",
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage("Leave balance adjusted successfully", "success");
        setShowAdjustmentModal(false);
        setAdjustmentData({ leaveType: "", days: 0, reason: "" });
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
    const entries = Object.values(employee?.balances || {});
    const totalAvailable = entries.reduce(
      (sum, b) => sum + (b.available || 0),
      0
    );
    const totalUsed = entries.reduce((sum, b) => sum + (b.used || 0), 0);
    const totalAll = totalAvailable + totalUsed;
    return totalAll > 0 ? Math.round((totalUsed / totalAll) * 100) : 0;
  };

  const lowCount = leaveBalances.filter(
    (emp) => getEmployeeOverallUsagePct(emp) >= 75
  ).length;
  const mediumCount = leaveBalances.filter((emp) => {
    const pct = getEmployeeOverallUsagePct(emp);
    return pct >= 50 && pct < 75;
  }).length;
  const totalUsedDays = leaveBalances.reduce(
    (sum, emp) =>
      sum +
      Object.values(emp.balances || {}).reduce(
        (empSum, balance) => empSum + (balance.used || 0),
        0
      ),
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Leave Balance Management
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Monitor employee leave balances and usage across the organization
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Real-time
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchLeaveBalances}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportLeaveBalances}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {realTimeMode && (
          <div className="mt-4 flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Live sync enabled</span>
            </div>
            <span className="text-emerald-700">
              {leaveBalances.length} employees monitored
            </span>
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-sm border ${
            messageType === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : messageType === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message}
        </div>
      )}

      {/* Filters + KPIs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <label
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                filters.lowBalance
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={filters.lowBalance}
                onChange={(e) =>
                  setFilters({ ...filters, lowBalance: e.target.checked })
                }
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              Low balance
            </label>
            <label
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                filters.highUsage
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={filters.highUsage}
                onChange={(e) =>
                  setFilters({ ...filters, highUsage: e.target.checked })
                }
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              High usage
            </label>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            Filters apply immediately
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Employees
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                {leaveBalances.length}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Low Balances
              </p>
              <p className="text-2xl font-bold text-black mt-1">{lowCount}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Medium Usage
              </p>
              <p className="text-2xl font-bold text-black mt-1">{mediumCount}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-slate-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Days Used
              </p>
              <p className="text-2xl font-bold text-black mt-1">
                {totalUsedDays}
              </p>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-black">
            Employee Leave Balances
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-[280px]">
                  Balances
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaveBalances.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    No leave balances found for the current filters.
                  </td>
                </tr>
              ) : (
                leaveBalances.map((employee) => {
                  const balanceEntries = Object.values(
                    employee.balances || {}
                  );
                  const totalAvailable = balanceEntries.reduce(
                    (sum, b) => sum + (b.available || 0),
                    0
                  );
                  const totalUsed = balanceEntries.reduce(
                    (sum, b) => sum + (b.used || 0),
                    0
                  );
                  const totalAll = totalAvailable + totalUsed;
                  const overallUsagePct =
                    totalAll > 0
                      ? Math.round((totalUsed / totalAll) * 100)
                      : 0;
                  const overallStatus =
                    overallUsagePct >= 75
                      ? "Low"
                      : overallUsagePct >= 50
                      ? "Medium"
                      : "Good";

                  return (
                    <tr
                      key={employee.employeeId}
                      className="hover:bg-gray-50 align-top"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-black">
                          {employee.employee?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {employee.employee?.email || ""}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {employee.employee?.department || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {employee.balances ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(employee.balances).map(
                              ([leaveType, balance]) => (
                                <button
                                  key={leaveType}
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setSelectedLeaveType(leaveType);
                                    setShowViewModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                  title={`View ${leaveType} details`}
                                >
                                  <span className="capitalize font-medium text-gray-700">
                                    {leaveType}
                                  </span>
                                  <span className="text-emerald-700 font-semibold">
                                    {balance.available}
                                  </span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-amber-700">
                                    {balance.used}u
                                  </span>
                                  {balance.pending > 0 && (
                                    <span className="text-yellow-700">
                                      ·{balance.pending}p
                                    </span>
                                  )}
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {overallStatus === "Low" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                              Low balance
                            </span>
                          )}
                          {overallStatus === "Medium" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              Medium usage
                            </span>
                          )}
                          {overallStatus === "Good" && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Good
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {overallUsagePct}% used
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setSelectedLeaveType(null);
                              setShowViewModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Balances"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              recalculateBalance(employee.employeeId)
                            }
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
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
      </div>

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-black flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Adjust Leave Balance
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
