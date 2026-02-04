"use client";

import React, { useState } from "react";
import { FileText, Link2, AlertTriangle, DollarSign } from "lucide-react";
import PayrollSummaryReport from "./PayrollSummaryReport";
import PayrollReconciliationReport from "./PayrollReconciliationReport";
import PayrollVarianceReport from "./PayrollVarianceReport";
import PayrollCostByProjectReport from "./PayrollCostByProjectReport";

const TABS = [
  { id: "summary", label: "Payroll Summary", icon: FileText, component: PayrollSummaryReport },
  { id: "reconciliation", label: "Attendance-to-Payroll Reconciliation", icon: Link2, component: PayrollReconciliationReport },
  { id: "variance", label: "Payroll Variance & Anomaly", icon: AlertTriangle, component: PayrollVarianceReport },
  { id: "cost-by-project", label: "Payroll Cost by Project", icon: DollarSign, component: PayrollCostByProjectReport },
];

export default function PayrollManagementReports() {
  const [activeTab, setActiveTab] = useState("summary");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Payroll Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            7.1 Payroll Summary • 7.2 Attendance-to-Payroll Reconciliation • 7.3 Variance & Anomaly • 7.4 Cost by Project
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
