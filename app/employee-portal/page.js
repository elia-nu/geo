"use client";

import React, { useState, useEffect } from "react";
import EmployeeSidebar from "../components/EmployeeSidebar";
import { useSidebarStore } from "../components/useSidebarStore";
import EmployeeDashboard from "../components/EmployeeDashboard";
import DailyAttendance from "../components/DailyAttendance";
import EmployeeAttendanceHistory from "../components/EmployeeAttendanceHistory";
import EmployeeLeaveRequest from "../components/EmployeeLeaveRequest";
import LeaveBalance from "../components/LeaveBalance";
import AttendanceDocuments from "../components/AttendanceDocuments";
import EmployeeRequestStatus from "../components/EmployeeRequestStatus";
import EmployeeProjects from "../components/EmployeeProjects";
import EmployeeTasks from "../components/EmployeeTasks";
import EmployeeMilestones from "../components/EmployeeMilestones";
import EmployeeProfile from "../components/EmployeeProfile";
import EmployeeOvertime from "../components/EmployeeOvertime";
import { MapPin, Navigation, CheckCircle, Menu, X, Bell } from "lucide-react";

export default function EmployeePortal() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const [employeeData, setEmployeeData] = useState(null);
  const [workLocations, setWorkLocations] = useState([]);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check for URL parameters to set initial section
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get("section");
      if (section) {
        setActiveSection(section);
      }
    }
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogout = () => {
    try {
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("employeeData");
    } catch {}
    window.location.href = "/employee-login";
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem("employeeToken");
      const storedData = localStorage.getItem("employeeData");

      if (!token || !storedData) {
        window.location.href = "/employee-login";
        return;
      }

      const employee = JSON.parse(storedData);
      console.log("Employee data from localStorage:", employee);

      // Fetch fresh employee data from the database to get latest work locations
      const employeeId = employee._id || employee.id;

      if (!employeeId) {
        setError("Invalid employee data. Please login again.");
        return;
      }

      // Set initial employee data
      setEmployeeData(employee);

      // If employee already has workLocations from localStorage, use them initially
      if (employee.workLocations && employee.workLocations.length > 0) {
        // For now, just set the IDs - we'll fetch full location details
        setWorkLocations([]);
        await fetchWorkLocationsForEmployee(employee);
      }

      // Always fetch fresh data from database to ensure we have the latest
      await fetchLatestEmployeeData(employeeId);

      // Fetch notifications
      if (employeeId) {
        await fetchNotifications(employeeId);
        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
          fetchNotifications(employeeId);
        }, 30000);
        // Store interval ID for cleanup
        window.notificationInterval = interval;
      }

      setLoading(false);
    } catch (error) {
      console.error("Authentication error:", error);
      setError("Authentication failed. Please login again.");
      setLoading(false);
    }
  };

  const fetchLatestEmployeeData = async (employeeId) => {
    try {
      // Fetch the latest employee data from the database
      const response = await fetch(`/api/employee/${employeeId}`);
      const result = await response.json();

      if (result.success && result.employee) {
        const latestEmployee = result.employee;
        // Update employee data
        setEmployeeData(latestEmployee);

        // Update localStorage with fresh data
        localStorage.setItem("employeeData", JSON.stringify(latestEmployee));

        // Fetch work locations for the employee
        await fetchWorkLocationsForEmployee(latestEmployee);
      } else {
        console.error("Failed to fetch employee data:", result.error);
        setError("Failed to load employee data. Please login again.");
      }
    } catch (error) {
      console.error("Error fetching latest employee data:", error);
      setError("Failed to load employee data. Please login again.");
    }
  };

  const fetchWorkLocationsForEmployee = async (employee) => {
    try {
      // Check for work locations in different possible formats
      let locationIds = [];

      // New format: workLocations array
      if (employee.workLocations && Array.isArray(employee.workLocations)) {
        locationIds = employee.workLocations;
      }
      // Old format: single workLocation object
      else if (employee.workLocation && employee.workLocation._id) {
        locationIds = [employee.workLocation._id];
      }
      // Check in personalDetails
      else if (
        employee.personalDetails?.workLocation &&
        employee.personalDetails.workLocation._id
      ) {
        locationIds = [employee.personalDetails.workLocation._id];
      }

      if (locationIds.length === 0) {
        setWorkLocations([]);
        return;
      }

      // Fetch all work locations
      const response = await fetch("/api/work-locations");
      const result = await response.json();

      if (
        result.success &&
        result.locations &&
        Array.isArray(result.locations)
      ) {
        // Filter locations that belong to this employee
        // Convert both locationIds and location._id to strings for comparison
        const employeeLocations = result.locations.filter((location) => {
          const locationIdStr = location._id.toString();
          const hasMatch = locationIds.some(
            (id) => id.toString() === locationIdStr
          );
          return hasMatch;
        });

        setWorkLocations(employeeLocations);
      } else {
        console.error(
          "Failed to fetch work locations or invalid response:",
          result
        );
        setWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching work locations:", error);
      setWorkLocations([]);
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("section", section);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const handleSectionChangeWithClose = (section) => {
    handleSectionChange(section);
    setMobileMenuOpen(false);
  };

  const fetchNotifications = async (employeeId) => {
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
    if (!employeeData?._id) return;
    try {
      const response = await fetch("/api/notifications/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeData._id,
          notificationIds: Array.isArray(notificationIds)
            ? notificationIds
            : [notificationIds],
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchNotifications(employeeData._id);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!employeeData?._id) return;
    try {
      const response = await fetch("/api/notifications/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeData._id,
          markAllAsRead: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchNotifications(employeeData._id);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (window.notificationInterval) {
        clearInterval(window.notificationInterval);
      }
    };
  }, []);

  const renderActiveSection = () => {
    if (!employeeData) return null;

    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <EmployeeDashboard
              employeeId={employeeData._id}
              employeeName={employeeData.name}
            />
          </div>
        );
      case "attendance":
        return (
          <EnhancedDailyAttendance
            employeeId={employeeData._id}
            employeeName={employeeData.name}
            employeeData={employeeData}
            workLocations={workLocations}
          />
        );
      case "attendance-history":
        return (
          <EmployeeAttendanceHistory
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "overtime":
        return (
          <EmployeeOvertime
            employeeId={employeeData._id || employeeData.id}
            employeeName={employeeData.name}
            workLocations={workLocations}
          />
        );
      case "leave-requests":
        return (
          <EmployeeLeaveRequest
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "leave-balance":
        return (
          <LeaveBalance
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "documents":
        return (
          <AttendanceDocuments
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "requests-status":
        return (
          <EmployeeRequestStatus
            employeeId={employeeData._id}
            employeeName={employeeData.name}
          />
        );
      case "profile":
        return (
          <EmployeeProfile
            employeeData={employeeData}
            workLocations={workLocations}
          />
        );
      case "projects":
        return <EmployeeProjects employeeId={employeeData._id} />;
      case "tasks":
        return <EmployeeTasks employeeId={employeeData._id} />;
      case "milestones":
        return <EmployeeMilestones employeeId={employeeData._id} />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a section from the sidebar</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => (window.location.href = "/employee-login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  if (!employeeData) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Employee Sidebar (desktop) */}
      <div className="hidden md:block">
        <EmployeeSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          employeeName={employeeData.name}
        />
      </div>

      {/* Main Content - offset for fixed sidebar on md+ screens */}
      <div
        className={`flex-1 overflow-auto transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        {/* Top bar with glassmorphic styling */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
            {/* Mobile menu button and Section Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden inline-flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  <span>Portal</span>
                  <span>/</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold capitalize">
                    {activeSection.replace("-", " ")}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white capitalize tracking-tight">
                  {activeSection.replace("-", " ")}
                </h1>
              </div>
            </div>

            {/* Right side actions & User Status */}
            <div className="flex items-center gap-3">
              {/* Geofence verification indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot-green"></span>
                <span>Geofence Active</span>
              </div>

              {/* Department pill */}
              {employeeData?.department && (
                <div className="hidden lg:block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {employeeData.department}
                </div>
              )}

              {/* Notification Bell */}
              {employeeData?._id && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute 1 top-1 right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="notification-dropdown absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-96 overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification._id}
                              className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                                !notification.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
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
                              <div className="flex items-start gap-2.5">
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
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                    {notification.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No notifications
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors text-xs font-semibold"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{renderActiveSection()}</main>
      </div>

      {/* Mobile slide-over menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    EP
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-base">
                    Employee Portal
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin">
                {[
                  { id: "dashboard", label: "Dashboard" },
                  { id: "attendance", label: "Daily Attendance" },
                  { id: "attendance-history", label: "Attendance Logs" },
                  { id: "overtime", label: "Overtime Hub" },
                  { id: "leave-requests", label: "Leave Requests" },
                  { id: "leave-balance", label: "Leave Balance" },
                  { id: "projects", label: "My Projects" },
                  { id: "tasks", label: "My Tasks" },
                  { id: "milestones", label: "Milestones" },
                  { id: "documents", label: "Documents" },
                  { id: "requests-status", label: "Request Status" },
                  { id: "profile", label: "My Profile" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChangeWithClose(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Daily Attendance Component with comprehensive features
function EnhancedDailyAttendance({
  employeeId,
  employeeName,
  employeeData,
  workLocations,
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch today's attendance record
  useEffect(() => {
    fetchTodayAttendance();
  }, [employeeId]);

  useEffect(() => {
    if (showMap && !currentLocation) {
      getCurrentLocation();
    }
  }, [showMap]);

  // Fetch today's attendance record
  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/attendance/daily?employeeId=${employeeId}&date=${today}`
      );
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setTodayRecord(result.data[0]);
      } else {
        setTodayRecord(null);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  // Get status display
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000, // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(location);
        setLocationLoading(false);
      },
      (error) => {
        console.error("Location error:", error);
        setLocationLoading(false);
      },
      options
    );
  };

  const status = getStatusDisplay();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Features */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white border border-slate-800 shadow-xl">
        <div className="absolute -right-8 -top-8 w-56 h-56 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Daily Attendance Portal</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  GPS Active
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-0.5">Welcome, <strong className="text-white">{employeeName}</strong> • Log and monitor your on-site hours</p>
            </div>
          </div>

          {/* Real-time Clock and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-left sm:text-right">
              <div className="text-2xl font-extrabold font-mono tracking-tight text-white">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
              <div className="text-xs text-blue-200">
                {currentTime.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowMap((v) => !v)}
                disabled={workLocations.length === 0}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold backdrop-blur border transition-all ${
                  workLocations.length === 0
                    ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                    : "bg-white/15 hover:bg-white/25 border-white/20 text-white shadow-sm hover:scale-[1.02]"
                }`}
              >
                <Navigation className="w-4 h-4" />
                {showMap ? "Hide Map" : "Interactive Map"}
              </button>
              <button
                onClick={() => setShowLocationsModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 border border-blue-400/40 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
              >
                <MapPin className="w-4 h-4" /> Locations ({workLocations.length})
              </button>
            </div>
          </div>
        </div>

        {/* Status and Location Info Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Work Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[11px] shadow-sm ${status.bgColor} ${status.color}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.text === "Working" ? "bg-blue-500 live-dot-blue" : "bg-current"}`}></span>
              {status.text}
            </span>

            {/* Location Available Badge */}
            {workLocations.length > 0 ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Geofence in Range</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No Location Assigned</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-300 text-xs">
            <span>ID: <strong className="text-white font-mono">{employeeData.employeeId}</strong></span>
            <span>•</span>
            <span>Dept: <strong className="text-white">{employeeData.department || "General"}</strong></span>
          </div>
        </div>
      </div>

      {/* Inline Interactive Map (outside modal) */}
      {showMap && workLocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="bg-blue-50 rounded-lg p-4 mb-4 text-sm text-gray-700">
            Use the layer control to switch between Satellite and Street views.
          </div>
          <div className="relative h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg overflow-hidden">
            {currentLocation ? (
              <LocationMap
                currentLocation={currentLocation}
                workLocations={workLocations}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {locationLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Getting your location...</p>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">
                        Location access required
                      </p>
                      <button
                        onClick={getCurrentLocation}
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Enable Location Access
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Attendance Component */}
      {workLocations.length > 0 && (
        <DailyAttendance
          employeeId={employeeId}
          employeeName={employeeName}
          workLocations={workLocations}
          hideHeader={true}
          onAttendanceUpdate={fetchTodayAttendance}
        />
      )}

      {/* Work Locations Modal */}
      {showLocationsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowLocationsModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-black flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" /> Work Locations (
                {workLocations.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMap(!showMap)}
                  disabled={workLocations.length === 0}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    workLocations.length === 0
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {showMap ? "Hide Map" : "Show Map"}
                </button>
                <button
                  onClick={() => setShowLocationsModal(false)}
                  className="px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {showMap && workLocations.length > 0 && (
                <div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4 text-sm text-gray-700">
                    Use the layer control to switch between Satellite and Street
                    views.
                  </div>
                  <div className="relative h-64 sm:h-80 md:h-96 bg-gray-200 rounded-lg overflow-hidden">
                    {currentLocation ? (
                      <LocationMap
                        currentLocation={currentLocation}
                        workLocations={workLocations}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          {locationLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                              <p className="text-gray-600">
                                Getting your location...
                              </p>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-600 mb-2">
                                Location access required
                              </p>
                              <button
                                onClick={getCurrentLocation}
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                              >
                                Enable Location Access
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Locations list */}
              {workLocations.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-black mb-2">
                    No Work Locations Assigned
                  </h3>
                  <p className="text-gray-600">
                    Please contact your administrator to assign work locations
                    for attendance tracking.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workLocations.map((location, index) => (
                    <div
                      key={location._id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-black">
                          {location.name}
                        </h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Location {index + 1}
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1 font-medium">
                            📍 Address
                          </p>
                          <p className="text-black">
                            {location.address || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1 font-medium">
                            🌍 Coordinates
                          </p>
                          <p className="text-black font-mono text-xs">
                            {location.latitude && location.longitude
                              ? `${
                                  typeof location.latitude === "number"
                                    ? location.latitude.toFixed(6)
                                    : String(location.latitude || "N/A")
                                }, ${
                                  typeof location.longitude === "number"
                                    ? location.longitude.toFixed(6)
                                    : String(location.longitude || "N/A")
                                }`
                              : "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1 font-medium">
                            📏 Check-in Radius
                          </p>
                          <p className="text-black">
                            {location.radius
                              ? `${
                                  typeof location.radius === "number"
                                    ? location.radius
                                    : String(location.radius || "N/A")
                                } meters`
                              : "Not specified"}
                          </p>
                        </div>
                        {location.description && (
                          <div className="md:col-span-2 lg:col-span-3">
                            <p className="text-gray-600 mb-1 font-medium">
                              📝 Description
                            </p>
                            <p className="text-black">
                              {location.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Map Component using Leaflet (Free alternative with satellite imagery)
function LocationMap({ currentLocation, workLocations }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);

  // Filter out locations without coordinates
  const validWorkLocations = workLocations.filter(
    (loc) =>
      loc.latitude &&
      loc.longitude &&
      !isNaN(parseFloat(loc.latitude)) &&
      !isNaN(parseFloat(loc.longitude))
  );

  // If no valid locations, show message
  if (validWorkLocations.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-4">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            No Work Locations with Coordinates
          </p>
          <p className="text-sm text-gray-500">
            Your work locations need latitude and longitude coordinates to
            display on the map.
          </p>
        </div>
      </div>
    );
  }

  // If no current location, show work locations only
  if (!currentLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-4">
          <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Location Access Required</p>
          <p className="text-sm text-gray-500">
            Please allow location access to see your position relative to work
            locations.
          </p>
        </div>
      </div>
    );
  }

  // Load Leaflet CSS and JS (Free alternative to Google Maps)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load Leaflet CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      cssLink.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      cssLink.crossOrigin = "";
      document.head.appendChild(cssLink);

      // Load Leaflet JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "";
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);

      return () => {
        try {
          document.head.removeChild(cssLink);
          document.head.removeChild(script);
        } catch (e) {
          // Elements might already be removed
        }
      };
    }
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (mapLoaded && currentLocation && validWorkLocations.length > 0 && !map) {
      initializeMap();
    }
  }, [mapLoaded, currentLocation, validWorkLocations, map]);

  const initializeMap = () => {
    if (typeof window === "undefined" || !window.L) return;

    const mapElement = document.getElementById("leaflet-map-portal");
    if (!mapElement) return;

    // Calculate center point
    const allLatitudes = [
      currentLocation.latitude,
      ...validWorkLocations.map((loc) => parseFloat(loc.latitude)),
    ];
    const allLongitudes = [
      currentLocation.longitude,
      ...validWorkLocations.map((loc) => parseFloat(loc.longitude)),
    ];

    const centerLat =
      allLatitudes.reduce((a, b) => a + b) / allLatitudes.length;
    const centerLng =
      allLongitudes.reduce((a, b) => a + b) / allLongitudes.length;

    // Create Leaflet Map with satellite imagery
    const leafletMap = window.L.map("leaflet-map-portal").setView(
      [centerLat, centerLng],
      16
    );

    // Add multiple tile layers for better coverage
    const osmLayer = window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }
    );

    // Alternative satellite-like imagery (Esri World Imagery)
    const satelliteLayer = window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "© Esri, Maxar, Earthstar Geographics",
      }
    );

    // Add default layer (satellite)
    satelliteLayer.addTo(leafletMap);

    // Add layer control
    const baseLayers = {
      Satellite: satelliteLayer,
      "Street Map": osmLayer,
    };
    window.L.control.layers(baseLayers).addTo(leafletMap);

    // Add CSS for pulsing animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 0 rgba(59, 130, 246, 0.7); }
        70% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 10px rgba(59, 130, 246, 0); }
        100% { box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5), 0 0 0 0 rgba(59, 130, 246, 0); }
      }
    `;
    document.head.appendChild(style);

    // Add current location marker with custom icon
    const currentLocationMarker = window.L.marker(
      [currentLocation.latitude, currentLocation.longitude],
      {
        icon: window.L.divIcon({
          className: "current-location-marker",
          html: '<div style="background: #3B82F6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.5); animation: pulse 2s infinite;"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }
    ).addTo(leafletMap);

    currentLocationMarker
      .bindPopup("📍 <b>Your Current Location</b>", {
        closeButton: false,
        autoClose: false,
      })
      .openPopup();

    // Add work location markers and circles
    validWorkLocations.forEach((location, index) => {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);
      const radius = location.radius || 100;

      // Calculate distance to current location
      const distance = leafletMap.distance(
        [currentLocation.latitude, currentLocation.longitude],
        [lat, lng]
      );
      const isWithinRadius = distance <= radius;
      const circleColor = isWithinRadius ? "#10B981" : "#EF4444";

      // Add circle with enhanced styling
      window.L.circle([lat, lng], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.8,
        radius: radius,
      }).addTo(leafletMap);

      // Add marker with enhanced icon
      const workLocationMarker = window.L.marker([lat, lng], {
        icon: window.L.divIcon({
          className: "work-location-marker",
          html: `<div style="background: ${circleColor}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(leafletMap);

      // Enhanced popup with emoji and styling
      const statusEmoji = isWithinRadius ? "✅" : "❌";
      const statusText = isWithinRadius ? "Within range" : "Outside range";

      workLocationMarker.bindPopup(
        `
        <div style="text-align: center; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">
            🏢 ${location.name}
          </h3>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">
            📍 ${location.address || "No address specified"}
          </p>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">
            📏 Radius: ${radius}m
          </p>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: ${circleColor};">
            ${statusEmoji} Distance: ${Math.round(distance)}m<br/>
            <span style="font-size: 12px;">${statusText}</span>
          </p>
        </div>
      `,
        {
          maxWidth: 250,
        }
      );
    });

    // Fit map to show all markers with padding
    const group = new window.L.featureGroup([
      currentLocationMarker,
      ...validWorkLocations.map((location) =>
        window.L.marker([
          parseFloat(location.latitude),
          parseFloat(location.longitude),
        ])
      ),
    ]);
    leafletMap.fitBounds(group.getBounds().pad(0.05));

    setMap(leafletMap);
  };

  if (!mapLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden relative">
      <div
        id="leaflet-map-portal"
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      ></div>
    </div>
  );
}
