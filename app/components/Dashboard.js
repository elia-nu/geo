"use client";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";

const Dashboard = ({ onSectionChange }) => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDocuments: 0,
    expiringDocuments: 0,
    expiredDocuments: 0,
    departments: {},
    locations: {},
  });
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    fetchStats();
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch employee stats
      const employeesResponse = await fetch("/api/employee");
      const employeesData = await employeesResponse.json();

      // Fetch document stats
      const documentsResponse = await fetch("/api/documents/stats");
      const documentStats = await documentsResponse.json();

      // Calculate department and location stats
      const departments = {};
      const locations = {};

      // Check if employees data is valid and has the employees array
      if (
        employeesData.success &&
        employeesData.employees &&
        Array.isArray(employeesData.employees)
      ) {
        employeesData.employees.forEach((emp) => {
          if (emp.department) {
            departments[emp.department] =
              (departments[emp.department] || 0) + 1;
          }
          if (emp.workLocation) {
            // Handle workLocation as either object or string
            const locationKey =
              typeof emp.workLocation === "object" && emp.workLocation?.name
                ? emp.workLocation.name
                : typeof emp.workLocation === "string"
                ? emp.workLocation
                : "Unknown Location";

            locations[locationKey] = (locations[locationKey] || 0) + 1;
          }
        });
      }

      setStats({
        totalEmployees: employeesData.success
          ? employeesData.employees?.length || 0
          : 0,
        totalDocuments: documentStats.total || 0,
        expiringDocuments: documentStats.expiring || 0,
        expiredDocuments: documentStats.expired || 0,
        departments,
        locations,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getTopDepartments = () => {
    return Object.entries(stats.departments)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  const getTopLocations = () => {
    return Object.entries(stats.locations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.5),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Welcome to HRM Dashboard
          </h1>
          <p className="text-blue-100/90 max-w-2xl">
            Manage your human resources efficiently with our comprehensive
            system
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => onSectionChange("employee-add")}
              className="bg-white/90 text-slate-900 hover:bg-white shadow-lg shadow-black/10"
            >
              Quick Add Employee
            </Button>
            <Button
              onClick={() => onSectionChange("payroll-integration")}
              variant="secondary"
              className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20"
            >
              Open Payroll
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card
          className="bg-white text-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border border-blue-100/60"
          onClick={() => onSectionChange("employee-database")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600">
              {stats.totalEmployees}
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              Active workforce
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-white text-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border border-green-100/60"
          onClick={() => onSectionChange("document-list")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-600">
              {stats.totalDocuments}
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <Activity className="w-3 h-3 mr-1 text-blue-500" />
              Stored documents
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-white text-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border border-orange-100/60"
          onClick={() => onSectionChange("document-expiry")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600">
              {stats.expiringDocuments}
            </div>
            <p className="text-xs text-gray-500">Next 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all border border-red-100/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-600">
              {stats.expiredDocuments}
            </div>
            <p className="text-xs text-gray-500">Require attention</p>
          </CardContent>
        </Card>

        <Card
          className="bg-white text-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border border-orange-100/60"
          onClick={() => onSectionChange("payroll-integration")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payroll Integration
            </CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600">Live</div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              Attendance & Leave
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department and Location Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white text-slate-800 hover:shadow-xl transition-all border border-blue-100/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopDepartments().map(([dept, count]) => (
                <div key={dept} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{dept}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-28 bg-gray-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / stats.totalEmployees) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </div>
              ))}
              {Object.keys(stats.departments).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No department data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white text-slate-800 hover:shadow-xl transition-all border border-green-100/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              Work Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getTopLocations().map(([location, count]) => (
                <div
                  key={location}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm font-medium">{location}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-28 bg-gray-200/70 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(count / stats.totalEmployees) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </div>
              ))}
              {Object.keys(stats.locations).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No location data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white text-slate-800 border border-slate-200/70 hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => onSectionChange("employee-add")}
              className="flex items-center gap-2 h-auto p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Add New Employee</div>
                <div className="text-sm opacity-90">
                  Create employee profile
                </div>
              </div>
            </Button>

            <Button
              onClick={() => onSectionChange("document-upload")}
              className="flex items-center gap-2 h-auto p-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
            >
              <FileText className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Upload Document</div>
                <div className="text-sm opacity-90">Add new document</div>
              </div>
            </Button>

            <Button
              onClick={() => onSectionChange("employee-search")}
              className="flex items-center gap-2 h-auto p-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md"
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Search Employees</div>
                <div className="text-sm opacity-90">Find employees</div>
              </div>
            </Button>

            <Button
              onClick={() => onSectionChange("payroll-integration")}
              className="flex items-center gap-2 h-auto p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md"
            >
              <TrendingUp className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Integrated Payroll</div>
                <div className="text-sm opacity-90">
                  Calculator, Attendance & Reports
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-white text-slate-800 border border-slate-200/70 hover:shadow-xl transition-shadow">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="text-sm font-medium text-gray-600">Database</p>
                <p className="text-lg font-semibold text-green-600">Online</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  File Storage
                </p>
                <p className="text-lg font-semibold text-blue-600">Active</p>
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div>
                <p className="text-sm font-medium text-gray-600">API Status</p>
                <p className="text-lg font-semibold text-purple-600">Healthy</p>
              </div>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Last Updated
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {lastUpdated || "—"}
                </p>
              </div>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
