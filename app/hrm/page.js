"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "../components/Layout";
import SectionSkeleton from "../components/ui/SectionSkeleton";

// Dynamically import all heavy components with smooth skeleton loaders
const Dashboard = dynamic(() => import("../components/Dashboard"), {
  loading: () => <SectionSkeleton title="Loading Dashboard..." />,
  ssr: false,
});
const EmployeeDatabase = dynamic(() => import("../components/EmployeeDatabase"), {
  loading: () => <SectionSkeleton title="Loading Employees..." />,
  ssr: false,
});
const DocumentManager = dynamic(() => import("../components/DocumentManager"), {
  loading: () => <SectionSkeleton title="Loading Documents..." />,
  ssr: false,
});
const NotificationManager = dynamic(() => import("../components/NotificationManager"), {
  loading: () => <SectionSkeleton title="Loading Notifications..." />,
  ssr: false,
});
const AttendanceReporting = dynamic(() => import("../components/AttendanceReporting"), {
  loading: () => <SectionSkeleton title="Loading Attendance Reporting..." />,
  ssr: false,
});
const ManagerLeaveApproval = dynamic(() => import("../components/ManagerLeaveApproval"), {
  loading: () => <SectionSkeleton title="Loading Leave Approval..." />,
  ssr: false,
});
const AdminLeaveHistory = dynamic(() => import("../components/AdminLeaveHistory"), {
  loading: () => <SectionSkeleton title="Loading Leave History..." />,
  ssr: false,
});
const AdminLeaveBalanceManagement = dynamic(() => import("../components/AdminLeaveBalanceManagement"), {
  loading: () => <SectionSkeleton title="Loading Leave Balances..." />,
  ssr: false,
});
const EthiopianCalendar = dynamic(() => import("../components/EthiopianCalendar"), {
  loading: () => <SectionSkeleton title="Loading Calendar..." />,
  ssr: false,
});
const IntegratedPayrollSystem = dynamic(() => import("../components/IntegratedPayrollSystem"), {
  loading: () => <SectionSkeleton title="Loading Payroll System..." />,
  ssr: false,
});
const EmployeeLocationManagement = dynamic(() => import("../components/EmployeeLocationManagement"), {
  loading: () => <SectionSkeleton title="Loading Employee Locations..." />,
  ssr: false,
});
const WorkLocationsManagement = dynamic(() => import("../components/WorkLocationsManagement"), {
  loading: () => <SectionSkeleton title="Loading Work Locations..." />,
  ssr: false,
});
const ProjectsManagement = dynamic(() => import("../components/ProjectsManagement"), {
  loading: () => <SectionSkeleton title="Loading Projects..." />,
  ssr: false,
});
const CategoryManagement = dynamic(() => import("../components/CategoryManagement"), {
  loading: () => <SectionSkeleton title="Loading Categories..." />,
  ssr: false,
});
const BudgetManagement = dynamic(() => import("../components/BudgetManagement"), {
  loading: () => <SectionSkeleton title="Loading Budget Management..." />,
  ssr: false,
});
const DepartmentsManagement = dynamic(() => import("../components/DepartmentsManagement"), {
  loading: () => <SectionSkeleton title="Loading Departments..." />,
  ssr: false,
});
const DesignationsManagement = dynamic(() => import("../components/DesignationsManagement"), {
  loading: () => <SectionSkeleton title="Loading Designations..." />,
  ssr: false,
});
const ContractsManagement = dynamic(() => import("../components/ContractsManagement"), {
  loading: () => <SectionSkeleton title="Loading Contracts..." />,
  ssr: false,
});
const AdminAttendanceManagement = dynamic(() => import("../components/AdminAttendanceManagement"), {
  loading: () => <SectionSkeleton title="Loading Admin Attendance..." />,
  ssr: false,
});
const AdminOvertimeManagement = dynamic(() => import("../components/AdminOvertimeManagement"), {
  loading: () => <SectionSkeleton title="Loading Overtime Management..." />,
  ssr: false,
});
const AllAttendance = dynamic(() => import("../components/AllAttendance"), {
  loading: () => <SectionSkeleton title="Loading All Attendance..." />,
  ssr: false,
});
const EmployeeStatistics = dynamic(() => import("../components/EmployeeStatistics"), {
  loading: () => <SectionSkeleton title="Loading Statistics..." />,
  ssr: false,
});
const DepartmentAnalytics = dynamic(() => import("../components/DepartmentAnalytics"), {
  loading: () => <SectionSkeleton title="Loading Analytics..." />,
  ssr: false,
});
const DocumentReports = dynamic(() => import("../components/DocumentReports"), {
  loading: () => <SectionSkeleton title="Loading Document Reports..." />,
  ssr: false,
});
const DocumentInventoryReport = dynamic(() => import("../components/DocumentInventoryReport"), {
  loading: () => <SectionSkeleton title="Loading Document Inventory..." />,
  ssr: false,
});
const DocumentExpiryComplianceReport = dynamic(() => import("../components/DocumentExpiryComplianceReport"), {
  loading: () => <SectionSkeleton title="Loading Expiry Compliance..." />,
  ssr: false,
});
const SiteLocationMasterReport = dynamic(() => import("../components/SiteLocationMasterReport"), {
  loading: () => <SectionSkeleton title="Loading Site Master Report..." />,
  ssr: false,
});
const SiteAttendanceComplianceReport = dynamic(() => import("../components/SiteAttendanceComplianceReport"), {
  loading: () => <SectionSkeleton title="Loading Site Attendance..." />,
  ssr: false,
});
const WorkForceDistributionReport = dynamic(() => import("../components/WorkforceDistributionReport"), {
  loading: () => <SectionSkeleton title="Loading Workforce Distribution..." />,
  ssr: false,
});
const LeaveManagementReports = dynamic(() => import("../components/LeaveManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Leave Reports..." />,
  ssr: false,
});
const PayrollManagementReports = dynamic(() => import("../components/PayrollManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Payroll Reports..." />,
  ssr: false,
});
const ProjectManagementReports = dynamic(() => import("../components/ProjectManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Project Reports..." />,
  ssr: false,
});
const CrossSystemExecutiveReports = dynamic(() => import("../components/CrossSystemExecutiveReports"), {
  loading: () => <SectionSkeleton title="Loading Executive Reports..." />,
  ssr: false,
});
const UniversalSystemReports = dynamic(() => import("../components/UniversalSystemReports"), {
  loading: () => <SectionSkeleton title="Loading Universal Reports..." />,
  ssr: false,
});
const EmployeeManagementReports = dynamic(() => import("../components/EmployeeManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Employee Reports..." />,
  ssr: false,
});
const OrganizationManagementReports = dynamic(() => import("../components/OrganizationManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Org Reports..." />,
  ssr: false,
});
const DocumentManagementReports = dynamic(() => import("../components/DocumentManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Doc Reports..." />,
  ssr: false,
});
const WorkLocationManagementReports = dynamic(() => import("../components/WorkLocationManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Location Reports..." />,
  ssr: false,
});
const AttendanceManagementReports = dynamic(() => import("../components/AttendanceManagementReports"), {
  loading: () => <SectionSkeleton title="Loading Attendance Reports..." />,
  ssr: false,
});
const EmployeeMasterReport = dynamic(() => import("../components/EmployeeMasterReport"), {
  loading: () => <SectionSkeleton title="Loading Master Report..." />,
  ssr: false,
});
const EmployeeAllocationReport = dynamic(() => import("../components/EmployeeAllocationReport"), {
  loading: () => <SectionSkeleton title="Loading Allocation Report..." />,
  ssr: false,
});
const EmployeeLifecycleReport = dynamic(() => import("../components/EmployeeLifecycleReport"), {
  loading: () => <SectionSkeleton title="Loading Lifecycle Report..." />,
  ssr: false,
});
const OrganizationalStructureReport = dynamic(() => import("../components/OrganizationalStructureReport"), {
  loading: () => <SectionSkeleton title="Loading Org Structure..." />,
  ssr: false,
});
const RolePermissionAuditReport = dynamic(() => import("../components/RolePermissionAuditReport"), {
  loading: () => <SectionSkeleton title="Loading Permission Audit..." />,
  ssr: false,
});
const DepartmentPerformanceReport = dynamic(() => import("../components/DepartmentPerformanceReport"), {
  loading: () => <SectionSkeleton title="Loading Performance Report..." />,
  ssr: false,
});

export default function HRMDashboard() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Sync active section from route query (?section=... and ?tab=... for tabbed reports)
  useEffect(() => {
    const section = searchParams?.get("section");
    const tab = searchParams?.get("tab");
    if ((section === "executive-reports" || section === "universal-system-reports") && tab) {
      setActiveSection(tab);
    } else if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

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
    setActiveSection(section);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-800">Loading HRM System</h3>
          <p className="text-sm text-slate-500 mt-1">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onSectionChange={handleSectionChange} />;
      case "employee-database":
      case "employees":
        return <EmployeeDatabase />;
      case "employee-location":
        return <EmployeeLocationManagement />;
      case "employee-add":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Add New Employee</h2>
            <EmployeeDatabase />
          </div>
        );
      case "employee-search":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Search Employees</h2>
            <EmployeeDatabase />
          </div>
        );
      case "document-list":
      case "documents":
        return <DocumentManager />;
      case "document-upload":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Upload Document</h2>
            <DocumentManager />
          </div>
        );
      case "document-expiry":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Document Expiry Alerts</h2>
            <DocumentManager />
          </div>
        );
      case "employee-stats":
        return <EmployeeStatistics />;
      case "department-stats":
        return <DepartmentAnalytics />;
      case "document-stats":
        return <DocumentReports />;
      case "document-inventory-report":
        return <DocumentInventoryReport />;
      case "document-expiry-compliance-report":
        return <DocumentExpiryComplianceReport />;
      case "site-location-master-report":
        return <SiteLocationMasterReport />;
      case "site-attendance-compliance-report":
        return <SiteAttendanceComplianceReport />;
      case "workforce-distribution-report":
      case "workforce-distribution-site-report":
        return <WorkForceDistributionReport />;
      case "departments":
        return <DepartmentsManagement />;
      case "designations":
        return <DesignationsManagement />;
      case "locations":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Work Locations</h2>
            <WorkLocationsManagement />
          </div>
        );
      case "hierarchy":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Organization Hierarchy</h2>
            <OrganizationalStructureReport />
          </div>
        );
      case "notifications":
        return <NotificationManager />;
      case "calendar":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="mb-4 text-slate-700 font-semibold">Ethiopian Calendar View</div>
            <EthiopianCalendar />
          </div>
        );
      case "settings":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Settings</h2>
            <p className="text-slate-600">System settings configured automatically.</p>
          </div>
        );
      case "work-locations":
        return <WorkLocationsManagement />;
      case "projects":
        return <ProjectsManagement />;
      case "project-categories":
        return <CategoryManagement />;
      case "budget-management":
        return <BudgetManagement />;
      case "contracts":
        return <ContractsManagement />;
      case "attendance-reports":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <AttendanceReporting />
          </div>
        );
      case "attendance-all":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <AllAttendance />
          </div>
        );
      case "payroll":
      case "payroll-integration":
      case "payroll-calculator":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <IntegratedPayrollSystem />
          </div>
        );
      case "admin-attendance":
        return <AdminAttendanceManagement />;
      case "overtime-management":
      case "admin-overtime":
        return <AdminOvertimeManagement />;
      case "employee-setup":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Employee Setup</h2>
            <EmployeeDatabase />
          </div>
        );
      case "employee-login":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Employee Login</h2>
            <p className="text-slate-600">Employee credentials management.</p>
          </div>
        );
      case "attendance-daily":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <AllAttendance />
          </div>
        );
      case "attendance-documents":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <DocumentManager />
          </div>
        );
      case "attendance-legacy":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <AttendanceReporting />
          </div>
        );
      case "leave-approval":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <ManagerLeaveApproval />
          </div>
        );
      case "leave-history":
        return <AdminLeaveHistory />;
      case "leave-balances":
        return <AdminLeaveBalanceManagement />;
      case "leave-reports":
        return <LeaveManagementReports />;
      case "payroll-reports":
        return <PayrollManagementReports />;
      case "project-reports":
        return <ProjectManagementReports />;
      case "attendance-management-reports":
        return <AttendanceManagementReports />;
      case "employee-management-reports":
        return <EmployeeManagementReports />;
      case "document-management-reports":
        return <DocumentManagementReports />;
      case "work-location-management-reports":
        return <WorkLocationManagementReports />;
      case "organization-management-reports":
        return <OrganizationManagementReports />;
      case "executive-reports":
      case "system-health":
      case "compliance-audit":
      case "workforce-productivity-roi":
      case "executive-dashboard":
        return (
          <CrossSystemExecutiveReports
            initialTab={
              activeSection === "executive-reports"
                ? searchParams?.get("tab") || undefined
                : activeSection
            }
          />
        );
      case "universal-system-reports":
      case "completed-activities":
      case "workflow-bottlenecks":
      case "user-activity-security":
        return (
          <UniversalSystemReports
            initialTab={
              activeSection === "universal-system-reports"
                ? searchParams?.get("tab") || undefined
                : activeSection
            }
          />
        );
      case "employee-master-report":
      case "employee-reports":
        return <EmployeeMasterReport />;
      case "employee-allocation-report":
        return <EmployeeAllocationReport />;
      case "employee-lifecycle-report":
        return <EmployeeLifecycleReport />;
      case "organizational-structure-report":
        return <OrganizationalStructureReport />;
      case "role-permission-audit-report":
        return <RolePermissionAuditReport />;
      case "department-performance-report":
        return <DepartmentPerformanceReport />;
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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {renderContent()}
      </div>
    </Layout>
  );
}
