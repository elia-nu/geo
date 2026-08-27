"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
} from "lucide-react";
import DailyAttendanceSummaryReport from "./DailyAttendanceSummaryReport";
import AttendanceExceptionViolationReport from "./AttendanceExceptionViolationReport";
import EmployeeAttendanceHistoryReport from "./EmployeeAttendanceHistoryReport";
import AttendanceTrendProductivityReport from "./AttendanceTrendProductivityReport";

const TABS = [
  {
    id: "daily-attendance-summary",
    label: "Daily Attendance Summary",
    description:
      "Present / Absent / Late / Early checkout by site, project, department and shift for a specific day.",
    icon: CalendarDays,
    component: DailyAttendanceSummaryReport,
  },
  {
    id: "attendance-exceptions",
    label: "Exceptions & Violations",
    description:
      "Missed check-ins, late arrivals, early departures and outside-geofence attempts across the workforce.",
    icon: AlertTriangle,
    component: AttendanceExceptionViolationReport,
  },
  {
    id: "employee-attendance-history",
    label: "Employee History (Emp-ID)",
    description:
      "Full attendance trail per employee by Emp-ID including coordinates, device and check-in/out timestamps.",
    icon: Clock,
    component: EmployeeAttendanceHistoryReport,
  },
  {
    id: "attendance-trends-productivity",
    label: "Trends & Productivity",
    description:
      "Monthly/quarterly attendance trends, absenteeism rates and overtime patterns.",
    icon: TrendingUp,
    component: AttendanceTrendProductivityReport,
  },
];

export default function AttendanceManagementReports() {
  const [activeTab, setActiveTab] = useState("daily-attendance-summary");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 shadow-2xl text-white border border-indigo-900/40">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Attendance Management Reports
                </h1>
                <p className="text-indigo-200/90 text-xs sm:text-sm">
                  Executive summaries, employee history audit trails, and productivity reports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-white/10 mt-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-md scale-105"
                    : "bg-white/10 text-indigo-100 hover:bg-white/20"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      {ActiveComponent && (
        <div className="space-y-4">
          <ActiveComponent />
        </div>
      )}
    </div>
  );
}
