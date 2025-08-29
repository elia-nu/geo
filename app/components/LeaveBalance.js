"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  Users,
  CalendarDays,
} from "lucide-react";

export default function LeaveBalance({ employeeId, employeeName, isManager = false }) {
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchLeaveBalance();
  }, [employeeId]);

  const fetchLeaveBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leave/balances?employeeId=${employeeId}`);
      const result = await response.json();

      if (result.success) {
        setLeaveBalance(result.data);
      } else {
        showMessage(result.error || "Failed to load leave balance", "error");
      }
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      showMessage("Failed to load leave balance", "error");
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

  const calculateUsagePercentage = (used, available) => {
    const total = used + available;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  const getUsageStatus = (percentage) => {
    if (percentage >= 80) return "critical";
    if (percentage >= 60) return "warning";
    return "good";
  };

  const exportLeaveBalance = async () => {
    try {
      const response = await fetch("/api/leave/balances/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          format: "csv",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leave-balance-${employeeName}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage("Leave balance exported successfully", "success");
      } else {
        showMessage("Failed to export leave balance", "error");
      }
    } catch (error) {
      console.error("Error exporting leave balance:", error);
      showMessage("Failed to export leave balance", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!leaveBalance) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No leave balance found
        </h3>
        <p className="text-gray-600">
          Leave balance information is not available for this employee
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Balance</h1>
          <p className="text-gray-600 mt-1">
            Real-time leave accruals and balances for {employeeName}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLeaveBalance}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportLeaveBalance}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Years of Service</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalance.yearsOfService}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(leaveBalance.balances).reduce(
                  (sum, balance) => sum + balance.available,
                  0
                )}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CalendarDays className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(leaveBalance.balances).reduce(
                  (sum, balance) => sum + balance.used,
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
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(leaveBalance.balances).reduce(
                  (sum, balance) => sum + balance.pending,
                  0
                )}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Balance Details */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Leave Balance Details</span>
          </h2>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showDetails ? "Hide" : "Show"} Details</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(leaveBalance.balances).map(([leaveType, balance]) => {
            const Icon = getLeaveTypeIcon(leaveType);
            const usagePercentage = calculateUsagePercentage(balance.used, balance.available);
            const usageStatus = getUsageStatus(usagePercentage);

            return (
              <div
                key={leaveType}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedLeaveType(selectedLeaveType === leaveType ? null : leaveType)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getLeaveTypeColor(leaveType)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {balance.description}
                      </h3>
                      <p className="text-sm text-gray-600">{leaveType} Leave</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Available</span>
                    <span className="font-semibold text-green-600">
                      {balance.available} days
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Used</span>
                    <span className="font-semibold text-orange-600">
                      {balance.used} days
                    </span>
                  </div>

                  {balance.pending > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="font-semibold text-yellow-600">
                        {balance.pending} days
                      </span>
                    </div>
                  )}

                  {/* Usage Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Usage</span>
                      <span>{usagePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          usageStatus === "critical"
                            ? "bg-red-500"
                            : usageStatus === "warning"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Detailed Information */}
                  {showDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Total Earned:</span>
                        <span className="font-medium">{balance.totalEarned} days</span>
                      </div>
                      {balance.carriedForward > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Carried Forward:</span>
                          <span className="font-medium">{balance.carriedForward} days</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employment Information */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <span>Employment Information</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Employment Date</p>
            <p className="text-lg text-gray-900">
              {new Date(leaveBalance.employmentDate).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Years of Service</p>
            <p className="text-lg text-gray-900">{leaveBalance.yearsOfService} years</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Last Calculated</p>
            <p className="text-lg text-gray-900">
              {leaveBalance.lastCalculated 
                ? new Date(leaveBalance.lastCalculated).toLocaleString()
                : "Not available"
              }
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-600">Balance Status</p>
            <p className="text-lg text-gray-900">
              {leaveBalance.balances && Object.values(leaveBalance.balances).some(b => b.available > 0)
                ? "Active"
                : "No available leave"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Recent Adjustments */}
      {leaveBalance.adjustments && leaveBalance.adjustments.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <span>Recent Adjustments</span>
          </h2>
          
          <div className="space-y-3">
            {leaveBalance.adjustments.slice(-5).reverse().map((adjustment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {adjustment.leaveType} Leave
                  </p>
                  <p className="text-sm text-gray-600">{adjustment.reason}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    adjustment.adjustment > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {adjustment.adjustment > 0 ? '+' : ''}{adjustment.adjustment} days
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(adjustment.adjustedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
