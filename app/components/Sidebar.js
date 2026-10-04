"use client";
import React, { useState, useEffect } from "react";
import { useSidebarStore } from "./useSidebarStore";
import { useRouter } from "next/navigation";
import { usePermissions } from "../hooks/usePermissions";
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Home,
  Search,
  Bell,
  Calendar,
  Building,
  MapPin,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  Briefcase,
  Milestone,
  AlertTriangle,
  UserPlus,
  LineChart,
  DollarSign,
  Calculator,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const Sidebar = ({
  activeSection,
  onSectionChange = () => {},
  isCollapsed: isCollapsedProp,
  onToggleCollapse: onToggleCollapseProp,
  user: userProp = null,
}) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState({});
  const isCollapsedStore = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const { user: hookUser, hasPermission: hookHasPermission, hasAnyPermission: hookHasAnyPermission, isAdmin: hookIsAdmin } = usePermissions();

  const user = userProp || hookUser;
  const isAdmin = (user?.role === "ADMIN") || hookIsAdmin;
  const hasPermission = (perm) => {
    if (isAdmin) return true;
    if (user?.permissions?.includes("*")) return true;
    if (!perm) return true;
    if (user?.permissions?.includes(perm)) return true;
    if (perm === "project.read" && (user?.permissions?.includes("project.read.assigned") || user?.permissions?.includes("project.read.own") || user?.permissions?.includes("project.manage"))) {
      return true;
    }
    return hookHasPermission(perm);
  };
  const hasAnyPermission = (perms) => {
    if (isAdmin) return true;
    if (user?.permissions?.includes("*")) return true;
    if (!Array.isArray(perms) || perms.length === 0) return true;
    return perms.some((p) => hasPermission(p));
  };

  // Prefer props (for backward compatibility), else use store
  const isCollapsed =
    typeof isCollapsedProp === "boolean" ? isCollapsedProp : isCollapsedStore;
  const onToggleCollapse = () => {
    if (typeof onToggleCollapseProp === "function") {
      onToggleCollapseProp();
    } else {
      const next = !useSidebarStore.getState().isCollapsed;
      toggleCollapsed();
      try {
        window.localStorage.setItem("layout:isSidebarCollapsed", String(next));
      } catch {}
    }
  };

  // Auto-expand menus when related sections are active
  useEffect(() => {
    if (
      activeSection === "attendance-reports" ||
      activeSection === "admin-attendance" ||
      activeSection === "employee-setup" ||
      activeSection === "employee-login" ||
      activeSection === "attendance-daily" ||
      activeSection === "attendance-documents" ||
      activeSection === "attendance-legacy" ||
      activeSection === "payroll-integration" ||
      activeSection === "employee-master-report" ||
      activeSection === "employee-reports" ||
      activeSection === "employee-allocation-report" ||
      activeSection === "employee-lifecycle-report" ||
      activeSection === "employee-management-reports" ||
      activeSection === "organization-management-reports" ||
      activeSection === "document-management-reports" ||
      activeSection === "work-location-management-reports" ||
      activeSection === "document-access-audit-report" ||
      activeSection === "document-stats" ||
      activeSection === "site-location-master-report" ||
      activeSection === "site-attendance-compliance-report" ||
      activeSection === "workforce-distribution-report" ||
      activeSection === "leave-reports" ||
      activeSection === "payroll-reports" ||
      activeSection === "project-reports" ||
      activeSection === "executive-reports" ||
      activeSection === "universal-system-reports" ||
      activeSection === "completed-activities" ||
      activeSection === "workflow-bottlenecks" ||
      activeSection === "user-activity-security" ||
      activeSection === "employee-portal-audit" ||
      activeSection === "attendance-management-reports"
    ) {
      setExpandedMenus((prev) => ({
        ...prev,
        analytics: true,
      }));
    }

    // Auto-expand leave management menu when leave sections are active
    if (
      activeSection === "leave-approval" ||
      activeSection === "leave-balances" ||
      activeSection === "leave-reports"
    ) {
      setExpandedMenus((prev) => ({
        ...prev,
        "leave-management": true,
      }));
    }

    // Auto-expand project management menu when project sections are active
    if (
      activeSection === "projects" ||
      activeSection === "projects-list" ||
      activeSection === "project-milestones" ||
      activeSection === "project-team" ||
      activeSection === "project-alerts" ||
      activeSection === "project-reports" ||
      activeSection === "project-budget" ||
      activeSection === "project-finances" ||
      activeSection === "project-categories" ||
      activeSection === "budget-management"
    ) {
      setExpandedMenus((prev) => ({
        ...prev,
        project: true,
      }));
    }

    // Auto-expand employee management menu
    if (
      activeSection === "employees" ||
      activeSection === "employee-location" ||
      activeSection === "contracts"
    ) {
      setExpandedMenus((prev) => ({ ...prev, employees: true }));
    }

    // Auto-expand attendance menu
    if (
      activeSection === "admin-attendance" ||
      activeSection === "attendance-all" ||
      activeSection === "attendance-reports" ||
      activeSection === "overtime-management" ||
      activeSection === "admin-overtime"
    ) {
      setExpandedMenus((prev) => ({ ...prev, attendance: true }));
    }

    // Auto-expand organization menu
    if (activeSection === "departments" || activeSection === "designations") {
      setExpandedMenus((prev) => ({ ...prev, organization: true }));
    }

    // Auto-expand access control menu
    if (activeSection === "role-management" || activeSection === "user-role-assignment") {
      setExpandedMenus((prev) => ({ ...prev, "access-control": true }));
    }
  }, [activeSection]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/hrm",
    },
    {
      id: "organization",
      label: "Organization",
      icon: Building,
      submenu: [
        {
          id: "departments",
          label: "Departments",
          path: "/hrm?section=departments",
          requiredPermission: "department.read",
        },
        {
          id: "designations",
          label: "Designations",
          path: "/hrm?section=designations",
          requiredPermission: "designation.read",
        },
      ],
    },
    {
      id: "employees",
      label: "Employee Management",
      icon: Users,
      submenu: [
        {
          id: "employees",
          label: "Employees",
          path: "/hrm?section=employees",
          requiredPermission: "employee.read",
        },
        {
          id: "employee-location",
          label: "Employee Location",
          path: "/hrm?section=employee-location",
          requiredPermission: "location.read",
        },
        {
          id: "contracts",
          label: "Contracts",
          path: "/hrm?section=contracts",
          requiredPermission: "contract.read",
        },
      ],
    },
    {
      id: "documents",
      label: "Document Management",
      icon: FileText,
      path: "/hrm?section=documents",
      requiredPermission: "document.read",
    },
    {
      id: "work-locations",
      label: "Work Locations",
      icon: MapPin,
      path: "/hrm?section=work-locations",
      requiredPermission: "location.read",
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Calendar,
      submenu: [
        {
          id: "admin-attendance",
          label: "Admin Management",
          path: "/hrm?section=admin-attendance",
          requiredPermission: "attendance.view",
        },
        {
          id: "overtime-management",
          label: "Overtime Management",
          path: "/hrm?section=overtime-management",
          requiredPermission: "overtime.view",
        },
        {
          id: "attendance-all",
          label: "All Attendance",
          path: "/hrm?section=attendance-all",
          requiredPermission: "attendance.view",
        },
        {
          id: "attendance-documents",
          label: "Attendance Documents",
          path: "/hrm?section=attendance-documents",
          requiredPermission: "attendance.view",
        },
        {
          id: "attendance-reports",
          label: "Attendance Reports",
          path: "/hrm?section=attendance-reports",
          requiredPermission: "reports.attendance",
        },
      ],
    },
    {
      id: "payroll",
      label: "Payroll",
      icon: Calculator,
      path: "/hrm?section=payroll",
      requiredPermission: "payroll.view",
    },
    {
      id: "leave-management",
      label: "Leave Management",
      icon: Calendar,
      submenu: [
        {
          id: "leave-approval",
          label: "Leave Approval",
          path: "/hrm?section=leave-approval",
          requiredPermission: "leave.approve",
        },
        {
          id: "leave-history",
          label: "Leave Request History",
          path: "/hrm?section=leave-history",
          requiredPermission: "leave.view.all",
        },
        {
          id: "leave-balances",
          label: "Leave Balances",
          path: "/hrm?section=leave-balances",
          requiredPermission: "leave.manage",
        },
      ],
    },
    {
      id: "project",
      label: "Project",
      icon: Briefcase,
      submenu: [
        {
          id: "projects",
          label: "Projects",
          path: "/hrm?section=projects",
          requiredPermission: "project.read",
        },
        {
          id: "category-management",
          label: "Category Management",
          path: "/hrm?section=project-categories",
          requiredPermission: "project.read",
        },
        {
          id: "budget-management",
          label: "Budget Management",
          path: "/hrm?section=budget-management",
          requiredPermission: "project.budget",
        },
      ],
    },
    {
      id: "access-control",
      label: "Access Control",
      icon: Shield,
      requiredPermission: "role.manage",
      submenu: [
        {
          id: "role-management",
          label: "Role Management",
          path: "/hrm?section=role-management",
          requiredPermission: "role.manage",
        },
        {
          id: "user-role-assignment",
          label: "User Assignments",
          path: "/hrm?section=user-role-assignment",
          requiredPermission: "role.manage",
        },
      ],
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      path: "/hrm?section=calendar",
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: BarChart3,
      submenu: [
        {
          id: "attendance-management-reports",
          label: "Attendance Management Reports",
          path: "/hrm?section=attendance-management-reports",
          requiredPermission: "reports.attendance",
        },
        {
          id: "employee-management-reports",
          label: "Employee Management Reports",
          path: "/hrm?section=employee-management-reports",
          requiredPermission: "reports.employee",
        },
        {
          id: "organization-management-reports",
          label: "Organization Management Reports",
          path: "/hrm?section=organization-management-reports",
          requiredPermission: "reports.organization",
        },
        {
          id: "document-management-reports",
          label: "Document Management Reports",
          path: "/hrm?section=document-management-reports",
          requiredPermission: "reports.document",
        },
        {
          id: "work-location-management-reports",
          label: "Work Location Management Reports",
          path: "/hrm?section=work-location-management-reports",
          requiredPermission: "reports.location",
        },
        {
          id: "leave-reports",
          label: "Leave Management Reports",
          path: "/hrm?section=leave-reports",
          requiredPermission: "reports.leave",
        },
        {
          id: "payroll-reports",
          label: "Payroll Management Reports",
          path: "/hrm?section=payroll-reports",
          requiredPermission: "reports.payroll",
        },
        {
          id: "project-reports",
          label: "Project Management Reports",
          path: "/hrm?section=project-reports",
          requiredPermission: "reports.project",
        },
        {
          id: "executive-reports",
          label: "Cross-System & Executive Reports",
          path: "/hrm?section=executive-reports",
          requiredPermission: "reports.executive",
        },
        {
          id: "universal-system-reports",
          label: "Universal System Reports",
          path: "/hrm?section=universal-system-reports",
          requiredPermission: "reports.read",
        },
      ],
    },
    /*{
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/hrm?section=settings",
    },*/
  ];

  const toggleSubmenu = (menuId) => {
    if (isCollapsed) return;
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleMenuClick = (item) => {
    if (item.submenu) {
      if (isCollapsed) {
        // When collapsed, expand sidebar first then open the menu
        onToggleCollapse();
        setTimeout(() => {
          setExpandedMenus((prev) => ({ ...prev, [item.id]: true }));
        }, 50);
      } else {
        toggleSubmenu(item.id);
      }
    } else {
      if (item.id === "dashboard") {
        router.push("/hrm");
        onSectionChange("dashboard");
      } else {
        const path = item.path || `/hrm?section=${item.id}`;
        router.push(path);
        onSectionChange(item.id);
      }
    }
  };

  const handleSubmenuClick = (parentId, submenuItem) => {
    const path = submenuItem.path || `/hrm?section=${submenuItem.id}`;
    if (typeof onSectionChange === "function") {
      onSectionChange(submenuItem.id);
    }
    router.push(path);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        role="navigation"
        aria-label="Primary"
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl transition-all duration-300 z-50 flex flex-col overflow-hidden ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center border-b border-slate-700 flex-shrink-0 ${
            isCollapsed ? "justify-center p-3" : "justify-between p-4"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">HRM System</h1>
                <p className="text-xs text-slate-300">Human Resources</p>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={!isCollapsed}
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" strokeWidth={2.2} />
            ) : (
              <PanelLeftClose className="w-5 h-5" strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 py-3 overflow-y-auto overflow-x-hidden"
          aria-label="Main menu"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#475569 #1e293b",
          }}
        >
          {menuItems.filter((item) => {
            // Permission-based filtering: hide items the user can't access
            if (item.requiredPermission && !isAdmin && !hasPermission(item.requiredPermission)) {
              return false;
            }
            // If item has a submenu, ensure at least one submenu item is accessible
            if (item.submenu) {
              const visibleSub = item.submenu.filter((sub) => {
                if (!sub.requiredPermission) return true;
                if (isAdmin) return true;
                return hasPermission(sub.requiredPermission);
              });
              if (visibleSub.length === 0) return false;
            }
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id ||
              (item.submenu &&
                item.submenu.some((sub) => sub.id === activeSection)) ||
              // Special case for project management - highlight when on any project-related page
              (item.id === "project" &&
                (activeSection === "projects" ||
                  activeSection === "project-budget" ||
                  activeSection === "project-alerts" ||
                  activeSection === "project-reports" ||
                  activeSection === "project-finances"));
            const isExpanded = !!expandedMenus[item.id];

            return (
              <div key={item.id} className="px-2 mb-0.5">
                <button
                  type="button"
                  onClick={() => handleMenuClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleMenuClick(item);
                    }
                  }}
                  aria-current={isActive ? "page" : undefined}
                  aria-expanded={item.submenu ? isExpanded : undefined}
                  aria-haspopup={item.submenu ? "true" : undefined}
                  className={`relative w-full flex items-center rounded-lg text-left transition-all duration-200 ${
                    isCollapsed ? "justify-center p-3" : "px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "hover:bg-slate-700 text-slate-300 hover:text-white"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isCollapsed ? "" : "mr-3"
                    }`}
                    strokeWidth={2.1}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 font-medium text-sm truncate">
                        {item.label}
                      </span>
                      {item.submenu && (
                        <div className="ml-2 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown
                              className="w-4 h-4"
                              strokeWidth={2.2}
                            />
                          ) : (
                            <ChevronRight
                              className="w-4 h-4"
                              strokeWidth={2.2}
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {/* Active indicator for collapsed */}
                  {isCollapsed && isActive && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-300 rounded-full" />
                  )}
                </button>

                {/* Submenu */}
                {item.submenu && !isCollapsed && isExpanded && (
                  <div
                    className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-700 pl-3"
                    role="group"
                    aria-label={`${item.label} submenu`}
                  >
                    {item.submenu
                      .filter((sub) => {
                        if (!sub.requiredPermission) return true;
                        if (isAdmin) return true;
                        return hasPermission(sub.requiredPermission);
                      })
                      .map((submenuItem) => {
                      const SubmenuIcon = submenuItem.icon;
                      const isSubActive =
                        activeSection === submenuItem.id ||
                        (submenuItem.id === "projects-list" &&
                          activeSection === "projects") ||
                        (submenuItem.id === "universal-system-reports" &&
                          ["universal-system-reports", "completed-activities", "workflow-bottlenecks", "user-activity-security", "employee-portal-audit"].includes(activeSection)) ||
                        (submenuItem.id === "executive-reports" &&
                          ["executive-reports", "system-health", "compliance-audit", "workforce-productivity-roi", "executive-dashboard"].includes(activeSection));
                      return (
                        <button
                          key={submenuItem.id}
                          type="button"
                          onClick={() =>
                            handleSubmenuClick(item.id, submenuItem)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSubmenuClick(item.id, submenuItem);
                            }
                          }}
                          className={`w-full flex items-center px-3 py-2 rounded-md text-left text-sm transition-colors ${
                            isSubActive
                              ? "bg-blue-500/20 text-blue-300 border-l-2 border-blue-400 -ml-px"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          }`}
                        >
                          {SubmenuIcon && (
                            <SubmenuIcon
                              className="w-4 h-4 mr-2 flex-shrink-0"
                              strokeWidth={2.1}
                            />
                          )}
                          <span className="flex-1 truncate">
                            {submenuItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed ? (
          <div className="p-4 border-t border-slate-700 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {(user?.name || "U").substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role || "EMPLOYEE"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-slate-700 flex-shrink-0 flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {(user?.name || "U").substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={onToggleCollapse}
          role="button"
          aria-label="Close sidebar overlay"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleCollapse();
            }
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
