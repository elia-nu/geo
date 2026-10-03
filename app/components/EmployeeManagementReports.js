"use client";

import React, { useState, useMemo } from "react";
import { Users, ClipboardList, Briefcase, AlertCircle } from "lucide-react";
import EmployeeMasterReport from "./EmployeeMasterReport";
import EmployeeAllocationReport from "./EmployeeAllocationReport";
import EmployeeLifecycleReport from "./EmployeeLifecycleReport";
import usePermissions from "../hooks/usePermissions";

const TABS = [
  {
    id: "employee-master",
    label: "Employee Master Report",
    requiredPermission: "reports.employee",
    description:
      "Full employee registry with status, role, department, work location, supervisor, contract type & joining date.",
    icon: ClipboardList,
    component: EmployeeMasterReport,
  },
  {
    id: "employee-allocation",
    label: "Employee Allocation Report",
    requiredPermission: "reports.employee",
    description:
      "Employees assigned per project, site location, department and supervisor with utilization insights.",
    icon: Briefcase,
    component: EmployeeAllocationReport,
  },
  {
    id: "employee-lifecycle",
    label: "Employee Lifecycle Activity Report",
    requiredPermission: "reports.employee",
    description:
      "Tracks employee creation, transfers, role changes and terminations with timestamps and admin actor logs.",
    icon: Users,
    component: EmployeeLifecycleReport,
  },
];

export default function EmployeeManagementReports() {
  const { hasPermission, isAdmin } = usePermissions();

  const accessibleTabs = useMemo(() => {
    if (isAdmin) return TABS;
    return TABS.filter((tab) => {
      if (tab.requiredPermission) {
        return hasPermission(tab.requiredPermission);
      }
      return true;
    });
  }, [hasPermission, isAdmin]);

  const [activeTab, setActiveTab] = useState(
    accessibleTabs[0]?.id || "employee-master"
  );

  const currentTab = accessibleTabs.find((t) => t.id === activeTab) || accessibleTabs[0];
  const ActiveComponent = currentTab?.component;

  if (accessibleTabs.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
          <p className="text-sm text-slate-500 mt-2">
            Your role does not have permission to view Employee Management Reports.
          </p>
        </div>
      </div>
    );
  }

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

