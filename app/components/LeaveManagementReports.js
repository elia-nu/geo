"use client";

import React, { useState } from "react";
import { FileText, Wallet, Briefcase } from "lucide-react";
import LeaveRequestSummaryReport from "./LeaveRequestSummaryReport";
import LeaveBalanceEntitlementReport from "./LeaveBalanceEntitlementReport";
import LeaveWorkforceImpactReport from "./LeaveWorkforceImpactReport";

const TABS = [
  { id: "summary", label: "Leave Request Summary", icon: FileText, component: LeaveRequestSummaryReport },
  { id: "balance", label: "Leave Balance & Entitlement", icon: Wallet, component: LeaveBalanceEntitlementReport },
  { id: "workforce", label: "Leave Impact on Workforce", icon: Briefcase, component: () => <LeaveWorkforceImpactReport embedded /> },
];

export default function LeaveManagementReports() {
  const [activeTab, setActiveTab] = useState("summary");

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Leave Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            6.1 Leave Request Summary • 6.2 Leave Balance & Entitlement • 6.3 Leave Impact on Workforce Availability
          </p>

          <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
