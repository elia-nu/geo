"use client";
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import PayrollCalculator from "../components/IntegratedPayrollSystem";

export default function PayrollCalculatorPage() {
  const [activeSection, setActiveSection] = useState("payroll-calculator");

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={handleSectionChange}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Payroll Calculator</h2>
        <PayrollCalculator />
      </div>
    </Layout>
  );
}
