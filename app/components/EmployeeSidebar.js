"use client";

import React, { useState } from "react";
import { useSidebarStore } from "./useSidebarStore";
import {
  Clock,
  Calendar,
  FileText,
  User,
  LogOut,
  Home,
  History,
  BarChart3,
  Target,
  CheckSquare,
  Flag,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";

export default function EmployeeSidebar({
  activeSection,
  onSectionChange,
  employeeName,
}) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuSections = [
    {
      group: "Core",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: Home,
          description: "Work status overview",
        },
        {
          id: "attendance",
          label: "Daily Attendance",
          icon: Clock,
          badge: "Live",
          description: "Clock in / Clock out",
        },
        {
          id: "attendance-history",
          label: "Attendance Logs",
          icon: History,
          description: "Past logs & records",
        },
        {
          id: "overtime",
          label: "Overtime Hub",
          icon: Zap,
          description: "OT requests & tracking",
        },
      ],
    },
    {
      group: "Leave & Requests",
      items: [
        {
          id: "leave-requests",
          label: "Leave Requests",
          icon: Calendar,
          description: "Apply & manage leave",
        },
        {
          id: "leave-balance",
          label: "Leave Balances",
          icon: BarChart3,
          description: "Entitlement & balance",
        },
        {
          id: "requests-status",
          label: "Request Status",
          icon: AlertCircle,
          description: "Approvals & tickets",
        },
      ],
    },
    {
      group: "Projects & Tasks",
      items: [
        {
          id: "projects",
          label: "My Projects",
          icon: Target,
          description: "Assigned project details",
        },
        {
          id: "tasks",
          label: "My Tasks",
          icon: CheckSquare,
          description: "Task lists & deadlines",
        },
        {
          id: "milestones",
          label: "Milestones",
          icon: Flag,
          description: "Key project milestones",
        },
        {
          id: "documents",
          label: "Documents",
          icon: FileText,
          description: "Employee files & attachments",
        },
      ],
    },
    {
      group: "Account",
      items: [
        {
          id: "profile",
          label: "My Profile",
          icon: User,
          description: "Personal details & settings",
        },
      ],
    },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("employeeData");
    } catch {}
    window.location.href = "/employee-login";
  };

  const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile toggle button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2.5 rounded-xl bg-white/90 backdrop-blur border border-slate-200 shadow-lg text-slate-700 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open menu"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300 z-50 flex flex-col justify-between overflow-hidden transform md:transform-none ${
          isCollapsed ? "w-20" : "w-72"
        } ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900 dark:to-slate-900/90">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base">
                    Employee Portal
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Staff
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {employeeName || "Welcome"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => toggleCollapsed()}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
          {menuSections.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {section.group}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSectionChange(item.id);
                      setMobileOpen(false);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={`group w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-medium"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                      }`}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 text-left truncate flex items-center justify-between">
                        <span className="truncate text-sm tracking-normal">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active Pill Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full md:hidden" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs flex items-center justify-center shadow shrink-0">
                  {getInitials(employeeName)}
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {employeeName || "Employee"}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active Status
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-full flex justify-center p-3 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
