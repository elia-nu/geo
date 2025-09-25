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
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Leave Balance Management
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time leave balance monitoring and management for all employees
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={realTimeMode}
                onChange={(e) => setRealTimeMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Real-time</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Auto-refresh</span>
            </label>
          </div>
          <button
            onClick={fetchLeaveBalances}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLeaveBalances}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : messageType === "error"
              ? "bg-red-100 text-red-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : messageType === "error" ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Real-time Status */}
      {realTimeMode && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">
                Real-time Mode Active
              </span>
            </div>
            <div className="text-sm text-blue-600">
              Monitoring {leaveBalances.length} employees
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>Filters</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters({ ...filters, department: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.lowBalance}
                onChange={(e) =>
                  setFilters({ ...filters, lowBalance: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Low Balance Only</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.highUsage}
                onChange={(e) =>
                  setFilters({ ...filters, highUsage: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">High Usage Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Employees
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalances.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Balances</p>
              <p className="text-2xl font-bold text-red-600">
                {
                  leaveBalances.filter((emp) =>
                    Object.values(emp.balances).some(
                      (balance) => balance.available <= 2
                    )
                  ).length
                }
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Usage</p>
              <p className="text-2xl font-bold text-orange-600">
                {
                  leaveBalances.filter((emp) =>
                    Object.values(emp.balances).some(
                      (balance) =>
                        calculateUsagePercentage(
                          balance.used,
                          balance.available
                        ) >= 80
                    )
                  ).length
                }
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Requests
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {leaveBalances.reduce(
                  (sum, emp) =>
                    sum +
                    Object.values(emp.balances).reduce(
                      (empSum, balance) => empSum + balance.pending,
                      0
                    ),
                  0
                )}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee Leave Balances */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>Employee Leave Balances</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Employee
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Department
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Annual
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Sick
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Personal
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {leaveBalances.map((employee) => {
                const annualBalance = employee.balances?.annual;
                const sickBalance = employee.balances?.sick;
                const personalBalance = employee.balances?.personal;

                const hasLowBalance = Object.values(
                  employee.balances || {}
                ).some((balance) => balance.available <= 2);
                const hasHighUsage = Object.values(
                  employee.balances || {}
                ).some(
                  (balance) =>
                    calculateUsagePercentage(balance.used, balance.available) >=
                    80
                );

                return (
                  <tr
                    key={employee.employeeId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.employee?.name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.employee?.email || ""}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {employee.employee?.department || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {annualBalance ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {annualBalance.available} days
                          </div>
                          <div className="text-gray-500">
                            {annualBalance.used} used
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sickBalance ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {sickBalance.available} days
                          </div>
                          <div className="text-gray-500">
                            {sickBalance.used} used
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {personalBalance ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {personalBalance.available} days
                          </div>
                          <div className="text-gray-500">
                            {personalBalance.used} used
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {hasLowBalance && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Low Balance
                          </span>
                        )}
                        {hasHighUsage && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            High Usage
                          </span>
                        )}
                        {!hasLowBalance && !hasHighUsage && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Good
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowAdjustmentModal(true);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                          title="Adjust Balance"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            recalculateBalance(employee.employeeId)
                          }
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Recalculate"
                        >
                          <RefreshCw className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adjust Leave Balance</h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee
                </label>
                <div className="text-sm text-gray-900">
                  {selectedEmployee.employee?.name || "Unknown"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter positive or negative number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter reason for adjustment"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
