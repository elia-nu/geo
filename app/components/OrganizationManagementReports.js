"use client";

import React, { useState, useMemo } from "react";
import { GitBranch, ShieldCheck, BarChart3, AlertCircle } from "lucide-react";
import OrganizationalStructureReport from "./OrganizationalStructureReport";
import RolePermissionAuditReport from "./RolePermissionAuditReport";
import DepartmentPerformanceReport from "./DepartmentPerformanceReport";
import usePermissions from "../hooks/usePermissions";

const TABS = [
  {
    id: "organizational-structure",
    label: "Organizational Structure Report",
    requiredPermission: "reports.organization",
    description:
      "Hierarchy tree by Company → Department → Role for HR planning and governance audits.",
    icon: GitBranch,
    component: OrganizationalStructureReport,
  },
  {
    id: "role-permission-audit",
    label: "Role Audit Report",
    requiredPermissions: ["role.manage", "reports.organization"],
    description:
      "Lists roles, system privileges and assigned users for governance and access review.",
    icon: ShieldCheck,
    component: RolePermissionAuditReport,
  },
  {
    id: "department-performance",
    label: "Department Performance Summary",
    requiredPermission: "reports.organization",
    description:
      "Department-level attendance rate, leave frequency, payroll cost and workforce utilization summary.",
    icon: BarChart3,
    component: DepartmentPerformanceReport,
  },
];

export default function OrganizationManagementReports() {
  const { hasPermission, isAdmin } = usePermissions();

  const accessibleTabs = useMemo(() => {
    if (isAdmin) return TABS;
    return TABS.filter((tab) => {
      if (tab.requiredPermissions) {
        return tab.requiredPermissions.some((p) => hasPermission(p));
      }
      if (tab.requiredPermission) {
        return hasPermission(tab.requiredPermission);
      }
      return true;
    });
  }, [hasPermission, isAdmin]);

  const [activeTab, setActiveTab] = useState(
    accessibleTabs[0]?.id || "organizational-structure"
  );

  // If activeTab is no longer accessible, reset to first accessible
  const currentTab = accessibleTabs.find((t) => t.id === activeTab) || accessibleTabs[0];
  const ActiveComponent = currentTab?.component;

  if (accessibleTabs.length === 0) {
    return (
      <div className="p-6 bg-gray-50 min-h-[60vh] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
          <p className="text-sm text-slate-500 mt-2">
            Your role does not have permission to view Organization Management Reports.
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
            Organization Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            2.1 Organizational Structure Report • 2.2 Role & Permission Audit
            Report • 2.3 Department Performance Summary
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

