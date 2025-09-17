"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Target,
  DollarSign,
  Activity,
} from "lucide-react";

export default function ProjectDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

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

  const fetchDashboardData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch("/api/projects/dashboard");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }
      const data = await (async () => {
        try {
          return await response.clone().json();
        } catch {
          return null;
        }
      })();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error?.message || error);
      setDashboardData(null);
    } finally {
      setLoadingData(false);
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
          <p className="text-gray-600">Loading Project Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect to login or unauthorized
  }

  const ProjectAlerts = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Alerts</h3>
        <Badge variant="destructive" className="text-xs">
          {dashboardData?.alerts?.length || 0} Active
        </Badge>
      </div>
      <div className="space-y-3">
        {dashboardData?.alerts?.slice(0, 5).map((alert, index) => (
          <div
            key={index}
            className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-200"
          >
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900">{alert.title}</p>
              <p className="text-sm text-red-700">{alert.message}</p>
              <p className="text-xs text-red-600 mt-1">{alert.projectName}</p>
            </div>
          </div>
        ))}
        {(!dashboardData?.alerts || dashboardData.alerts.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No active alerts</p>
            <p className="text-sm">All projects are on track</p>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Project Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time overview of all your projects and their progress
          </p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">
              Loading dashboard data...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Projects
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.overview?.totalProjects || 0}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 ml-1">
                    +{dashboardData?.overview?.projectsThisMonth || 0} this
                    month
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Projects
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.overview?.activeProjects || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-gray-600">
                    {dashboardData?.overview?.completionRate || 0}% completion
                    rate
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Team Members
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.overview?.totalTeamMembers || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-gray-600">
                    Across all projects
                  </span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Budget
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      $
                      {dashboardData?.overview?.totalBudget?.toLocaleString() ||
                        0}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-sm text-gray-600">
                    Allocated budget
                  </span>
                </div>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project Status Distribution */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Project Status
                </h3>
                <div className="space-y-4">
                  {dashboardData?.statusDistribution?.map((status, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            status.status === "Planning"
                              ? "bg-blue-500"
                              : status.status === "In Progress"
                              ? "bg-yellow-500"
                              : status.status === "Completed"
                              ? "bg-green-500"
                              : status.status === "On Hold"
                              ? "bg-orange-500"
                              : "bg-red-500"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {status.status}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {status.count}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Projects */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Projects
                </h3>
                <div className="space-y-4">
                  {dashboardData?.recentProjects
                    ?.slice(0, 5)
                    .map((project, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {project.category}
                          </p>
                        </div>
                        <Badge
                          variant={
                            project.status === "Completed"
                              ? "default"
                              : project.status === "In Progress"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Project Alerts */}
              <ProjectAlerts />
            </div>

            {/* Category Performance */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Projects by Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData?.categoryDistribution?.map((category, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {category.category}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {category.count} projects
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (category.count /
                              Math.max(
                                ...(dashboardData?.categoryDistribution?.map(
                                  (c) => c.count
                                ) || [1])
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
