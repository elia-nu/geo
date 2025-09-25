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
} from "lucide-react";

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

  useEffect(() => {
    fetchDashboardData();
  }, [employeeId]);

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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {employeeName}!
            </h1>
            <p className="text-blue-100 mt-1">
              Here's your work status overview
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-blue-100 text-sm">
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

      {/* Today's Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
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
            {todayRecord?.workingHours && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Hours:</span>
                <span className="font-medium">{todayRecord.workingHours}h</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">This Week</h3>
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Quick Actions
              </h3>
              <p className="text-sm text-gray-600">Common tasks</p>
            </div>
          </div>
          <div className="space-y-3">
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-orange-100 p-2 rounded-lg">
            <History className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
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
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
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
                  <div className="text-sm font-medium text-gray-900">
                    {record.workingHours ? `${record.workingHours}h` : "N/A"}
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
