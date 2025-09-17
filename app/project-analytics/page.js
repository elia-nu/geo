"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Clock,
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
} from "lucide-react";

export default function ProjectAnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dateRange, setDateRange] = useState("3months");
  const [activeView, setActiveView] = useState("overview");
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated, dateRange]);

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

  const fetchAnalyticsData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(
        `/api/projects/analytics?dateRange=${dateRange}`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
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
          <p className="text-gray-600">Loading Project Analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect to login or unauthorized
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="p-6 bg-gray-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-7 w-7 mr-2 text-blue-600" />
              Project Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed insights and performance metrics for your projects
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] bg-white border-gray-300 shadow-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <SelectValue placeholder="Select Date Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="bg-white border-gray-300 shadow-sm hover:bg-gray-100"
              onClick={() => fetchAnalyticsData()}
            >
              <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
              Refresh
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm p-2 inline-flex gap-1">
            <Button 
              variant={activeView === "overview" ? "default" : "ghost"} 
              className={activeView === "overview" ? "bg-blue-600" : ""}
              onClick={() => setActiveView("overview")}
            >
              Overview
            </Button>
            <Button 
              variant={activeView === "performance" ? "default" : "ghost"}
              className={activeView === "performance" ? "bg-blue-600" : ""}
              onClick={() => setActiveView("performance")}
            >
              Performance
            </Button>
            <Button 
              variant={activeView === "teams" ? "default" : "ghost"}
              className={activeView === "teams" ? "bg-blue-600" : ""}
              onClick={() => setActiveView("teams")}
            >
              Teams
            </Button>
            <Button 
              variant={activeView === "risks" ? "default" : "ghost"}
              className={activeView === "risks" ? "bg-blue-600" : ""}
              onClick={() => setActiveView("risks")}
            >
              Risks
            </Button>
          </div>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 font-medium">
              Loading analytics data...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Completion Rate
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData?.performance?.completionRate || 0}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{analyticsData?.performance?.completionRateChange || 0}%
                  </div>
                  <span className="text-xs text-gray-500 ml-2">vs last period</span>
                </div>
              </Card>

              <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Average Duration
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData?.performance?.averageDuration || 0} days
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -{analyticsData?.performance?.durationChange || 0}%
                  </div>
                  <span className="text-xs text-gray-500 ml-2">vs last period</span>
                </div>
              </Card>

              <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Budget Utilization
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData?.performance?.budgetUtilization || 0}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    ${analyticsData?.performance?.totalSpent?.toLocaleString() || 0}
                  </div>
                  <span className="text-xs text-gray-500 ml-2">total spent</span>
                </div>
              </Card>

              <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Team Productivity
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData?.performance?.teamProductivity || 0}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{analyticsData?.performance?.productivityChange || 0}%
                  </div>
                  <span className="text-xs text-gray-500 ml-2">vs last period</span>
                </div>
              </Card>
            </div>

            {/* Category Performance */}
            <Card className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                  Performance by Category
                </h3>
                <Button variant="outline" size="sm" className="text-xs bg-white">
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analyticsData?.categoryPerformance?.map((category, index) => (
                  <div key={index} className="p-5 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {category.category}
                      </h4>
                      <Badge
                        className={
                          category.completionRate >= 80
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : category.completionRate >= 60
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }
                      >
                        {category.completionRate}%
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Projects</span>
                        <span className="font-medium bg-gray-100 px-2 py-1 rounded-md">
                          {category.totalProjects}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                          {category.completedProjects}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Avg Duration</span>
                        <span className="font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                          {category.averageDuration} days
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div
                          className={
                            category.completionRate >= 80
                              ? "bg-green-500 h-2 rounded-full"
                              : category.completionRate >= 60
                              ? "bg-yellow-500 h-2 rounded-full"
                              : "bg-red-500 h-2 rounded-full"
                          }
                          style={{ width: `${category.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Team Productivity */}
            <Card className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Team Productivity Metrics
                </h3>
                <Button variant="outline" size="sm" className="text-xs bg-white">
                  View All Teams
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-green-600" />
                    Most Productive Teams
                  </h4>
                  <div className="space-y-4">
                    {analyticsData?.teamProductivity?.topTeams?.map(
                      (team, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900 block">
                                {team.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {team.projectsCompleted} projects completed
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900 bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {team.productivity}%
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100">
                  <h4 className="font-medium text-gray-800 mb-4 flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                    Workload Distribution
                  </h4>
                  <div className="space-y-4">
                    {analyticsData?.teamProductivity?.workloadDistribution?.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {item.range}
                            </span>
                            <span className="text-sm font-medium text-gray-900 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {item.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Risk Analysis */}
            <Card className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                  Risk Analysis
                </h3>
                <Button variant="outline" size="sm" className="text-xs bg-white">
                  View Details
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-red-100 hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {analyticsData?.riskAnalysis?.highRiskProjects || 0}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-800">High Risk Projects</div>
                    <div className="mt-2 text-xs text-gray-500">Requires immediate attention</div>
                    <div className="mt-3 flex items-center">
                      <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 p-0">
                        View Projects →
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-yellow-100 hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {analyticsData?.riskAnalysis?.overdueMilestones || 0}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-800">Overdue Milestones</div>
                    <div className="mt-2 text-xs text-gray-500">Past scheduled completion date</div>
                    <div className="mt-3 flex items-center">
                      <Button variant="ghost" size="sm" className="text-xs text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 p-0">
                        View Milestones →
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-orange-100 hover:shadow-md transition-shadow duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {analyticsData?.riskAnalysis?.budgetOverruns || 0}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-800">Budget Overruns</div>
                    <div className="mt-2 text-xs text-gray-500">Exceeding allocated budget</div>
                    <div className="mt-3 flex items-center">
                      <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-0">
                        View Details →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Completion Trends */}
            <Card className="p-6 border-none shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Completion Trends
                </h3>
                <Button variant="outline" size="sm" className="text-xs bg-white">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export Data
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-green-600" />
                    Monthly Completions
                  </h4>
                  <div className="space-y-3">
                    {analyticsData?.completionTrends?.monthlyCompletions?.map(
                      (month, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors duration-200"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {month.month}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-green-600 h-2.5 rounded-full"
                                style={{
                                  width: `${
                                    (month.completed / month.total) * 100
                                  }%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-16 text-right">
                              {month.completed}/{month.total}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Target className="h-4 w-4 mr-2 text-blue-600" />
                    Milestone Completion
                  </h4>
                  <div className="space-y-3">
                    {analyticsData?.completionTrends?.milestoneCompletion?.map(
                      (milestone, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md transition-colors duration-200"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {milestone.type}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{
                                  width: `${milestone.completionRate}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {milestone.completionRate}%
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
