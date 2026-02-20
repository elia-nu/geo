"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Shield, TrendingUp, BarChart3 } from "lucide-react";
import SystemOperationalHealthReport from "./SystemOperationalHealthReport";
import ComplianceAuditReadinessReport from "./ComplianceAuditReadinessReport";
import WorkforceProductivityROIReport from "./WorkforceProductivityROIReport";
import ExecutivePerformanceDashboardReport from "./ExecutivePerformanceDashboardReport";

const TAB_IDS = [
  "system-health",
  "compliance-audit",
  "workforce-productivity-roi",
  "executive-dashboard",
];

const TABS = [
  { id: "system-health", label: "System Operational Health", icon: Activity, component: SystemOperationalHealthReport },
  { id: "compliance-audit", label: "Compliance & Audit Readiness", icon: Shield, component: ComplianceAuditReadinessReport },
  { id: "workforce-productivity-roi", label: "Workforce Productivity", icon: TrendingUp, component: WorkforceProductivityROIReport },
  { id: "executive-dashboard", label: "Executive Performance Dashboard", icon: BarChart3, component: ExecutivePerformanceDashboardReport },
];

export default function CrossSystemExecutiveReports({ initialTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get("tab") || initialTab;
  const validTab = TAB_IDS.includes(tabFromUrl) ? tabFromUrl : "system-health";
  const [activeTab, setActiveTab] = useState(validTab);
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  useEffect(() => {
    const t = searchParams?.get("tab") || initialTab;
    if (t && TAB_IDS.includes(t)) setActiveTab(t);
  }, [searchParams, initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams();
    params.set("section", "executive-reports");
    params.set("tab", tabId);
    router.replace(`/hrm?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Cross-System & Executive Reports (Admin-Level Intelligence)
          </h1>
          <p className="text-gray-600 mb-6">
            9.1–9.4 Executive Reports: System health, compliance readiness, workforce productivity, and executive performance dashboard.
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
