"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  User,
  MapPin,
  Camera,
  FileText,
  History,
  Bell,
} from "lucide-react";
import { formatWorkingHours } from "../utils/timeUtils";

export default function EmployeeDashboard({ employeeId, employeeName }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    averageHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    if (employeeId) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [employeeId]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifications &&
        !event.target.closest(".notification-dropdown") &&
        !event.target.closest("button[title='Notifications']")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const todayResponse = await fetch(
        `/api/attendance/daily?employeeId=${employeeId}&date=${today}`
      );
      const todayResult = await todayResponse.json();

      if (todayResult.success && todayResult.data.length > 0) {
        setTodayRecord(todayResult.data[0]);
      }

      // Fetch recent attendance (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startDate = weekAgo.toISOString().split("T")[0];

      const recentResponse = await fetch(
        `/api/attendance/daily?employeeId=${employeeId}&startDate=${startDate}&endDate=${today}`
      );
      const recentResult = await recentResponse.json();

      if (recentResult.success) {
        setRecentAttendance(recentResult.data.slice(0, 5)); // Last 5 records
      }

      // Calculate stats (simplified for now)
      const totalDays = 7;
      const presentDays = recentResult.success
        ? recentResult.data.filter((record) => record.checkInTime).length
        : 0;
      const absentDays = totalDays - presentDays;
      const averageHours =
        recentResult.success && recentResult.data.length > 0
          ? recentResult.data.reduce(
              (sum, record) => sum + (record.workingHours || 0),
              0
            ) / recentResult.data.length
          : 0;

      setStats({
        totalDays,
        presentDays,
        absentDays,
        averageHours: Math.round(averageHours * 100) / 100,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `/api/notifications/employee?employeeId=${employeeId}&status=all&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      const response = await fetch("/api/notifications/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          notificationIds: Array.isArray(notificationIds)
            ? notificationIds
            : [notificationIds],
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          markAllAsRead: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getStatusDisplay = () => {
    if (!todayRecord)
      return {
        text: "Not Started",
        color: "text-gray-500",
        bgColor: "bg-gray-100",
      };
    if (todayRecord.checkOutTime)
      return {
        text: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (todayRecord.checkInTime)
      return {
        text: "Working",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    return {
      text: "Pending",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    };
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const status = getStatusDisplay();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome back, {employeeName}!
            </h1>
            <p className="text-blue-100 mt-1 text-sm sm:text-base">
              Here's your work status overview
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-blue-500 transition-colors"
                title="Notifications"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h3 className="font-semibold text-black">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.isRead ? "bg-blue-50" : ""
                          }`}
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsRead(notification._id);
                            }
                            if (notification.actionUrl) {
                              window.location.href = notification.actionUrl;
                            }
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                !notification.isRead
                                  ? "bg-blue-600"
                                  : "bg-transparent"
                              }`}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-black text-sm">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              {notification.task && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Task: {notification.task.title}
                                </p>
                              )}
                              {notification.project && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Project: {notification.project.name}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(
                                  notification.createdAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold">
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="text-blue-100 text-xs sm:text-sm">
                {new Date().toLocaleDateString([], {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Today's Status
              </h3>
              <p className="text-sm text-gray-600">Current work status</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
              >
                {status.text}
              </span>
            </div>
            {todayRecord?.checkInTime && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium">
                  {formatTime(todayRecord.checkInTime)}
                </span>
              </div>
            )}
            {todayRecord?.checkOutTime && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium">
                  {formatTime(todayRecord.checkOutTime)}
                </span>
              </div>
            )}
            {todayRecord?.workingHours != null && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hours:</span>
                <span className="font-semibold text-indigo-700">{formatWorkingHours(todayRecord.workingHours)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                This Week
              </h3>
              <p className="text-sm text-gray-600">Attendance summary</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Present:</span>
              <span className="font-medium text-green-600">
                {stats.presentDays} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Absent:</span>
              <span className="font-medium text-red-600">
                {stats.absentDays} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Hours:</span>
              <span className="font-medium">{stats.averageHours}h</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Quick Actions
              </h3>
              <p className="text-sm text-gray-600">Common tasks</p>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={() =>
                (window.location.href = "/employee-portal?section=attendance")
              }
              className="w-full flex items-center space-x-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Clock className="w-5 h-5" />
              <span className="font-medium">Record Attendance</span>
            </button>
            <button
              onClick={() =>
                (window.location.href =
                  "/employee-portal?section=leave-requests")
              }
              className="w-full flex items-center space-x-3 p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Request Leave</span>
            </button>
            <button
              onClick={() =>
                (window.location.href = "/employee-portal?section=documents")
              }
              className="w-full flex items-center space-x-3 p-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-orange-100 p-2 rounded-lg">
            <History className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
              Recent Attendance
            </h3>
            <p className="text-sm text-gray-600">Last 5 days</p>
          </div>
        </div>

        <div className="space-y-4">
          {recentAttendance.length > 0 ? (
            recentAttendance.map((record, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-black">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(record.date).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {record.checkInTime && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {formatTime(record.checkInTime)}
                        </span>
                      </div>
                    )}
                    {record.checkOutTime && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {formatTime(record.checkOutTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-indigo-700">
                    {formatWorkingHours(record)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.checkInTime && record.checkOutTime
                      ? "Complete"
                      : "Partial"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No recent attendance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
