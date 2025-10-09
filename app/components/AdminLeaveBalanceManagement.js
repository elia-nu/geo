"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Settings,
  Bell,
  BarChart3,
  Clock,
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

  // Load departments once for the filter dropdown
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
          adminId: "admin", // In real app, get from auth context
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

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      annual: "bg-blue-100 text-blue-800",
      sick: "bg-red-100 text-red-800",
      personal: "bg-purple-100 text-purple-800",
      maternity: "bg-pink-100 text-pink-800",
      paternity: "bg-indigo-100 text-indigo-800",
      bereavement: "bg-gray-100 text-gray-800",
    };
    return colors[leaveType] || "bg-gray-100 text-gray-800";
  };

  const calculateUsagePercentage = (used, available) => {
    const total = used + available;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getUsageStatus = (percentage) => {
    if (percentage >= 80) return "critical";
    if (percentage >= 60) return "warning";
    return "good";
  };

  // Helper to compute overall usage percentage for an employee across all leave types
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-4 mb-3">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Users className="w-8 h-8" />
                  </div>
                  Leave Balance Management
                </h1>
                <p className="text-blue-100 text-xl">
                  Real-time monitoring • Advanced analytics • Smart insights
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <label className="flex items-center space-x-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={realTimeMode}
                      onChange={(e) => setRealTimeMode(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-white/30 bg-white/20 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Real-time</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-white/30 bg-white/20 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Auto-refresh</span>
                  </label>
                </div>
                <button
                  onClick={fetchLeaveBalances}
                  className="flex items-center space-x-2 px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all duration-300 backdrop-blur-sm border border-white/20"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="font-medium">Refresh</span>
                </button>
                <button
                  onClick={exportLeaveBalances}
                  className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 font-semibold shadow-lg"
                >
                  <Download className="w-5 h-5" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-6 rounded-2xl flex items-center space-x-3 shadow-lg border-l-4 ${
              messageType === "success"
                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-500"
                : messageType === "error"
                ? "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-500"
                : "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border-blue-500"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : messageType === "error" ? (
              <AlertCircle className="w-6 h-6 text-red-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-blue-600" />
            )}
            <span className="font-medium text-lg">{message}</span>
          </div>
        )}

        {/* Real-time Status */}
        {realTimeMode && (
          <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 border border-emerald-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <div>
                  <span className="text-lg font-semibold text-emerald-800">
                    Real-time Mode Active
                  </span>
                  <p className="text-sm text-emerald-600">
                    Live data synchronization enabled
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-700">
                  {leaveBalances.length}
                </div>
                <div className="text-sm text-emerald-600">
                  employees monitored
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3 text-gray-800">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <span>Smart Filters</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-4">
              <label className="flex items-center space-x-3 text-gray-700 p-3 bg-red-50 rounded-xl border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.lowBalance}
                  onChange={(e) =>
                    setFilters({ ...filters, lowBalance: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-2 border-red-300 text-red-600 focus:ring-red-500"
                />
                <span className="font-medium">Low Balance Alert</span>
              </label>
              <label className="flex items-center space-x-3 text-gray-700 p-3 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.highUsage}
                  onChange={(e) =>
                    setFilters({ ...filters, highUsage: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-2 border-orange-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="font-medium">High Usage Alert</span>
              </label>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Total Employees
                </p>
                <p className="text-4xl font-bold">{leaveBalances.length}</p>
                <p className="text-blue-200 text-xs mt-1">Active workforce</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Low Balances</p>
                <p className="text-4xl font-bold">
                  {
                    leaveBalances.filter(
                      (emp) => getEmployeeOverallUsagePct(emp) >= 75
                    ).length
                  }
                </p>
                <p className="text-red-200 text-xs mt-1">Need attention</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">
                  Medium Usage
                </p>
                <p className="text-4xl font-bold">
                  {
                    leaveBalances.filter((emp) => {
                      const pct = getEmployeeOverallUsagePct(emp);
                      return pct >= 50 && pct < 75;
                    }).length
                  }
                </p>
                <p className="text-orange-200 text-xs mt-1">Monitor closely</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Total Leave Usage
                </p>
                <p className="text-4xl font-bold">
                  {leaveBalances.reduce(
                    (sum, emp) =>
                      sum +
                      Object.values(emp.balances || {}).reduce(
                        (empSum, balance) => empSum + (balance.used || 0),
                        0
                      ),
                    0
                  )}
                </p>
                <p className="text-purple-200 text-xs mt-1">Days used</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <TrendingDown className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Employee Leave Balances */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <h2 className="text-3xl font-bold mb-8 flex items-center space-x-4 text-gray-800">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <span>Employee Leave Balances</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                    Employee
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                    Department
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                    Balances (Summary)
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaveBalances.map((employee) => {
                  const annualBalance = employee.balances?.annual;
                  const sickBalance = employee.balances?.sick;
                  const personalBalance = employee.balances?.personal;

                  const balanceEntries = Object.values(employee.balances || {});
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
                    totalAll > 0 ? Math.round((totalUsed / totalAll) * 100) : 0;
                  const overallStatus =
                    overallUsagePct >= 75
                      ? "Low"
                      : overallUsagePct >= 50
                      ? "Medium"
                      : "Good";

                  return (
                    <tr
                      key={employee.employeeId}
                      className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300"
                    >
                      <td className="py-6 px-6">
                        <div>
                          <div className="font-bold text-gray-800 text-lg">
                            {employee.employee?.name || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-600">
                            {employee.employee?.email || ""}
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {employee.employee?.department || "N/A"}
                        </span>
                      </td>
                      <td className="py-6 px-6">
                        <div className="text-sm space-y-2">
                          {employee.balances ? (
                            Object.entries(employee.balances).map(
                              ([leaveType, balance]) => (
                                <button
                                  key={leaveType}
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setSelectedLeaveType(leaveType);
                                    setShowViewModal(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedEmployee(employee);
                                      setSelectedLeaveType(leaveType);
                                      setShowViewModal(true);
                                    }
                                  }}
                                  className="flex w-full justify-start items-center gap-3 rounded-xl px-4 py-3 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-2 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-lg focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all duration-300 transform hover:scale-105"
                                  title={`View ${leaveType} details`}
                                  aria-label={`View ${leaveType} balance details for ${
                                    employee.employee?.name || "employee"
                                  }`}
                                >
                                  <span className="capitalize px-3 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 font-medium">
                                    {leaveType}
                                  </span>
                                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300 font-medium">
                                    {balance.available} avail
                                  </span>
                                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border border-orange-300 font-medium">
                                    {balance.used} used
                                  </span>
                                  {balance.pending > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-300 font-medium">
                                      {balance.pending} pending
                                    </span>
                                  )}
                                </button>
                              )
                            )
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex items-center space-x-3">
                          {overallStatus === "Low" && (
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
                              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                              Low Balance
                            </span>
                          )}
                          {overallStatus === "Medium" && (
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg">
                              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                              Medium Usage
                            </span>
                          )}
                          {overallStatus === "Good" && (
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                              Good Balance
                            </span>
                          )}
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-800">
                              {overallUsagePct}%
                            </div>
                            <div className="text-xs text-gray-500">used</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setSelectedLeaveType(null);
                              setShowViewModal(true);
                            }}
                            className="p-3 text-blue-600 hover:text-white bg-blue-50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-blue-600 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg"
                            title="View Balances"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              recalculateBalance(employee.employeeId)
                            }
                            className="p-3 text-green-600 hover:text-white bg-green-50 hover:bg-gradient-to-r hover:from-green-500 hover:to-green-600 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-md hover:shadow-lg"
                            title="Recalculate"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjustment Modal */}
        {showAdjustmentModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                    <Edit className="w-6 h-6 text-white" />
                  </div>
                  Adjust Leave Balance
                </h3>
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Employee
                  </label>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="text-lg font-bold text-gray-800">
                      {selectedEmployee.employee?.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedEmployee.employee?.email || ""}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="">Select Leave Type</option>
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="paternity">Paternity Leave</option>
                    <option value="bereavement">Bereavement Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter positive or negative number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    rows="3"
                    placeholder="Enter reason for adjustment"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 mt-8">
                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustment}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Adjustment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Balances Modal */}
        {showViewModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-4xl border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold text-gray-800 flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div>{selectedEmployee.employee?.name || "Employee"}</div>
                    <div className="text-lg font-normal text-gray-600">
                      Leave Balances
                    </div>
                  </div>
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                        Leave Type
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                        Available
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                        Used
                      </th>
                      <th className="text-left py-4 px-6 font-bold text-gray-800 text-lg">
                        Pending
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmployee.balances &&
                      Object.entries(selectedEmployee.balances).map(
                        ([leaveType, balance]) => (
                          <tr
                            key={leaveType}
                            className={`border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 ${
                              selectedLeaveType === leaveType
                                ? "bg-gradient-to-r from-blue-50 to-purple-50"
                                : ""
                            }`}
                          >
                            <td className="py-6 px-6 capitalize text-gray-800 font-semibold text-lg">
                              {leaveType}
                            </td>
                            <td className="py-6 px-6">
                              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300 font-bold text-lg">
                                {balance.available ?? 0}
                              </span>
                            </td>
                            <td className="py-6 px-6">
                              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 border-2 border-orange-300 font-bold text-lg">
                                {balance.used ?? 0}
                              </span>
                            </td>
                            <td className="py-6 px-6">
                              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-2 border-yellow-300 font-bold text-lg">
                                {balance.pending ?? 0}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end mt-8">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-8 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
