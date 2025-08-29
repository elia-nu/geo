"use client";
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import AttendanceReporting from "../components/AttendanceReporting";

export default function AttendanceReportsPage() {
  const [activeSection, setActiveSection] = useState("attendance-reports");

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={handleSectionChange}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Attendance Reports</h2>
        <AttendanceReporting />
      </div>
    </Layout>
  );
}
