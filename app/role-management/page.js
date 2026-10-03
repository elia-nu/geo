"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "../components/Layout";
import RoleManagement from "../components/RoleManagement";
import UserRoleAssignment from "../components/UserRoleAssignment";
import PermissionMatrix from "../components/PermissionMatrix";
import { Shield, Users, Table, Loader2 } from "lucide-react";

export default function StandaloneRoleManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("roles"); // roles | assignments | matrix
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.push("/login");
        return;
      }
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        localStorage.removeItem("authToken");
        router.push("/login");
        return;
      }
      setUser(payload);
    } catch {
      localStorage.removeItem("authToken");
      router.push("/login");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab && ["roles", "assignments", "matrix"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSectionChange = (section) => {
    if (section === "role-management") {
      setActiveTab("roles");
    } else if (section === "user-role-assignment") {
      setActiveTab("assignments");
    } else {
      router.push(`/hrm?section=${section}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full mx-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Verifying Permissions</h3>
          <p className="text-xs text-slate-500 mt-1">Opening Access Control...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeSection="role-management"
      onSectionChange={handleSectionChange}
      user={user}
      onLogout={handleLogout}
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "roles"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "assignments"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4" />
            User Role Assignments
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "matrix"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Table className="w-4 h-4" />
            Permission Matrix Grid
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "roles" && <RoleManagement />}
          {activeTab === "assignments" && <UserRoleAssignment />}
          {activeTab === "matrix" && <PermissionMatrix />}
        </div>
      </div>
    </Layout>
  );
}
