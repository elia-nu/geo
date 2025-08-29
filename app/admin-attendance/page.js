"use client";

import React from "react";
import Layout from "../components/Layout";
import AdminAttendanceManagement from "../components/AdminAttendanceManagement";

export default function AdminAttendancePage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <AdminAttendanceManagement />
        </div>
      </div>
    </Layout>
  );
}
