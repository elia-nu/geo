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
  ArrowUpRight,
  Zap,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatWorkingHours } from "../utils/timeUtils";

export default function EmployeeDashboard({ employeeId, employeeName }) {
  const [todayRecord, setTodayRecord] = useState(null);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalDays: 7,
    presentDays: 0,
    absentDays: 0,
    averageHours: 0,
    attendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    if (employeeId) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [employeeId]);

  // Close notifications dropdown on outside click
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
        setRecentAttendance(recentResult.data.slice(0, 5));
      }

      // Calculate stats
      const totalDays = 7;
      const presentDays = recentResult.success
        ? recentResult.data.filter((record) => record.checkInTime).length
        : 0;
      const absentDays = Math.max(0, totalDays - presentDays);
      const averageHours =
        recentResult.success && recentResult.data.length > 0
          ? recentResult.data.reduce(
              (sum, record) => sum + (record.workingHours || 0),
              0
            ) / recentResult.data.length
          : 0;

      const attendanceRate = Math.round((presentDays / totalDays) * 100);

      setStats({
        totalDays,
        presentDays,
        absentDays,
        averageHours: Math.round(averageHours * 10) / 10,
        attendanceRate,
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
        text: "Not Clocked In",
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
        dotClass: "bg-slate-400",
      };
    if (todayRecord.checkOutTime)
      return {
        text: "Shift Completed",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    if (todayRecord.checkInTime)
      return {
        text: "Currently Working",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200",
        dotClass: "bg-blue-500 live-dot-blue",
      };
    return {
      text: "Pending Check-In",
      badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200",
      dotClass: "bg-amber-500",
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
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-blue-600 border-t-transparent animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">Loading employee workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10">
        {/* Subtle Background Pattern */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-60 h-60 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-medium text-blue-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot-green"></span>
              Real-time Geofenced Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {employeeName || "Employee"}! 👋
            </h1>
            <p className="text-blue-100/90 text-sm max-w-xl">
              Track your daily attendance, view project milestones, review leave balances, and stay up-to-date with company activities.
            </p>
          </div>

          {/* Clock & Notification Actions */}
          <div className="flex items-center gap-4 self-start md:self-auto bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-inner">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-96 overflow-hidden flex flex-col text-slate-800 dark:text-slate-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-sm">Notifications</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            !notification.isRead ? "bg-blue-50/60 dark:bg-blue-950/20" : ""
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
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                !notification.isRead
                                  ? "bg-blue-600"
                                  : "bg-transparent"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs">No notifications right now</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Clock */}
            <div className="text-right border-l border-white/20 pl-4">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-blue-200 text-xs font-medium">
                {currentTime.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Today's Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Shift Status
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`} />
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {status.text}
              </span>
            </div>
            
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>In: <strong className="text-slate-800 dark:text-slate-200">{formatTime(todayRecord?.checkInTime)}</strong></span>
              <span>Out: <strong className="text-slate-800 dark:text-slate-200">{formatTime(todayRecord?.checkOutTime)}</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Attendance Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {stats.attendanceRate}%
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                {stats.presentDays} of 7 days
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.attendanceRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Average Daily Hours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Avg Daily Hours
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {stats.averageHours}h
              </span>
              <span className="text-xs text-slate-500">
                / 8.0h target
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {todayRecord?.workingHours != null
                ? `Today: ${formatWorkingHours(todayRecord.workingHours)} logged`
                : "No active hours calculated yet"}
            </p>
          </div>
        </div>

        {/* Card 4: Compliance / Security */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              GPS Geofencing
            </span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Verified
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Site Protected
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Radius verification active for secure check-ins.
            </p>
          </div>
        </div>
      </div>

      {/* Action Hub & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel (1 column) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" /> Quick Actions
            </h2>
            <span className="text-xs text-slate-400">Direct Links</span>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => (window.location.href = "/employee-portal?section=attendance")}
              className="w-full group flex items-center justify-between p-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Clock in or check out now</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => (window.location.href = "/employee-portal?section=leave-requests")}
              className="w-full group flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-100 dark:border-emerald-900/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Apply For Leave</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Annual, sick, or personal</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => (window.location.href = "/employee-portal?section=overtime")}
              className="w-full group flex items-center justify-between p-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 border border-purple-100 dark:border-purple-900/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Overtime Hub</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Request and view OT hours</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => (window.location.href = "/employee-portal?section=documents")}
              className="w-full group flex items-center justify-between p-3 rounded-xl bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-100 dark:border-amber-900/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">My Documents</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Contracts, letters & IDs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Attendance Activity Table/Timeline (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Recent Attendance History
              </h2>
              <p className="text-xs text-slate-500">Your latest recorded check-in/out logs</p>
            </div>
            <button
              onClick={() => (window.location.href = "/employee-portal?section=attendance-history")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all logs <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentAttendance.length > 0 ? (
              recentAttendance.map((record, index) => (
                <div
                  key={index}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {new Date(record.date).toLocaleDateString([], { weekday: "short" })}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white leading-none">
                        {new Date(record.date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDate(record.date)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            record.checkInTime && record.checkOutTime
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : record.checkInTime
                              ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {record.checkInTime && record.checkOutTime
                            ? "Complete"
                            : record.checkInTime
                            ? "In Progress"
                            : "No Record"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> {formatTime(record.checkInTime)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                          <Clock className="w-3.5 h-3.5" /> {formatTime(record.checkOutTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold">
                      {formatWorkingHours(record)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No recent attendance records found</p>
                <p className="text-xs text-slate-400">Records will appear automatically when you clock in.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
