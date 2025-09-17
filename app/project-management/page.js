"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import ProjectManagement from "../components/ProjectManagement";

export default function ProjectManagementPage() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Project Management...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect to login or unauthorized
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Project Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create, manage, and track your projects with comprehensive tools
          </p>
        </div>
        <ProjectManagement />
      </div>
    </Layout>
  );
}
