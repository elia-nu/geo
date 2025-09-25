"use client";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Bell, Search, User, Settings } from "lucide-react";

const Layout = ({
  children,
  activeSection = "dashboard",
  onSectionChange = () => {},
  user = null,
  onLogout = null,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("layout:isSidebarCollapsed");
      if (stored !== null) {
        setIsSidebarCollapsed(stored === "true");
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("layout:isSidebarCollapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Helper function to safely format section name
  const formatSectionName = (section) => {
    if (!section) return "Dashboard";
    return section.replace("-", " ");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          console.log("Layout onSectionChange called with:", section);
          onSectionChange(section);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 max-w-screen-xl w-full ${
          isSidebarCollapsed ? "ml-0 sm:ml-16" : "ml-0 sm:ml-64"
        }`}
      >
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize truncate max-w-[180px] sm:max-w-none">
                {activeSection === "employee-database"
                  ? "Employee Database"
                  : activeSection === "document-list"
                  ? "Document Management"
                  : activeSection === "dashboard"
                  ? "Dashboard"
                  : activeSection === "project-budget"
                  ? "Budget & Finance"
                  : activeSection === "project-finances"
                  ? "Financial Management"
                  : formatSectionName(activeSection)}
              </h2>
              <div className="hidden md:block">
                <nav className="flex space-x-1" aria-label="Breadcrumb">
                  <span className="text-sm text-gray-500">HRM System</span>
                  <span className="text-sm text-gray-400">/</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {formatSectionName(activeSection)}
                  </span>
                </nav>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm w-48 lg:w-64"
                />
              </div>

              {/* Mobile Search Button */}
              <button
                className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Settings - Hide on smallest screens */}
              <button
                className="hidden sm:block p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user ? user.name : "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user ? user.role : "Administrator"}
                  </p>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="ml-1 sm:ml-2 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 mt-6 sm:mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-4">
              <p className="text-xs sm:text-sm text-gray-500">
                © 2024 HRM System. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
              >
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
