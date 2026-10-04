"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, AlertTriangle, UserCheck, UserCog } from "lucide-react";
import CompletedActivitiesMasterAuditReport from "./CompletedActivitiesMasterAuditReport";
import WorkflowBottleneckSLAReport from "./WorkflowBottleneckSLAReport";
import UserActivitySecurityAuditReport from "./UserActivitySecurityAuditReport";
import EmployeePortalAuditReport from "./EmployeePortalAuditReport";

const TAB_IDS = [
  "completed-activities",
  "workflow-bottlenecks",
  "user-activity-security",
  "employee-portal-audit",
];

const TABS = [
  {
    id: "completed-activities",
    label: "Completed Activities (Master Audit)",
    icon: ClipboardList,
    component: CompletedActivitiesMasterAuditReport,
  },
  {
    id: "workflow-bottlenecks",
    label: "Workflow Bottleneck & SLA Breach",
    icon: AlertTriangle,
    component: WorkflowBottleneckSLAReport,
  },
  {
    id: "user-activity-security",
    label: "User Activity & Security Audit",
    icon: UserCheck,
    component: UserActivitySecurityAuditReport,
  },
  {
    id: "employee-portal-audit",
    label: "Employee Portal Activities",
    icon: UserCog,
    component: EmployeePortalAuditReport,
  },
];

export default function UniversalSystemReports({ initialTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") || initialTab;
  const validTab = TAB_IDS.includes(tabFromUrl)
    ? tabFromUrl
    : "completed-activities";
  const [activeTab, setActiveTab] = useState(validTab);
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  useEffect(() => {
    const t = searchParams?.get("tab") || initialTab;
    if (t && TAB_IDS.includes(t)) setActiveTab(t);
  }, [searchParams, initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams();
    params.set("section", "universal-system-reports");
    params.set("tab", tabId);
    router.replace(`/hrm?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 mb-6">
          <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
            Universal System Reports (All Modules Combined)
          </h1>
          <p className="text-slate-500 mb-6 text-sm font-medium">
            10.1 Completed Activities (Master Audit) • 10.2 Workflow Bottleneck
            &amp; SLA Breach • 10.3 User Activity &amp; Security Audit • 10.4 Employee Portal Activities
          </p>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}

