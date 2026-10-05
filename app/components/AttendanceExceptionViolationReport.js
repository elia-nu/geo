"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Clock,
  Users,
  MapPin,
  Building,
  Briefcase,
  User,
} from "lucide-react";
import Pagination from "./ui/Pagination";

export default function AttendanceExceptionViolationReport() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Dropdown options
  const [departmentsList, setDepartmentsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  // Pagination states for each exception section
  const [latePage, setLatePage] = useState(1);
  const [latePerPage, setLatePerPage] = useState(10);

  const [earlyPage, setEarlyPage] = useState(1);
  const [earlyPerPage, setEarlyPerPage] = useState(10);

  const [outsidePage, setOutsidePage] = useState(1);
  const [outsidePerPage, setOutsidePerPage] = useState(10);

  const [missedPage, setMissedPage] = useState(1);
  const [missedPerPage, setMissedPerPage] = useState(10);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    employeeId: "",
    department: "",
    projectId: "",
    locationId: "",
  });

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDepartmentsList(d.departments || []);
      })
      .catch(() => {});

    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProjectsList(d.projects || []);
      })
      .catch(() => {});

    fetch("/api/work-locations")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLocationsList(d.locations || d.workLocations || []);
      })
      .catch(() => {});

    fetch("/api/employee")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEmployeesList(d.employees || []);
      })
      .catch(() => {});
  }, []);

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    setLatePage(1);
    setEarlyPage(1);
    setOutsidePage(1);
    setMissedPage(1);
    try {
      const authToken = localStorage.getItem("authToken");
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.employeeId) params.set("employeeId", filters.employeeId);
      if (filters.department) params.set("department", filters.department);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.locationId) params.set("locationId", filters.locationId);

      const res = await fetch(
        `/api/reports/attendance/exceptions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Failed to generate attendance exceptions report"
        );
      }

      const data = await res.json();
      setReportData(data);
      setMessage("Attendance Exception & Violation Report generated.");
      setMessageType("success");
    } catch (error) {
      console.error("Error generating attendance exception report:", error);
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
      const payload = {
        format,
        summary: reportData.summary || {},
        lateArrivals: reportData.lateArrivals || [],
        earlyDepartures: reportData.earlyDepartures || [],
        outsideGeofenceAttempts: reportData.outsideGeofenceAttempts || [],
        missedCheckIns: reportData.missedCheckIns || [],
        filters: reportData.filters || {},
      };

      const res = await fetch(
        "/api/reports/attendance/exceptions/export",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || "Failed to export attendance exceptions report"
          );
        }
        throw new Error("Failed to export attendance exceptions report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_exceptions_${new Date()
        .toISOString()
        .split("T")[0]}.${
        format === "csv" ? "csv" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(
        `Attendance exceptions report exported as ${format.toUpperCase()}`
      );
      setMessageType("success");
    } catch (error) {
      console.error("Error exporting attendance exceptions report:", error);
      setMessage(error.message || "Failed to export report");
      setMessageType("error");
    } finally {
      setExporting(false);
    }
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center space-x-2">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <span>Attendance Exception &amp; Violation Report</span>
              </h1>
              <p className="text-gray-600 mt-1">
                Missed check-ins, late arrivals, early departures, and
                outside-geofence attempts across your workforce.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>{loading ? "Generating..." : "Generate Report"}</span>
              </button>
              {reportData && (
                <>
                  <button
                    onClick={() => handleExport("excel")}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={exporting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={filters.employeeId}
                onChange={(e) =>
                  setFilters({ ...filters, employeeId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              >
                <option value="">All Employees</option>
                {employeesList.map((emp) => {
                  const name =
                    emp.personalDetails?.name ||
                    emp.name ||
                    `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                    "Employee";
                  const code =
                    emp.employeeId ||
                    emp.personalDetails?.employeeId ||
                    (emp._id ? emp._id.slice(-6) : "");
                  return (
                    <option key={emp._id} value={emp.employeeId || emp._id}>
                      {name} ({code})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              >
                <option value="">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept._id || dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={filters.projectId}
                onChange={(e) =>
                  setFilters({ ...filters, projectId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              >
                <option value="">All Projects</option>
                {projectsList.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Location
              </label>
              <select
                value={filters.locationId}
                onChange={(e) =>
                  setFilters({ ...filters, locationId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
              >
                <option value="">All Locations</option>
                {locationsList.map((loc) => (
                  <option key={loc._id} value={loc._id}>
                    {loc.name || loc.locationName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {message && (
            <div
              className={`mt-2 p-3 rounded-lg text-sm ${
                messageType === "success"
                  ? "bg-green-50 text-green-800"
                  : messageType === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Summary & Tables */}
        {reportData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Employees
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.totalEmployees || 0}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">
                      Late Arrivals
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {summary.lateArrivals || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Early Departures
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.earlyDepartures || 0}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-900">
                      Missed Check-ins
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">
                    {summary.missedCheckIns || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Late Arrivals */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Late Arrivals</span>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    {reportData.lateArrivals?.length || 0}
                  </span>
                </h2>
              </div>
              {reportData.lateArrivals && reportData.lateArrivals.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Shift
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Check-in Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.lateArrivals
                          .slice((latePage - 1) * latePerPage, latePage * latePerPage)
                          .map((r, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 whitespace-nowrap text-black font-medium">
                                {r.employeeName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.department}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.shift}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.date}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-amber-700 font-semibold">
                                {r.checkInTime
                                  ? new Date(r.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.lateArrivals.length > latePerPage && (
                    <Pagination
                      currentPage={latePage}
                      totalPages={Math.ceil(reportData.lateArrivals.length / latePerPage) || 1}
                      totalItems={reportData.lateArrivals.length}
                      itemsPerPage={latePerPage}
                      onPageChange={setLatePage}
                      onItemsPerPageChange={(sz) => {
                        setLatePerPage(sz);
                        setLatePage(1);
                      }}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-3">No late arrivals recorded.</p>
              )}
            </div>

            {/* Early Departures */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>Early Departures</span>
                  <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                    {reportData.earlyDepartures?.length || 0}
                  </span>
                </h2>
              </div>
              {reportData.earlyDepartures && reportData.earlyDepartures.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Shift
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Check-out Time
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.earlyDepartures
                          .slice((earlyPage - 1) * earlyPerPage, earlyPage * earlyPerPage)
                          .map((r, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 whitespace-nowrap text-black font-medium">
                                {r.employeeName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.department}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.shift}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.date}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-purple-700 font-semibold">
                                {r.checkOutTime
                                  ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.earlyDepartures.length > earlyPerPage && (
                    <Pagination
                      currentPage={earlyPage}
                      totalPages={Math.ceil(reportData.earlyDepartures.length / earlyPerPage) || 1}
                      totalItems={reportData.earlyDepartures.length}
                      itemsPerPage={earlyPerPage}
                      onPageChange={setEarlyPage}
                      onItemsPerPageChange={(sz) => {
                        setEarlyPerPage(sz);
                        setEarlyPage(1);
                      }}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-3">No early departures recorded.</p>
              )}
            </div>

            {/* Outside Geofence Attempts */}
            {reportData.outsideGeofenceAttempts && reportData.outsideGeofenceAttempts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <span>Outside Geofence Attempts</span>
                    <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                      {reportData.outsideGeofenceAttempts.length}
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Attempt Action
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                          Assigned Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.outsideGeofenceAttempts
                        .slice((outsidePage - 1) * outsidePerPage, outsidePage * outsidePerPage)
                        .map((r, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 whitespace-nowrap text-black font-medium">
                              {r.employeeName}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-black">
                              {r.department}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-black">
                              {r.date}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-red-700 font-semibold">
                              {r.action || "Outside Geofence"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                              {r.workLocationName || "Unknown Worksite"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {reportData.outsideGeofenceAttempts.length > outsidePerPage && (
                  <Pagination
                    currentPage={outsidePage}
                    totalPages={Math.ceil(reportData.outsideGeofenceAttempts.length / outsidePerPage) || 1}
                    totalItems={reportData.outsideGeofenceAttempts.length}
                    itemsPerPage={outsidePerPage}
                    onPageChange={setOutsidePage}
                    onItemsPerPageChange={(sz) => {
                      setOutsidePerPage(sz);
                      setOutsidePage(1);
                    }}
                  />
                )}
              </div>
            )}

            {/* Missed Check-ins */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span>Missed Check-ins</span>
                  <span className="text-xs bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full">
                    {reportData.missedCheckIns?.length || 0}
                  </span>
                </h2>
              </div>
              {reportData.missedCheckIns && reportData.missedCheckIns.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.missedCheckIns
                          .slice((missedPage - 1) * missedPerPage, missedPage * missedPerPage)
                          .map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2 whitespace-nowrap text-black font-medium">
                                {r.employeeName}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.department}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-black">
                                {r.date}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.missedCheckIns.length > missedPerPage && (
                    <Pagination
                      currentPage={missedPage}
                      totalPages={Math.ceil(reportData.missedCheckIns.length / missedPerPage) || 1}
                      totalItems={reportData.missedCheckIns.length}
                      itemsPerPage={missedPerPage}
                      onPageChange={setMissedPage}
                      onItemsPerPageChange={(sz) => {
                        setMissedPerPage(sz);
                        setMissedPage(1);
                      }}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 py-3">No missed check-ins recorded for this selection.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Set a date range and click &quot;Generate Report&quot; to view
              attendance exceptions and violations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

