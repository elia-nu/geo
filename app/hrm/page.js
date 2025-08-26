"use client";
import React, { useState } from "react";
import Layout from "../components/Layout";
import Dashboard from "../components/Dashboard";
import EmployeeDatabase from "../components/EmployeeDatabase";
import DocumentManager from "../components/DocumentManager";
import NotificationManager from "../components/NotificationManager";

export default function HRMDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onSectionChange={handleSectionChange} />;
      case "employee-database":
      case "employees":
        return <EmployeeDatabase />;
      case "employee-add":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Add New Employee</h2>
            <EmployeeDatabase />
          </div>
        );
      case "employee-search":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Search Employees</h2>
            <EmployeeDatabase />
          </div>
        );
      case "document-list":
      case "documents":
        return <DocumentManager />;
      case "document-upload":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Upload Document</h2>
            <DocumentManager />
          </div>
        );
      case "document-expiry":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Document Expiry Alerts</h2>
            <DocumentManager />
          </div>
        );
      case "employee-stats":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Employee Statistics</h2>
            <p className="text-gray-600">
              Employee analytics and reports coming soon...
            </p>
          </div>
        );
      case "department-stats":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Department Analytics</h2>
            <p className="text-gray-600">Department analytics coming soon...</p>
          </div>
        );
      case "document-stats":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Document Reports</h2>
            <p className="text-gray-600">Document reports coming soon...</p>
          </div>
        );
      case "departments":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Departments</h2>
            <p className="text-gray-600">
              Department management coming soon...
            </p>
          </div>
        );
      case "locations":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Work Locations</h2>
            <p className="text-gray-600">Location management coming soon...</p>
          </div>
        );
      case "hierarchy":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Organization Hierarchy</h2>
            <p className="text-gray-600">Org hierarchy coming soon...</p>
          </div>
        );
      case "notifications":
        return <NotificationManager />;
      case "calendar":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar view coming soon...</p>
          </div>
        );
      case "settings":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-gray-600">System settings coming soon...</p>
          </div>
        );
      default:
        return <Dashboard onSectionChange={handleSectionChange} />;
    }
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={handleSectionChange}>
      {renderContent()}
    </Layout>
  );
}
