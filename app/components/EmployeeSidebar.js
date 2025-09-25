"use client";

import React, { useState } from "react";
import {
  Clock,
  Calendar,
  FileText,
  User,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  History,
  Upload,
  Settings,
  BarChart3,
} from "lucide-react";

export default function EmployeeSidebar({
  activeSection,
  onSectionChange,
  employeeName,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      description: "Overview of your work status",
    },
    {
      id: "attendance",
      label: "Daily Attendance",
      icon: Clock,
      description: "Check in/out and record attendance",
    },
    {
      id: "attendance-history",
      label: "Attendance History",
      icon: History,
      description: "View your past attendance records",
    },
    {
      id: "leave-requests",
      label: "Leave Requests",
      icon: Calendar,
      description: "Submit and track leave requests",
    },
    {
      id: "leave-balance",
      label: "Leave Balance",
      icon: BarChart3,
      description: "View your leave balances and accruals",
    },
    {
      id: "documents",
      label: "Documents",
      icon: FileText,
      description: "Upload and manage documents",
    },
    {
      id: "requests-status",
      label: "Request Status",
      icon: AlertCircle,
      description: "Check approval/rejection status",
    },
    {
      id: "profile",
      label: "My Profile",
      icon: User,
      description: "View and update your profile",
    },
  ];

  const handleLogout = () => {
    // Clear employee session
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employeeData");
    window.location.href = "/employee-login";
  };

  return (
    <div
      className={`absolute left-0 top-0 h-full bg-white border-r border-gray-200 shadow-md transition-all duration-300 z-40 ${isCollapsed ? "w-16" : "w-64"}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Employee Portal
              </h2>
              <p className="text-sm text-gray-600 truncate">{employeeName}</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isCollapsed
                    ? "M13 5l7 7-7 7M5 5l7 7-7 7"
                    : "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              />
              {!isCollapsed && (
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {/* <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div> */}
    </div>
  );
}
