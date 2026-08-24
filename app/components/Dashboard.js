"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Building,
  MapPin,
  TrendingUp,
  Activity,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";

export default function Dashboard({ onSectionChange = () => {} }) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDocuments: 0,
    expiringDocuments: 0,
    expiredDocuments: 0,
    activeDocuments: 0,
    departments: {},
    workLocationStats: {
      total: 0,
      active: 0,
      totalEmployeesAssigned: 0,
      employeesWithoutLocation: 0,
      topLocations: [],
    },
    attendanceToday: {
      present: 0,
      date: "",
    },
    projectsCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);

    try {
      // 1. Fetch from high-performance unified stats endpoint
      const res = await fetch("/api/dashboard/stats", {
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
          setLastUpdated(new Date().toLocaleTimeString());
          setLoading(false);
          if (isManualRefresh) setRefreshing(false);
          return;
        }
      }

      // Fallback: parallel fetch from individual endpoints if unified stats fails
      const [empRes, docRes, locRes] = await Promise.allSettled([
        fetch("/api/employee").then((r) => r.json()),
        fetch("/api/documents/stats").then((r) => r.json()),
        fetch("/api/work-locations/stats").then((r) => r.json()),
      ]);

      const employeesData =
        empRes.status === "fulfilled" ? empRes.value : { employees: [] };
      const documentStats =
        docRes.status === "fulfilled" ? docRes.value : {};
      const workLocationData =
        locRes.status === "fulfilled" ? locRes.value : {};

      const departments = {};
      const locations = {};

      if (employeesData.success && Array.isArray(employeesData.employees)) {
        employeesData.employees.forEach((emp) => {
          const dept =
            emp.department || emp.personalDetails?.department || "General";
          departments[dept] = (departments[dept] || 0) + 1;

          const locationKey =
            typeof emp.workLocation === "object" && emp.workLocation?.name
              ? emp.workLocation.name
              : typeof emp.workLocation === "string" && emp.workLocation
              ? emp.workLocation
              : "Unassigned";
          locations[locationKey] = (locations[locationKey] || 0) + 1;
        });
      }

      setStats({
        totalEmployees: employeesData.employees?.length || 0,
        activeEmployees: employeesData.employees?.length || 0,
        totalDocuments: documentStats.total || 0,
        expiringDocuments: documentStats.expiring || 0,
        expiredDocuments: documentStats.expired || 0,
        activeDocuments: documentStats.active || 0,
        departments,
        workLocationStats: workLocationData.success
          ? workLocationData.stats
          : {
              total: 0,
              active: 0,
              totalEmployeesAssigned: 0,
              employeesWithoutLocation: 0,
              topLocations: [],
            },
        attendanceToday: { present: 0, date: "" },
        projectsCount: 0,
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError("Unable to load live statistics. Showing cached data.");
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getTopDepartments = () => {
    return Object.entries(stats.departments || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  const getTopLocations = () => {
    if (
      stats.workLocationStats?.topLocations &&
      stats.workLocationStats.topLocations.length > 0
    ) {
      return stats.workLocationStats.topLocations.map((loc) => [
        loc.name,
        loc.employeeCount,
      ]);
    }
    return [];
  };

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-44 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-300 w-full" />

        {/* 5 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white border border-slate-100 p-5 space-y-3"
            >
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-6 bg-slate-200 rounded-full" />
              </div>
              <div className="h-8 w-16 bg-slate-300 rounded" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Grid Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-2xl bg-white border border-slate-100 p-6 space-y-4" />
          <div className="h-64 rounded-2xl bg-white border border-slate-100 p-6 space-y-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 border border-slate-700/50">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-md border border-blue-400/20 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Enterprise HR & Workforce Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              HRM Executive Dashboard
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Monitor organizational performance, compliance, geofenced workforce operations, and payroll seamlessly.
            </p>
          </div>

          {/* Action buttons & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => onSectionChange("employee-add")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all transform active:scale-95"
            >
              <Users className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
            <Button
              onClick={() => onSectionChange("payroll")}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Payroll Hub
            </Button>
            <Button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              variant="ghost"
              size="icon"
              title="Refresh statistics"
              className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-400" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Live status bar at bottom of hero */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Status: <strong className="text-white font-medium">Operational</strong>
            </span>
            {stats.attendanceToday?.present > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {stats.attendanceToday.present} checked in today
              </span>
            )}
          </div>
          <div className="text-slate-400">
            Last synced: <span className="text-slate-200 font-mono">{lastUpdated || "Just now"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Total Employees */}
        <Card
          className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 hover:border-blue-200 group relative overflow-hidden"
          onClick={() => onSectionChange("employees")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Workforce
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {stats.totalEmployees}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.activeEmployees || stats.totalEmployees} Active staff</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Documents */}
        <Card
          className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 hover:border-emerald-200 group relative overflow-hidden"
          onClick={() => onSectionChange("documents")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Documents
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">
              {stats.totalDocuments}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{stats.activeDocuments || stats.totalDocuments} Valid records</span>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card
          className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 hover:border-amber-200 group relative overflow-hidden"
          onClick={() => onSectionChange("document-expiry")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expiring Soon
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-600">
              {stats.expiringDocuments}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Next 30 Days</span>
            </div>
          </CardContent>
        </Card>

        {/* Expired Documents */}
        <Card
          className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 hover:border-rose-200 group relative overflow-hidden"
          onClick={() => onSectionChange("document-expiry")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expired Docs
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-rose-600">
              {stats.expiredDocuments}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Requires attention</span>
            </div>
          </CardContent>
        </Card>

        {/* Work Locations */}
        <Card
          className="bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 hover:border-purple-200 group relative overflow-hidden"
          onClick={() => onSectionChange("work-locations")}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Work Sites
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <MapPin className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600">
              {stats.workLocationStats?.total || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-purple-600">
              <Activity className="w-3.5 h-3.5" />
              <span>{stats.workLocationStats?.active || 0} Active geofences</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Breakdown: Departments & Work Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Department Distribution
                </CardTitle>
                <p className="text-xs text-slate-400">Workforce breakdown by division</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange("departments")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {getTopDepartments().map(([dept, count]) => {
                const percentage = stats.totalEmployees
                  ? Math.round((count / stats.totalEmployees) * 100)
                  : 0;
                return (
                  <div key={dept} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700">{dept}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          {percentage}%
                        </span>
                        <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700">
                          {count} {count === 1 ? "staff" : "staff"}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {Object.keys(stats.departments || {}).length === 0 && (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Building className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-medium">No department data recorded yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Location Geofence Deployments */}
        <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Geofenced Work Locations
                </CardTitle>
                <p className="text-xs text-slate-400">Staff assignment by physical sites</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSectionChange("work-locations")}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View Sites <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {getTopLocations().map(([location, count]) => {
                const totalAssigned =
                  stats.workLocationStats?.totalEmployeesAssigned || stats.totalEmployees || 1;
                const percentage = Math.round(((count || 0) / totalAssigned) * 100);
                return (
                  <div key={location} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700">{location}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          {percentage}%
                        </span>
                        <Badge variant="outline" className="text-xs font-semibold border-purple-200 text-purple-700 bg-purple-50/50">
                          {count || 0} assigned
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {stats.workLocationStats?.employeesWithoutLocation > 0 && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-sm font-medium text-amber-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Unassigned Employees
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {stats.workLocationStats.employeesWithoutLocation} pending
                  </Badge>
                </div>
              )}

              {getTopLocations().length === 0 && (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm font-medium">No work locations registered yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Direct Actions & Hubs</h2>
          <span className="text-xs text-slate-400">Fast shortcuts to primary modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onSectionChange("employee-add")}
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                Add New Employee
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Register onboarding profile & biometric ID
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSectionChange("documents")}
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                Document Vault
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload & audit employee compliance files
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSectionChange("admin-attendance")}
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-300 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                Attendance & GPS
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Review check-ins, exceptions & daily logs
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSectionChange("payroll")}
            className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                Payroll Processing
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Calculate compensation, tax & generate payslips
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
