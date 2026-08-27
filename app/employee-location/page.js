"use client";

import React, { useState } from "react";
import Layout from "../components/Layout";
import EmployeeLocationManagement from "../components/EmployeeLocationManagement";

export default function EmployeeLocationPage() {
  const [activeSection, setActiveSection] = useState("employee-location");

  const handleSectionChange = (section) => {
    if (section === "dashboard") {
      window.location.href = "/hrm";
    } else if (section === "employees" || section === "employee-database") {
      window.location.href = "/hrm?section=employee-database";
    } else if (section === "employee-add") {
      window.location.href = "/hrm?section=employee-add";
    } else if (section === "documents" || section === "document-list") {
      window.location.href = "/hrm?section=document-list";
    } else if (section === "notifications") {
      window.location.href = "/hrm?section=notifications";
    } else if (section === "calendar") {
      window.location.href = "/hrm?section=calendar";
    } else if (section === "settings") {
      window.location.href = "/hrm?section=settings";
    } else {
      window.location.href = "/hrm";
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <EmployeeLocationManagement />
      </div>
    </Layout>
  );
}
