"use client";

import React, { useState } from "react";
import { Briefcase, Milestone, Users, DollarSign, AlertTriangle } from "lucide-react";
import ProjectMasterSummaryReport from "./ProjectMasterSummaryReport";
import ProjectMilestoneProgressReport from "./ProjectMilestoneProgressReport";
import ProjectWorkforceUtilizationReport from "./ProjectWorkforceUtilizationReport";
import ProjectCostBudgetPerformanceReport from "./ProjectCostBudgetPerformanceReport";
import ProjectRiskIssueTrackingReport from "./ProjectRiskIssueTrackingReport";

const TABS = [
  { id: "master-summary", label: "Project Master Summary", icon: Briefcase, component: ProjectMasterSummaryReport },
  { id: "milestone-progress", label: "Milestone Progress", icon: Milestone, component: ProjectMilestoneProgressReport },
  { id: "workforce-utilization", label: "Workforce Utilization", icon: Users, component: ProjectWorkforceUtilizationReport },
  { id: "cost-budget", label: "Cost & Budget Performance", icon: DollarSign, component: ProjectCostBudgetPerformanceReport },
  { id: "risk-issue", label: "Risk & Issue Tracking", icon: AlertTriangle, component: ProjectRiskIssueTrackingReport },
];

export default function ProjectManagementReports() {
  const [activeTab, setActiveTab] = useState("master-summary");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Project Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            8.1 Master Summary • 8.2 Milestone Progress • 8.3 Workforce Utilization • 8.4 Cost & Budget • 8.5 Risk & Issue Tracking
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
