"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, AlertTriangle, UserCheck } from "lucide-react";
import CompletedActivitiesMasterAuditReport from "./CompletedActivitiesMasterAuditReport";
import WorkflowBottleneckSLAReport from "./WorkflowBottleneckSLAReport";
import UserActivitySecurityAuditReport from "./UserActivitySecurityAuditReport";

const TAB_IDS = [
  "completed-activities",
  "workflow-bottlenecks",
  "user-activity-security",
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Universal System Reports (All Modules Combined)
          </h1>
          <p className="text-gray-600 mb-6">
            10.1 Completed Activities (Master Audit) • 10.2 Workflow Bottleneck
            &amp; SLA Breach • 10.3 User Activity &amp; Security Audit
          </p>

          <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-colors ${
                    activeTab === tab.id
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

          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}

