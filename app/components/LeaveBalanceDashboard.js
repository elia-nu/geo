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
  BarChart3,
  Clock,
  Bell,
  Download,
  Settings,
} from "lucide-react";

export default function LeaveBalanceDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 60000); // Refresh every minute
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
  }, [autoRefresh]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/leave/balances/realtime?includeNotifications=true"
      );
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      } else {
        showMessage(result.error || "Failed to load dashboard data", "error");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showMessage("Failed to load dashboard data", "error");
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

  const getLeaveTypeStats = () => {
    if (!dashboardData?.balances) return {};

    const stats = {};
    const leaveTypes = [
      "annual",
      "sick",
      "personal",
      "maternity",
      "paternity",
      "bereavement",
    ];

    leaveTypes.forEach((type) => {
      stats[type] = {
        totalAvailable: 0,
        totalUsed: 0,
        totalPending: 0,
        employees: 0,
      };
    });

    dashboardData.balances.forEach((employee) => {
      Object.entries(employee.balances || {}).forEach(
        ([leaveType, balance]) => {
          if (stats[leaveType]) {
            stats[leaveType].totalAvailable += balance.available || 0;
            stats[leaveType].totalUsed += balance.used || 0;
            stats[leaveType].totalPending += balance.pending || 0;
            stats[leaveType].employees += 1;
          }
        }
      );
    });

    return stats;
  };

  const getNotificationStats = () => {
    if (!dashboardData?.notifications) return { high: 0, medium: 0, low: 0 };

    return dashboardData.notifications.reduce(
      (acc, notification) => {
        acc[notification.priority] = (acc[notification.priority] || 0) + 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
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

  const getLeaveTypeIcon = (leaveType) => {
    const icons = {
      annual: Calendar,
      sick: AlertCircle,
      personal: Users,
      maternity: TrendingUp,
      paternity: TrendingUp,
      bereavement: Clock,
    };
    return icons[leaveType] || Calendar;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No dashboard data available
        </h3>
        <p className="text-gray-600">
          Unable to load leave balance dashboard information
        </p>
      </div>
    );
  }

  const leaveStats = getLeaveTypeStats();
  const notificationStats = getNotificationStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Leave Balance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time overview of leave balances and system status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
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
            onClick={fetchDashboardData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
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

      {/* System Status */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">
              System Status: Operational
            </span>
          </div>
          <div className="text-sm text-green-600">
            Last updated:{" "}
            {dashboardData.lastUpdated
              ? new Date(dashboardData.lastUpdated).toLocaleTimeString()
              : "Just now"}
          </div>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Employees
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.totalEmployees}
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
              <p className="text-sm font-medium text-gray-600">
                Total Available Days
              </p>
              <p className="text-2xl font-bold text-green-600">
                {Object.values(leaveStats).reduce(
                  (sum, stat) => sum + stat.totalAvailable,
                  0
                )}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Used Days
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {Object.values(leaveStats).reduce(
                  (sum, stat) => sum + stat.totalUsed,
                  0
                )}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
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
                {Object.values(leaveStats).reduce(
                  (sum, stat) => sum + stat.totalPending,
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

      {/* Notifications Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Bell className="w-6 h-6 text-blue-600" />
          <span>Notifications Overview</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">
                  High Priority
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {notificationStats.high}
                </p>
              </div>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Medium Priority
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {notificationStats.medium}
                </p>
              </div>
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Low Priority
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {notificationStats.low}
                </p>
              </div>
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Type Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>Leave Type Statistics</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(leaveStats).map(([leaveType, stats]) => {
            const Icon = getLeaveTypeIcon(leaveType);
            const totalDays = stats.totalAvailable + stats.totalUsed;
            const usagePercentage =
              totalDays > 0
                ? Math.round((stats.totalUsed / totalDays) * 100)
                : 0;

            return (
              <div
                key={leaveType}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getLeaveTypeColor(
                        leaveType
                      )}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {leaveType} Leave
                      </h3>
                      <p className="text-sm text-gray-600">
                        {stats.employees} employees
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Available</span>
                    <span className="font-semibold text-green-600">
                      {stats.totalAvailable} days
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Used</span>
                    <span className="font-semibold text-orange-600">
                      {stats.totalUsed} days
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="font-semibold text-yellow-600">
                      {stats.totalPending} days
                    </span>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Usage</span>
                      <span>{usagePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          usagePercentage >= 80
                            ? "bg-red-500"
                            : usagePercentage >= 60
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Notifications */}
      {dashboardData.notifications &&
        dashboardData.notifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <span>Recent Notifications</span>
            </h2>

            <div className="space-y-3">
              {dashboardData.notifications
                .slice(0, 5)
                .map((notification, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      notification.priority === "high"
                        ? "bg-red-50 border-red-200"
                        : notification.priority === "medium"
                        ? "bg-orange-50 border-orange-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {notification.message}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notification.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : notification.priority === "medium"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {notification.priority}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(
                            notification.createdAt
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}
