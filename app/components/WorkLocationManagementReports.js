"use client";

import React, { useState } from "react";
import { MapPin, Activity, Users } from "lucide-react";
import SiteLocationMasterReport from "./SiteLocationMasterReport";
import SiteAttendanceComplianceReport from "./SiteAttendanceComplianceReport";
import WorkForceDistributionReport from "./WorkforceDistributionReport";

const TABS = [
  {
    id: "site-location-master",
    label: "Site Location Master Report",
    description:
      "All registered work locations with coordinates, radius, linked projects and active/inactive status.",
    icon: MapPin,
    component: SiteLocationMasterReport,
  },
  {
    id: "site-attendance-compliance",
    label: "Site Attendance Compliance Report",
    description:
      "Percentage of check-ins inside vs. outside geofence and violations per site for compliance enforcement.",
    icon: Activity,
    component: SiteAttendanceComplianceReport,
  },
  {
    id: "workforce-distribution",
    label: "Workforce Distribution by Site Report",
    description:
      "Headcount by site, department, project and shift/time range for workforce planning.",
    icon: Users,
    component: WorkForceDistributionReport,
  },
];

export default function WorkLocationManagementReports() {
  const [activeTab, setActiveTab] = useState("site-location-master");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Work Location Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            4.1 Site Location Master • 4.2 Site Attendance Compliance • 4.3
            Workforce Distribution by Site
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

