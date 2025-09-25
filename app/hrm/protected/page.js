"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import Dashboard from "../../components/Dashboard";
import EmployeeDatabase from "../../components/EmployeeDatabase";
import DocumentManager from "../../components/DocumentManager";
import NotificationManager from "../../components/NotificationManager";
import AttendanceReporting from "../../components/AttendanceReporting";
import ManagerLeaveApproval from "../../components/ManagerLeaveApproval";
import LeaveBalance from "../../components/LeaveBalance";

export default function ProtectedHRMDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }

      // Decode JWT token (basic validation)
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp < currentTime) {
        localStorage.removeItem("authToken");
        router.push("/login");
        return;
      }

      // Check if user has admin role
      if (payload.role !== "ADMIN") {
        router.push("/unauthorized");
        return;
      }

      setUser(payload);
      setIsAuthenticated(true);
      setIsAdmin(true);
    } catch (error) {
      console.error("Authentication error:", error);
      localStorage.removeItem("authToken");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/login");
  };

  const handleSectionChange = (section) => {
    console.log("Protected HRM handleSectionChange called with:", section);
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HRM Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect to login or unauthorized page
  }

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
            <p className="text-gray-600">
              Organization hierarchy management coming soon...
            </p>
          </div>
        );
      case "notifications":
        return <NotificationManager />;
      case "attendance":
        return <AttendanceReporting />;
      case "leave-approval":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Leave Request Approval</h2>
            <ManagerLeaveApproval />
          </div>
        );
      case "leave-balances":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Leave Balances</h2>
            <LeaveBalance
              employeeId="all"
              employeeName="All Employees"
              isManager={true}
            />
          </div>
        );
      case "leave-reports":
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Leave Reports</h2>
            <p className="text-gray-600">
              Leave reports and analytics coming soon...
            </p>
          </div>
        );
      default:
        return <Dashboard onSectionChange={handleSectionChange} />;
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      user={user}
      onLogout={handleLogout}
    >
      <div className="p-6">
        {/* Admin Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">HRM Dashboard</h1>
              <p className="text-blue-100">
                Welcome, {user?.name} | Role: {user?.role}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-green-500 px-3 py-1 rounded-full text-sm font-medium">
                Admin Access
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {renderContent()}
      </div>
    </Layout>
  );
}
