"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  RefreshCw,
  FileText,
  PieChart,
  Building2,
  Briefcase,
  MapPin,
  Users,
  User,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  RotateCcw,
  IdCard,
} from "lucide-react";

export default function LeaveRequestSummaryReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [activeTab, setActiveTab] = useState("per-project"); // 'per-project' | 'per-person' | 'overview'
  const [personSearch, setPersonSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  // Filter option lists
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);

  const initialFilters = {
    startDate: startOfYear,
    endDate: endOfYear,
    department: "",
    projectId: "",
    locationId: "",
    employeeId: "",
  };

  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [deptRes, projRes, locRes, empRes] = await Promise.all([
        fetch("/api/departments").catch(() => null),
        fetch("/api/projects").catch(() => null),
        fetch("/api/work-locations").catch(() => null),
        fetch("/api/employees").catch(() => null),
      ]);

      if (deptRes && deptRes.ok) {
        const deptData = await deptRes.json();
        const list = Array.isArray(deptData?.departments)
          ? deptData.departments
          : Array.isArray(deptData)
          ? deptData
          : [];
        setDepartments(list);
      }

      if (projRes && projRes.ok) {
        const projData = await projRes.json();
        const list = Array.isArray(projData?.projects)
          ? projData.projects
          : Array.isArray(projData)
          ? projData
          : [];
        setProjects(list);
      }

      if (locRes && locRes.ok) {
        const locData = await locRes.json();
        const list = Array.isArray(locData?.locations)
          ? locData.locations
          : Array.isArray(locData)
          ? locData
          : [];
        setLocations(list);
      }

      if (empRes && empRes.ok) {
        const empData = await empRes.json();
        const list = Array.isArray(empData?.employees)
          ? empData.employees
          : Array.isArray(empData)
          ? empData
          : [];
        setEmployees(list);
      }
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setPersonSearch("");
    setProjectSearch("");
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.employeeId) params.set("employeeId", filters.employeeId);

      const res = await fetch(
        `/api/reports/leave/summary?${params.toString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate leave request summary report");
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Leave Request Summary report generated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) {
      setMessage("Please generate the report first.");
      setMessageType("error");
      return;
    }
    setExporting(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem("authToken");
      const res = await fetch("/api/reports/leave/summary/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format: format === "excel" ? "excel" : "csv",
          summary: reportData.summary || {},
          byDepartment: reportData.byDepartment || [],
          byProject: reportData.byProject || [],
          byPerson: reportData.byPerson || [],
          bySite: reportData.bySite || [],
          filters: reportData.filters || {},
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave_request_summary_${new Date().toISOString().split("T")[0]}.${format === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage(`Report exported as ${format.toUpperCase()}`);
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Failed to export");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};
  const byType = summary.byType || [];
  const byStatus = summary.byStatus || [];
  const byDepartment = reportData?.byDepartment || [];
  const byProject = reportData?.byProject || [];
  const byPerson = reportData?.byPerson || [];
  const bySite = reportData?.bySite || [];

  const filteredProjects = byProject.filter((p) => {
    if (!projectSearch.trim()) return true;
    const q = projectSearch.toLowerCase();
    return (
      (p.projectName && p.projectName.toLowerCase().includes(q)) ||
      (p.projectId && p.projectId.toLowerCase().includes(q))
    );
  });

  const filteredPersons = byPerson.filter((p) => {
    if (!personSearch.trim()) return true;
    const q = personSearch.toLowerCase();
    return (
      (p.employeeName && p.employeeName.toLowerCase().includes(q)) ||
      (p.employeeCode && String(p.employeeCode).toLowerCase().includes(q)) ||
      (p.department && p.department.toLowerCase().includes(q)) ||
      (p.projectNames && p.projectNames.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Leave Request Summary Report
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            View aggregated leave metrics per project, per person (employee), by department, and by request status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button
                onClick={() => handleExport("excel")}
                disabled={exporting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Filters Bar */}
      <div className="bg-gray-50/90 rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Start Date</span>
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>End Date</span>
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Department</span>
            </label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => {
                const name = dept.name || dept;
                return (
                  <option key={dept._id || name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Project Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-amber-600" />
              <span>Project</span>
            </label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
            >
              <option value="">All Projects</option>
              {projects.map((proj) => (
                <option key={proj._id} value={proj._id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee ID Search / Select */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <IdCard className="w-3.5 h-3.5 text-purple-600" />
              <span>Search by Emp ID</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                placeholder="e.g. EMP-001 or Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder:text-gray-400"
                list="employee-id-datalist"
              />
              <datalist id="employee-id-datalist">
                {employees.map((emp) => {
                  const empId =
                    emp.employeeId ||
                    emp.personalDetails?.employeeId ||
                    emp._id?.slice?.(-6);
                  const name =
                    emp.fullName ||
                    emp.personalDetails?.name ||
                    emp.name ||
                    "Employee";
                  return (
                    <option key={emp._id} value={empId}>
                      {name} ({empId})
                    </option>
                  );
                })}
              </datalist>
            </div>
          </div>

          {/* Site / Location Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
              <span>Site / Location</span>
            </label>
            <select
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
            >
              <option value="">All Sites / Locations</option>
              {locations.map((loc) => (
                <option key={loc._id} value={loc._id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 text-xs">
          <div className="text-gray-500 flex items-center gap-2">
            {(filters.department ||
              filters.projectId ||
              filters.employeeId ||
              filters.locationId) && (
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                Active filters applied
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : messageType === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {message}
        </div>
      )}

      {reportData && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-blue-700">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Requests</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalRequests ?? reportData.totalRecords ?? 0}
              </p>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-indigo-700">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Days Requested</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalDays ?? 0}
              </p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Approved Days</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">
                {summary.totalApprovedDays ?? 0}
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-amber-700">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Projects</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {byProject.length}
              </p>
            </div>

            <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5 text-purple-700">
                <Users className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Persons on Leave</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {byPerson.length}
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab("per-project")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "per-project"
                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-600" />
              <span>Leave per Project</span>
              <span className="px-2 py-0.5 text-xs bg-amber-200/80 rounded-full font-bold">
                {byProject.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("per-person")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "per-person"
                  ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <User className="w-4 h-4 text-purple-600" />
              <span>Leave per Person</span>
              <span className="px-2 py-0.5 text-xs bg-purple-200/80 rounded-full font-bold">
                {byPerson.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "overview"
                  ? "bg-blue-100 text-blue-900 border border-blue-300 shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Type, Status & Dept Overview</span>
            </button>
          </div>

          {/* TAB 1: LEAVE SUMMARY PER PROJECT */}
          {activeTab === "per-project" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                    Leave Summary by Project
                  </h3>
                  <p className="text-xs text-gray-500">
                    Aggregated leave requests and duration impact for each project
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-amber-500 text-black"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Project Name</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Total Requests</th>
                      <th className="px-4 py-3 text-center font-semibold text-emerald-700">Approved</th>
                      <th className="px-4 py-3 text-center font-semibold text-amber-700">Pending</th>
                      <th className="px-4 py-3 text-center font-semibold text-rose-700">Rejected</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Leave Days</th>
                      <th className="px-4 py-3 text-right font-semibold text-emerald-700">Approved Days</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Staff on Leave</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((proj) => (
                      <tr key={proj.projectId || proj.projectName} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {proj.projectName || "Unassigned Project"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">
                          {proj.total || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                          {proj.approved || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600">
                          {proj.pending || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-rose-600">
                          {proj.rejected || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {proj.totalDays || 0} days
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {proj.approvedDays || 0} days
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-600">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold">
                            {proj.uniqueEmployeesCount || 0} staff
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No project leave records found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: LEAVE SUMMARY PER PERSON */}
          {activeTab === "per-person" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Leave Summary per Person (Employee)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Individual breakdown of requested leave days, approved duration, and leave type distribution
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    placeholder="Search person, ID, dept..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-purple-500 text-black"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Employee</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Department / Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Project(s)</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Requests</th>
                      <th className="px-4 py-3 text-center font-semibold text-emerald-700">Approved</th>
                      <th className="px-4 py-3 text-center font-semibold text-amber-700">Pending</th>
                      <th className="px-4 py-3 text-center font-semibold text-rose-700">Rejected</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-800">Total Days</th>
                      <th className="px-4 py-3 text-right font-semibold text-emerald-700">Approved Days</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPersons.map((person) => (
                      <tr key={person.employeeId} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{person.employeeName}</div>
                          <div className="text-xs font-mono text-gray-400">ID: {person.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 font-medium text-xs">{person.department}</div>
                          <div className="text-gray-500 text-[11px]">{person.designation}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={person.projectNames}>
                          {person.projectNames || "None"}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">
                          {person.total || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                          {person.approved || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-600">
                          {person.pending || 0}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-rose-600">
                          {person.rejected || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {person.totalDays || 0} days
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {person.approvedDays || 0} days
                        </td>
                      </tr>
                    ))}
                    {filteredPersons.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          No employee leave records found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW (TYPE, STATUS, DEPT, SITE) */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Type */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    By Leave Type (Annual, Sick, Emergency, etc.)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">Type</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Count</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {byType.map((r) => (
                          <tr key={r.type}>
                            <td className="px-3 py-2 text-black capitalize font-medium">{r.type}</td>
                            <td className="px-3 py-2 text-right text-black font-bold">{r.count}</td>
                          </tr>
                        ))}
                        {byType.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* By Status */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    By Status (Approved / Pending / Rejected)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">Status</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Count</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {byStatus.map((r) => (
                          <tr key={r.status}>
                            <td className="px-3 py-2 text-black capitalize font-medium flex items-center gap-2">
                              {r.status === "approved" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              {r.status === "pending" && <Clock className="w-4 h-4 text-amber-500" />}
                              {r.status === "rejected" && <XCircle className="w-4 h-4 text-rose-600" />}
                              <span>{r.status}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-black font-bold">{r.count}</td>
                          </tr>
                        ))}
                        {byStatus.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* By Department & Site */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    By Department
                  </h3>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">Department</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {byDepartment.map((r) => (
                          <tr key={r.key || r.department}>
                            <td className="px-3 py-2 text-black font-medium">{r.department ?? r.name ?? r.key}</td>
                            <td className="px-3 py-2 text-right text-black font-bold">{r.total}</td>
                          </tr>
                        ))}
                        {byDepartment.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    By Site / Location
                  </h3>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase text-xs">Site</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bySite.map((r) => (
                          <tr key={r.key || r.siteId}>
                            <td className="px-3 py-2 text-black font-medium">{r.siteName ?? r.name ?? r.key}</td>
                            <td className="px-3 py-2 text-right text-black font-bold">{r.total}</td>
                          </tr>
                        ))}
                        {bySite.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-gray-500">No data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
