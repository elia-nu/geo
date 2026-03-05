"use client";

import React, { useState } from "react";
import { Users, ClipboardList, Briefcase } from "lucide-react";
import EmployeeMasterReport from "./EmployeeMasterReport";
import EmployeeAllocationReport from "./EmployeeAllocationReport";
import EmployeeLifecycleReport from "./EmployeeLifecycleReport";

const TABS = [
  {
    id: "employee-master",
    label: "Employee Master Report",
    description:
      "Full employee registry with status, role, department, work location, supervisor, contract type & joining date.",
    icon: ClipboardList,
    component: EmployeeMasterReport,
  },
  {
    id: "employee-allocation",
    label: "Employee Allocation Report",
    description:
      "Employees assigned per project, site location, department and supervisor with utilization insights.",
    icon: Briefcase,
    component: EmployeeAllocationReport,
  },
  {
    id: "employee-lifecycle",
    label: "Employee Lifecycle Activity Report",
    description:
      "Tracks employee creation, transfers, role changes and terminations with timestamps and admin actor logs.",
    icon: Users,
    component: EmployeeLifecycleReport,
  },
];

export default function EmployeeManagementReports() {
  const [activeTab, setActiveTab] = useState("employee-master");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Employee Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            1.1 Employee Master Report • 1.2 Employee Allocation Report • 1.3
            Employee Lifecycle Activity Report
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

