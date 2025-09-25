"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

const Sidebar = ({
  activeSection,
  onSectionChange = () => {},
  isCollapsed,
  onToggleCollapse,
}) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Auto-expand menus when related sections are active
  useEffect(() => {
    if (
      activeSection === "attendance-reports" ||
      activeSection === "admin-attendance" ||
      activeSection === "employee-setup" ||
      activeSection === "employee-login" ||
      activeSection === "attendance-daily" ||
      activeSection === "attendance-documents" ||
      activeSection === "attendance-legacy"
    ) {
      setExpandedMenus((prev) => ({
        ...prev,
        attendance: true,
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
      activeSection === "projects-list" ||
      activeSection === "project-milestones" ||
      activeSection === "project-team" ||
      activeSection === "project-alerts" ||
      activeSection === "project-reports" ||
      activeSection === "project-budget" ||
      activeSection === "project-finances"
    ) {
      setExpandedMenus((prev) => ({
        ...prev,
        "project-management": true,
      }));
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
      id: "employees",
      label: "Employee Management",
      icon: Users,
      submenu: [
        {
          id: "employee-database",
          label: "Employees",
          path: "/hrm/employees",
        },
        {
          id: "employee-add",
          label: "Add Employee",
          path: "/hrm/employees/add",
        },
        {
          id: "employee-search",
          label: "Search Employees",
          path: "/hrm/employees/search",
        },
        {
          id: "employee-location",
          label: "Employee Location",
          path: "/employee-location",
        },
      ],
    },
    {
      id: "documents",
      label: "Document Management",
      icon: FileText,
      submenu: [
        { id: "document-list", label: "All Documents", path: "/hrm/documents" },
        {
          id: "document-upload",
          label: "Upload Document",
          path: "/hrm/documents/upload",
        },
        {
          id: "document-expiry",
          label: "Expiry Alerts",
          path: "/hrm/documents/expiry",
        },
      ],
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: BarChart3,
      submenu: [
        {
          id: "employee-stats",
          label: "Employee Statistics",
          path: "/hrm/analytics/employees",
        },
        {
          id: "department-stats",
          label: "Department Analytics",
          path: "/hrm/analytics/departments",
        },
        {
          id: "document-stats",
          label: "Document Reports",
          path: "/hrm/analytics/documents",
        },
      ],
    },
    {
      id: "organization",
      label: "Organization",
      icon: Building,
      submenu: [
        {
          id: "departments",
          label: "Departments",
          path: "/hrm/organization/departments",
        },
        {
          id: "hierarchy",
          label: "Org Hierarchy",
          path: "/hrm/organization/hierarchy",
        },
      ],
    },
    {
      id: "work-locations",
      label: "Work Locations",
      icon: MapPin,
      path: "/work-locations",
    },
    {
      id: "projects",
      label: "Projects",
      icon: Briefcase,
      path: "/projects",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      path: "/hrm/notifications",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      path: "/hrm/calendar",
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Calendar,
      submenu: [
        {
          id: "employee-setup",
          label: "Employee Setup",
          path: "/employee-setup",
        },
        {
          id: "employee-login",
          label: "Employee Login",
          path: "/employee-login",
        },
        {
          id: "attendance-daily",
          label: "Daily Attendance",
          path: "/attendance-daily",
        },
        {
          id: "attendance-documents",
          label: "Submit Documents",
          path: "/attendance-documents",
        },
        {
          id: "attendance-legacy",
          label: "Legacy System",
          path: "/",
        },
        {
          id: "admin-attendance",
          label: "Admin Management",
          path: "/admin-attendance",
        },
        {
          id: "attendance-reports",
          label: "Attendance Reports",
          path: "/attendance-reports",
        },
      ],
    },
    {
      id: "leave-management",
      label: "Leave Management",
      icon: Calendar,
      submenu: [
        {
          id: "leave-approval",
          label: "Leave Approval",
          path: "/hrm/leave/approval",
        },
        {
          id: "leave-balances",
          label: "Leave Balances",
          path: "/hrm/leave/balances",
        },
        {
          id: "leave-reports",
          label: "Leave Reports",
          path: "/hrm/leave/reports",
        },
      ],
    },
    {
      id: "project-management",
      label: "Project Management",
      icon: Briefcase,
      submenu: [
        {
          id: "projects-list",
          label: "Projects",
          path: "/projects",
        },
        {
          id: "project-budget",
          label: "Budget & Finance",
          icon: DollarSign,
        },
        {
          id: "project-alerts",
          label: "Project Alerts",
          path: "/project-alerts",
        },
        {
          id: "project-reports",
          label: "Project Reports",
          path: "/projects/reports",
        },
      ],
    },
    {
      id: "budget-management",
      label: "Budget Management",
      icon: DollarSign,
      path: "/budget-management",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/hrm/settings",
    },
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
      toggleSubmenu(item.id);
    } else {
      if (item.path && !item.path.startsWith("/hrm")) {
        router.push(item.path);
      } else {
        if (typeof onSectionChange === "function") {
          onSectionChange(item.id);
        } else {
          console.warn("onSectionChange is not a function:", onSectionChange);
        }
      }
    }
  };

  const handleSubmenuClick = (parentId, submenuItem) => {
    // Special handling for project budget - redirect to projects page with budget context
    if (submenuItem.id === "project-budget") {
      router.push("/projects?tab=budget"); // Go to projects page with budget tab context
      return;
    }

    if (submenuItem.path && !submenuItem.path.startsWith("/hrm")) {
      router.push(submenuItem.path);
    } else {
      if (typeof onSectionChange === "function") {
        onSectionChange(submenuItem.id);
      } else {
        console.warn("onSectionChange is not a function:", onSectionChange);
      }
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        role="navigation"
        aria-label="Primary"
        className={`absolute left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl transition-all duration-300 z-50 ${
          isCollapsed ? "w-0 sm:w-16" : "w-64"
        } ${
          !isCollapsed ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">HRM System</h1>
                <p className="text-xs text-slate-300">Human Resources</p>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={!isCollapsed}
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 px-2 py-4 space-y-2 overflow-y-auto"
          aria-label="Main menu"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id ||
              (item.submenu &&
                item.submenu.some((sub) => sub.id === activeSection));
            const isExpanded = !!expandedMenus[item.id];

            return (
              <div key={item.id}>
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
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "hover:bg-slate-700 text-slate-300 hover:text-white"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 ${isCollapsed ? "mx-auto" : "mr-3"}`}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.submenu && (
                        <div className="ml-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </button>

                {/* Submenu */}
                {item.submenu && !isCollapsed && isExpanded && (
                  <div
                    className="ml-4 mt-2 space-y-1 border-l-2 border-slate-700 pl-4"
                    role="group"
                    aria-label={`${item.label} submenu`}
                  >
                    {item.submenu.map((submenuItem) => {
                      const SubmenuIcon = submenuItem.icon;
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
                            activeSection === submenuItem.id
                              ? "bg-blue-500/20 text-blue-300 border-l-2 border-blue-400"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          }`}
                        >
                          {SubmenuIcon && (
                            <SubmenuIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          )}
                          <span className="flex-1">{submenuItem.label}</span>
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
        {!isCollapsed && (
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">AD</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-slate-400">admin@company.com</p>
              </div>
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

      {/* Mobile menu button - only visible when sidebar is collapsed on mobile */}
      {isCollapsed && (
        <button
          className="fixed top-3 left-3 z-50 p-2 rounded-md bg-slate-800 text-white sm:hidden"
          onClick={onToggleCollapse}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
};

export default Sidebar;
