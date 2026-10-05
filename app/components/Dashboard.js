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
  Shield,
  Info,
  Lock,
} from "lucide-react";
import { usePermissions } from "../hooks/usePermissions";
import RoleAllowanceModal from "./RoleAllowanceModal";

export default function Dashboard({ onSectionChange = () => {} }) {
  const { user, role, permissions, isAdmin, hasPermission } = usePermissions();
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);

  // Guard routing from dashboard so users cannot trigger navigation to sections they cannot access
  const SECTION_REQUIRED_PERMS = {
    "employee-add": "employee.create",
    "employees": "employee.read",
    "departments": "department.read",
    "designations": "designation.read",
    "contracts": "contract.read",
    "documents": "document.read",
    "document-expiry": "document.read",
    "admin-attendance": "attendance.view",
    "overtime-management": "overtime.view",
    "leave-approval": "leave.approve",
    "leave-balances": "leave.manage",
    "payroll": "payroll.view",
    "projects": "project.read",
    "work-locations": "location.read",
    "role-management": "role.manage",
    "universal-system-reports": "reports.read",
  };

  const handleSafeNavigate = (section) => {
    const req = SECTION_REQUIRED_PERMS[section];
    if (req && !hasPermission(req)) {
      return;
    }
    onSectionChange(section);
  };

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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold backdrop-blur-md border border-blue-400/20">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Enterprise HR & Workforce Intelligence</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAllowanceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md border border-emerald-400/30 transition-colors cursor-pointer"
                title="Click to review what your role is authorized to access"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Role: <strong>{role}</strong></span>
                <span className="text-[10px] bg-emerald-500/40 px-1.5 py-0.5 rounded-full ml-1">What can I access?</span>
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {isAdmin ? "HRM Executive Dashboard" : `${role.replace(/_/g, " ")} Workspace`}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              {role === "FINANCE"
                ? "Manage project financial budgets, compensation records, and payroll processing."
                : role === "PROJECT_MANAGER"
                ? "Monitor ongoing project milestones, budget allocations, and workforce team deployment."
                : role === "HR_MANAGER" || role === "HR_STAFF"
                ? "Oversee employee database records, onboarding compliance, document vault, and attendance."
                : "Monitor organizational performance, compliance, geofenced workforce operations, and payroll seamlessly."}
            </p>
          </div>

          {/* Action buttons & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {hasPermission("employee.create") && (
              <Button
                onClick={() => handleSafeNavigate("employee-add")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all transform active:scale-95 text-xs sm:text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )}
            {hasPermission("employee.read") && !hasPermission("employee.create") && (
              <Button
                onClick={() => handleSafeNavigate("employees")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-all text-xs sm:text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Staff Directory
              </Button>
            )}
            {(hasPermission("department.manage") || hasPermission("department.read")) && (
              <Button
                onClick={() => handleSafeNavigate("departments")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <Building className="w-4 h-4 mr-2" />
                Departments
              </Button>
            )}
            {hasPermission("attendance.view") && (
              <Button
                onClick={() => handleSafeNavigate("admin-attendance")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Attendance
              </Button>
            )}
            {hasPermission("leave.approve") && (
              <Button
                onClick={() => handleSafeNavigate("leave-approval")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Leave Approvals
              </Button>
            )}
            {hasPermission("payroll.view") && (
              <Button
                onClick={() => handleSafeNavigate("payroll")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payroll Hub
              </Button>
            )}
            {hasPermission("project.read") && (
              <Button
                onClick={() => handleSafeNavigate("projects")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Projects Hub
              </Button>
            )}
            {hasPermission("location.read") && (
              <Button
                onClick={() => handleSafeNavigate("work-locations")}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Work Sites
              </Button>
            )}
            {hasPermission("role.manage") && (
              <Button
                onClick={() => handleSafeNavigate("role-management")}
                variant="outline"
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border-purple-400/30 backdrop-blur font-medium transition-all text-xs sm:text-sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Access Control
              </Button>
            )}
            <Button
              onClick={() => setIsAllowanceModalOpen(true)}
              variant="outline"
              className="bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border-white/20 backdrop-blur text-xs font-medium transition-all"
            >
              <Info className="w-4 h-4 mr-1.5 text-blue-400" />
              Role Permissions
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

      {/* Primary KPI Cards (Dynamically filtered by user permissions) */}
      {(() => {
        const totalDepts = Object.keys(stats.departments || {}).length;
        const kpiCards = [
          hasPermission("employee.read") && {
            id: "employees",
            title: "Total Workforce",
            value: stats.totalEmployees,
            valueClass: "text-slate-900",
            badge: `${stats.activeEmployees || stats.totalEmployees} Active staff`,
            badgeIcon: TrendingUp,
            badgeClass: "text-emerald-600",
            icon: Users,
            gradient: "from-blue-500 to-indigo-600",
            iconBg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
            hoverBorder: "hover:border-blue-200",
            section: "employees",
          },
          hasPermission("department.read") && {
            id: "departments",
            title: "Departments",
            value: totalDepts,
            valueClass: "text-indigo-600",
            badge: `${totalDepts} Operational units`,
            badgeIcon: Building,
            badgeClass: "text-indigo-600",
            icon: Building,
            gradient: "from-indigo-500 to-purple-600",
            iconBg: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
            hoverBorder: "hover:border-indigo-200",
            section: "departments",
          },
          hasPermission("document.read") && {
            id: "documents",
            title: "Active Documents",
            value: stats.totalDocuments,
            valueClass: "text-slate-900",
            badge: `${stats.activeDocuments || stats.totalDocuments} Valid records`,
            badgeIcon: ShieldCheck,
            badgeClass: "text-slate-500",
            icon: FileText,
            gradient: "from-emerald-500 to-teal-600",
            iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
            hoverBorder: "hover:border-emerald-200",
            section: "documents",
          },
          hasPermission("document.read") && {
            id: "document-expiry",
            title: "Expiring Soon",
            value: stats.expiringDocuments,
            valueClass: "text-amber-600",
            badge: "Next 30 Days",
            badgeIcon: AlertCircle,
            badgeClass: "text-amber-600",
            icon: Clock,
            gradient: "from-amber-500 to-orange-500",
            iconBg: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
            hoverBorder: "hover:border-amber-200",
            section: "document-expiry",
          },
          hasPermission("document.read") && {
            id: "document-expired",
            title: "Expired Docs",
            value: stats.expiredDocuments,
            valueClass: "text-rose-600",
            badge: "Requires attention",
            badgeIcon: AlertCircle,
            badgeClass: "text-rose-600",
            icon: AlertTriangle,
            gradient: "from-rose-500 to-red-600",
            iconBg: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
            hoverBorder: "hover:border-rose-200",
            section: "document-expiry",
          },
          hasPermission("location.read") && {
            id: "work-locations",
            title: "Work Sites",
            value: stats.workLocationStats?.total || 0,
            valueClass: "text-purple-600",
            badge: `${stats.workLocationStats?.active || 0} Active geofences`,
            badgeIcon: Activity,
            badgeClass: "text-purple-600",
            icon: MapPin,
            gradient: "from-purple-500 to-indigo-600",
            iconBg: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
            hoverBorder: "hover:border-purple-200",
            section: "work-locations",
          },
          hasPermission("attendance.view") && {
            id: "attendance",
            title: "Today's Attendance",
            value: stats.attendanceToday?.present || 0,
            valueClass: "text-emerald-600",
            badge: "Checked in today",
            badgeIcon: CheckCircle2,
            badgeClass: "text-emerald-600",
            icon: Calendar,
            gradient: "from-emerald-500 to-teal-600",
            iconBg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
            hoverBorder: "hover:border-emerald-200",
            section: "admin-attendance",
          },
          hasPermission("payroll.view") && {
            id: "payroll",
            title: "Payroll System",
            value: "Active",
            valueClass: "text-indigo-600",
            badge: "Financial Hub",
            badgeIcon: DollarSign,
            badgeClass: "text-indigo-600",
            icon: DollarSign,
            gradient: "from-indigo-500 to-blue-600",
            iconBg: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
            hoverBorder: "hover:border-indigo-200",
            section: "payroll",
          },
          hasPermission("project.read") && {
            id: "projects",
            title: "Projects Hub",
            value: stats.projectsCount || "Active",
            valueClass: "text-violet-600",
            badge: "Milestones & Tasks",
            badgeIcon: Briefcase,
            badgeClass: "text-violet-600",
            icon: Briefcase,
            gradient: "from-violet-500 to-purple-600",
            iconBg: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
            hoverBorder: "hover:border-violet-200",
            section: "projects",
          },
          (hasPermission("leave.approve") || hasPermission("leave.manage")) && {
            id: "leave-approval",
            title: "Leave Management",
            value: "Active",
            valueClass: "text-teal-600",
            badge: "Approvals & Balances",
            badgeIcon: CheckCircle2,
            badgeClass: "text-teal-600",
            icon: CheckCircle2,
            gradient: "from-teal-500 to-emerald-600",
            iconBg: "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
            hoverBorder: "hover:border-teal-200",
            section: "leave-approval",
          },
        ].filter(Boolean);

        if (kpiCards.length === 0) return null;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              const BadgeIcon = card.badgeIcon;
              return (
                <Card
                  key={card.id}
                  className={`bg-white hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-100 ${card.hoverBorder} group relative overflow-hidden`}
                  onClick={() => handleSafeNavigate(card.section)}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {card.title}
                    </CardTitle>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${card.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-extrabold ${card.valueClass || "text-slate-900"}`}>
                      {card.value}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${card.badgeClass}`}>
                      {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                      <span>{card.badge}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Analytics Breakdown: Departments & Work Locations (Permission-guarded) */}
      {(() => {
        const canViewDepartments = hasPermission("department.read");
        const canViewLocations = hasPermission("location.read");

        if (!canViewDepartments && !canViewLocations) return null;

        const isBoth = canViewDepartments && canViewLocations;

        return (
          <div className={`grid grid-cols-1 ${isBoth ? "lg:grid-cols-2" : ""} gap-6`}>
            {/* Department Distribution */}
            {canViewDepartments && (
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
                  {(hasPermission("department.manage") || hasPermission("department.read")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSafeNavigate("departments")}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      Manage <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
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
            )}

            {/* Work Location Geofence Deployments */}
            {canViewLocations && (
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
                  {(hasPermission("location.manage") || hasPermission("location.read")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSafeNavigate("work-locations")}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      View Sites <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
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
            )}
          </div>
        );
      })()}

      {/* Direct Actions & Permitted Module Hubs */}
      {(() => {
        const allActionHubs = [
          {
            id: "employee-add",
            permission: "employee.create",
            title: "Add New Employee",
            description: "Register onboarding profile & biometric ID",
            icon: Users,
            iconClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
            border: "hover:border-blue-300",
          },
          {
            id: "employees",
            permission: "employee.read",
            title: "Employee Directory",
            description: "Browse personnel records, profiles & contracts",
            icon: Users,
            iconClass: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
            border: "hover:border-cyan-300",
          },
          {
            id: "departments",
            permission: "department.read",
            title: "Departments & Units",
            description: "Organize organizational structure and department divisions",
            icon: Building,
            iconClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
            border: "hover:border-indigo-300",
          },
          {
            id: "designations",
            permission: "designation.read",
            title: "Job Designations",
            description: "Manage company roles, job titles and designations",
            icon: Layers,
            iconClass: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
            border: "hover:border-purple-300",
          },
          {
            id: "contracts",
            permission: "contract.read",
            title: "Employee Contracts",
            description: "Monitor contract terms, renewals and validity dates",
            icon: FileText,
            iconClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
            border: "hover:border-emerald-300",
          },
          {
            id: "documents",
            permission: "document.read",
            title: "Document Vault",
            description: "Upload & audit employee compliance files",
            icon: FileText,
            iconClass: "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
            border: "hover:border-teal-300",
          },
          {
            id: "admin-attendance",
            permission: "attendance.view",
            title: "Attendance & GPS",
            description: "Review check-ins, exceptions & daily logs",
            icon: Calendar,
            iconClass: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
            border: "hover:border-amber-300",
          },
          {
            id: "overtime-management",
            permission: "overtime.view",
            title: "Overtime Management",
            description: "Track overtime requests, hours and approvals",
            icon: Clock,
            iconClass: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
            border: "hover:border-orange-300",
          },
          {
            id: "leave-approval",
            permission: "leave.approve",
            title: "Leave Approvals",
            description: "Review pending employee vacation & sick leaves",
            icon: CheckCircle2,
            iconClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
            border: "hover:border-emerald-300",
          },
          {
            id: "payroll",
            permission: "payroll.view",
            title: "Payroll Processing",
            description: "Calculate compensation, tax & generate payslips",
            icon: DollarSign,
            iconClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
            border: "hover:border-indigo-300",
          },
          {
            id: "projects",
            permission: "project.read",
            title: "Projects & Tasks",
            description: "Track project milestones, tasks & allocations",
            icon: Briefcase,
            iconClass: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
            border: "hover:border-violet-300",
          },
          {
            id: "work-locations",
            permission: "location.read",
            title: "Work Locations & GPS",
            description: "Manage geofence sites and site personnel",
            icon: MapPin,
            iconClass: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
            border: "hover:border-purple-300",
          },
          {
            id: "role-management",
            permission: "role.manage",
            title: "Access Control & Roles",
            description: "Configure system roles, access rules & assignments",
            icon: Shield,
            iconClass: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
            border: "hover:border-rose-300",
          },
          {
            id: "universal-system-reports",
            permission: "reports.read",
            title: "System Reports & Audits",
            description: "Generate executive and departmental analytics",
            icon: TrendingUp,
            iconClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
            border: "hover:border-blue-300",
          },
        ];

        const allowedHubs = allActionHubs.filter((hub) => hasPermission(hub.permission));

        if (allowedHubs.length === 0) return null;

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isAdmin ? "Direct Actions & Hubs" : `Authorized Actions for ${role.replace(/_/g, " ")}`}
                </h2>
                <span className="text-xs text-slate-400">
                  Showing {allowedHubs.length} modules permitted by your role assignment
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAllowanceModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View all permissions <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allowedHubs.map((hub) => {
                const Icon = hub.icon;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSafeNavigate(hub.id)}
                    className={`flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 ${hub.border} hover:shadow-md transition-all duration-200 text-left group`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all ${hub.iconClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {hub.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {hub.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Role Allowance Modal */}
      <RoleAllowanceModal
        isOpen={isAllowanceModalOpen}
        onClose={() => setIsAllowanceModalOpen(false)}
        onNavigateSection={onSectionChange}
      />
    </div>
  );
}
