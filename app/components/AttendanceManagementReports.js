"use client";

import React, { useState } from "react";
import { CalendarDays, AlertTriangle, Clock } from "lucide-react";
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
    label: "Attendance Exception & Violation",
    description:
      "Missed check-ins, late arrivals, early departures and outside-geofence attempts across the workforce.",
    icon: AlertTriangle,
    component: AttendanceExceptionViolationReport,
  },
  {
    id: "employee-attendance-history",
    label: "Employee Attendance History",
    description:
      "Full attendance trail per employee including coordinates, device and check-in/out timestamps.",
    icon: Clock,
    component: EmployeeAttendanceHistoryReport,
  },
  {
    id: "attendance-trends-productivity",
    label: "Attendance Trend & Productivity",
    description:
      "Monthly/quarterly attendance trends, absenteeism rates and overtime patterns.",
    icon: Clock,
    component: AttendanceTrendProductivityReport,
  },
];

export default function AttendanceManagementReports() {
  const [activeTab, setActiveTab] = useState("daily-attendance-summary");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Attendance Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            5.1 Daily Attendance Summary • 5.2 Attendance Exception &amp;
            Violation • 5.3 Employee Attendance History • 5.4 Attendance Trend
            &amp; Productivity
          </p>

          <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {ActiveComponent && (
            <div className="space-y-4">
              {TABS.map(
                (tab) =>
                  tab.id === activeTab && (
                    <p
                      key={tab.id}
                      className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                    >
                      {tab.description}
                    </p>
                  )
              )}
              <ActiveComponent />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

