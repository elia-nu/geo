"use client";

import React, { useState } from "react";
import { FileText, AlertTriangle } from "lucide-react";
import DocumentInventoryReport from "./DocumentInventoryReport";
import DocumentExpiryComplianceReport from "./DocumentExpiryComplianceReport";

const TABS = [
  {
    id: "document-inventory",
    label: "Document Inventory Report",
    description:
      "All documents by type, owner, project, department and status for complete document visibility.",
    icon: FileText,
    component: DocumentInventoryReport,
  },
  {
    id: "document-expiry-compliance",
    label: "Document Expiry & Compliance Report",
    description:
      "Documents nearing expiration (contracts, insurance, certifications) with auto-alert triggers for admins.",
    icon: AlertTriangle,
    component: DocumentExpiryComplianceReport,
  },
];

export default function DocumentManagementReports() {
  const [activeTab, setActiveTab] = useState("document-inventory");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-black mb-1">
            Document Management Reports
          </h1>
          <p className="text-gray-600 mb-6">
            3.1 Document Inventory Report • 3.2 Document Expiry &amp; Compliance
            Report
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

