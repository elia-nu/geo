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
  FolderOpen,
} from "lucide-react";

const Sidebar = ({
  activeSection,
  onSectionChange = () => {},
  isCollapsed,
  onToggleCollapse,
}) => {
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Auto-expand attendance menu when attendance-reports is active
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
      id: "project-management",
      label: "Project Management",
      icon: FolderOpen,
      path: "/project-management",
    },
    {
      id: "project-dashboard",
      label: "Project Dashboard",
      icon: BarChart3,
      path: "/project-dashboard",
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
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl transition-all duration-300 z-50 ${
          isCollapsed ? "w-16" : "w-64"
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
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id ||
              (item.submenu &&
                item.submenu.some((sub) => sub.id === activeSection));
            const isExpanded = expandedMenus[item.id];

            return (
              <div key={item.id}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "hover:bg-slate-700 text-slate-300 hover:text-white"
                  }`}
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
                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-slate-700 pl-4">
                    {item.submenu.map((submenuItem) => (
                      <button
                        key={submenuItem.id}
                        onClick={() => handleSubmenuClick(item.id, submenuItem)}
                        className={`w-full flex items-center px-3 py-2 rounded-md text-left text-sm transition-colors ${
                          activeSection === submenuItem.id
                            ? "bg-blue-500/20 text-blue-300 border-l-2 border-blue-400"
                            : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                        }`}
                      >
                        {submenuItem.label}
                      </button>
                    ))}
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggleCollapse}
        />
      )}
    </>
  );
};

export default Sidebar;
