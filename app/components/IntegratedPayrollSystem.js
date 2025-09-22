"use client";

import React, { useState, useEffect } from "react";
import {
  Calculator,
  Download,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
} from "lucide-react";
// Calendar UI removed to start fresh

export default function IntegratedPayrollSystem() {
  const [activeTab, setActiveTab] = useState("calculator"); // calculator, attendance, reports
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payrollData, setPayrollData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState(null);
  const [error, setError] = useState(null);
  // Calendar UI state removed
  const [deductionDetail, setDeductionDetail] = useState({
    open: false,
    name: "",
    amount: 0,
    dates: [],
  });

  // Date filters
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(
    new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(currentYear, currentMonth, 0).toISOString().split("T")[0]
  );

  // Attendance filters
  const [attendanceFilters, setAttendanceFilters] = useState({
    status: "all",
    department: "all",
    search: "",
  });

  // Format currency for Ethiopian Birr
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status info for attendance
  const getStatusInfo = (record) => {
    if (!record) {
      return {
        text: "Unknown",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        icon: AlertCircle,
      };
    }

    if (record.leaveInfo) {
      return {
        text: `On Leave (${record.leaveInfo.leaveType || "Unknown"})`,
        color: "text-purple-600",
        bgColor: "bg-purple-100",
        icon: Calendar,
      };
    } else if (record.payrollStatus === "absent") {
      return {
        text: "Absent",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: AlertCircle,
      };
    } else if (record.payrollStatus === "complete") {
      return {
        text: "Complete",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      };
    } else if (record.payrollStatus === "working") {
      return {
        text: "Working",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        icon: Clock,
      };
    } else {
      return {
        text: "Unknown",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        icon: AlertCircle,
      };
    }
  };

  // Calculate payroll
  const calculatePayroll = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Calculating payroll for:", {
        month: selectedMonth,
        year: selectedYear,
      });

      const response = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("API result:", result);

      if (result.success) {
        console.log("Setting payroll data:", result.data.payrollData);
        console.log("Setting summary:", result.data.summary);
        setPayrollData(result.data.payrollData || []);
        setSummary(result.data.summary || null);
        setPeriod(result.data.period || null);
        setActiveTab("calculator");
        console.log("About to show modal...");
        setShowModal(true);
        console.log("Modal should be visible now");
      } else {
        setError(result.error || "Failed to calculate payroll");
      }
    } catch (err) {
      setError("Failed to calculate payroll");
      console.error("Payroll calculation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        includeLeaveDetails: "true",
      });

      console.log("Fetching attendance data for:", { startDate, endDate });
      const url = `/api/attendance/reports/integrated?${params}`;
      console.log("API URL:", url);

      const response = await fetch(url);
      console.log("Attendance response status:", response.status);
      const result = await response.json();
      console.log("Attendance API result:", result);

      if (result.success) {
        console.log("Setting attendance data:", result.data);
        // The API returns { data: { records: [...] } } structure
        const attendanceRecords = result.data?.records || result.data || [];
        console.log("Processed attendance records:", attendanceRecords);
        setAttendanceData(attendanceRecords);
        setActiveTab("attendance");
      } else {
        setError(result.error || "Failed to fetch attendance data");
      }
    } catch (err) {
      setError("Failed to fetch attendance data");
      console.error("Attendance fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter attendance data
  const filteredAttendanceData = Array.isArray(attendanceData)
    ? attendanceData.filter((record) => {
        if (!record) return false;

        if (
          attendanceFilters.status !== "all" &&
          record.payrollStatus !== attendanceFilters.status
        ) {
          return false;
        }
        if (
          attendanceFilters.department !== "all" &&
          record.department !== attendanceFilters.department
        ) {
          return false;
        }
        if (attendanceFilters.search) {
          const searchTerm = attendanceFilters.search.toLowerCase();
          return (
            record.employeeName?.toLowerCase().includes(searchTerm) ||
            record.employeeEmail?.toLowerCase().includes(searchTerm) ||
            record.department?.toLowerCase().includes(searchTerm)
          );
        }
        return true;
      })
    : [];

  // Get unique departments for filter
  const departments =
    attendanceData.length > 0
      ? [...new Set(attendanceData.map((record) => record.department))].filter(
          Boolean
        )
      : [];

  // Export payroll to CSV
  const exportPayroll = () => {
    if (!Array.isArray(payrollData) || !payrollData.length || !summary) return;

    const csvHeaders = [
      "Employee Name",
      "Position",
      "Department",
      "Gross Salary",
      "Employee Pension (7%)",
      "Employer Pension (11%)",
      "Income Tax",
      "Transport Allowance",
      "Net Salary",
    ];

    const csvRows = payrollData.map((employee) => [
      employee?.name || "",
      employee?.position || "",
      employee?.department || "",
      (employee?.grossSalary || 0).toFixed(2),
      (employee?.employeePension || 0).toFixed(2),
      (employee?.employerPension || 0).toFixed(2),
      (employee?.incomeTax || 0).toFixed(2),
      (employee?.transportAllowance || 0).toFixed(2),
      (employee?.netSalary || 0).toFixed(2),
    ]);

    // Add totals row
    csvRows.push([
      "TOTALS",
      "",
      "",
      (summary?.totalGross || 0).toFixed(2),
      (summary?.totalEmployeePension || 0).toFixed(2),
      (summary?.totalEmployerPension || 0).toFixed(2),
      (summary?.totalIncomeTax || 0).toFixed(2),
      (summary?.totalTransportAllowance || 0).toFixed(2),
      (summary?.totalNet || 0).toFixed(2),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payroll_${selectedYear}_${selectedMonth.toString().padStart(2, "0")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export attendance to CSV
  const exportAttendance = () => {
    if (
      !Array.isArray(filteredAttendanceData) ||
      !filteredAttendanceData.length
    )
      return;

    const csvHeaders = [
      "Date",
      "Employee Name",
      "Department",
      "Check In",
      "Check Out",
      "Working Hours",
      "Status",
      "Leave Type",
      "Absence Reason",
    ];

    const csvRows = filteredAttendanceData.map((record) => [
      record?.date || "",
      record?.employeeName || "",
      record?.department || "",
      formatTime(record?.checkInTime),
      formatTime(record?.checkOutTime),
      record?.workingHours || "0:00",
      record?.payrollStatus || "",
      record?.leaveInfo?.leaveType || "",
      record?.absenceReason || "",
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${startDate}_to_${endDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => {
    setShowModal(false);
    setPayrollData([]);
    setAttendanceData([]);
    setSummary(null);
    setPeriod(null);
    setError(null);
  };

  // Debug current state
  console.log("Current state:", {
    activeTab,
    showModal,
    loading,
    payrollDataLength: payrollData.length,
    attendanceDataLength: attendanceData.length,
    summary: summary ? "exists" : "null",
    error,
  });

  return (
    <>
      {/* Main Interface */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-green-600" />
            Integrated Payroll System
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("calculator")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === "calculator"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              Payroll Calculator
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === "attendance"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Attendance & Leave
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === "reports"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Reports
            </button>
          </div>
        </div>

        {/* Calculator Tab */}
        {activeTab === "calculator" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = currentYear - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={calculatePayroll}
                  disabled={loading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Calculate Payroll
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>
                <strong>Ethiopian Tax System:</strong> Progressive tax rates
                from 0% to 35%
              </p>
              <p>
                <strong>Pension Contributions:</strong> Employee 7%, Employer
                11%
              </p>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={attendanceFilters.status}
                  onChange={(e) =>
                    setAttendanceFilters((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="complete">Complete</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                  <option value="working">Working</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchAttendanceData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Load Attendance
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={attendanceFilters.department}
                  onChange={(e) =>
                    setAttendanceFilters((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Employee
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={attendanceFilters.search}
                    onChange={(e) =>
                      setAttendanceFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={exportAttendance}
                  disabled={!filteredAttendanceData.length}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            {filteredAttendanceData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Date
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Employee
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Department
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Check In
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Check Out
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Hours
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendanceData.map((record, index) => {
                      if (!record) return null;

                      const statusInfo = getStatusInfo(record);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr
                          key={`${record.employeeId || index}-${
                            record.date || index
                          }`}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                            {record.date || "N/A"}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                            {record.employeeName || "Unknown"}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">
                            {record.department || "N/A"}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-center">
                            {formatTime(record.checkInTime)}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-center">
                            {formatTime(record.checkOutTime)}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-center">
                            {record.workingHours || "0:00"}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusInfo.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredAttendanceData.length === 0 &&
              attendanceData.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No attendance records match your filters.</p>
                </div>
              )}

            {attendanceData.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>
                  No attendance data available. Click "Load Attendance" to fetch
                  data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reports Coming Soon
            </h3>
            <p className="text-gray-500">
              Advanced reporting features will be available here, including:
            </p>
            <ul className="text-sm text-gray-500 mt-4 space-y-1">
              <li>• Payroll vs Attendance Analysis</li>
              <li>• Department-wise Salary Reports</li>
              <li>• Leave Impact on Payroll</li>
              <li>• Tax and Pension Analytics</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Payroll Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-green-600" />
                Payroll Calculation -{" "}
                {new Date(selectedYear, selectedMonth - 1).toLocaleString(
                  "default",
                  { month: "long", year: "numeric" }
                )}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Summary Cards */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Total Employees
                    </h4>
                    <span className="text-2xl font-bold text-blue-600">
                      {summary?.totalEmployees || 0}
                    </span>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Total Gross
                    </h4>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(summary?.totalGross || 0)}
                    </span>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Income Tax
                    </h4>
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(summary?.totalIncomeTax || 0)}
                    </span>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Employee Pension
                    </h4>
                    <span className="text-lg font-bold text-yellow-600">
                      {formatCurrency(summary?.totalEmployeePension || 0)}
                    </span>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Employer Pension
                    </h4>
                    <span className="text-lg font-bold text-purple-600">
                      {formatCurrency(summary?.totalEmployerPension || 0)}
                    </span>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-gray-600">
                      Total Net
                    </h4>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatCurrency(summary?.totalNet || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payroll Table */}
              <div className="flex-1 overflow-auto p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Employee
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Position
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Gross Salary
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Employee Pension (7%)
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Employer Pension (11%)
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Income Tax
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Deductions
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Transport Allowance
                        </th>
                        <th className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Net Salary
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(payrollData) &&
                        payrollData.map((employee, index) => {
                          if (!employee) return null;

                          return (
                            <tr
                              key={employee.employeeId || index}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900">
                                {employee.name || "Unknown"}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">
                                {employee.position || "N/A"}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-right font-mono">
                                {formatCurrency(employee.grossSalary || 0)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-right font-mono">
                                {formatCurrency(employee.employeePension || 0)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-right font-mono">
                                {formatCurrency(employee.employerPension || 0)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-red-600 text-right font-mono font-medium">
                                {formatCurrency(employee.incomeTax || 0)}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                                {employee?.deductionAmount ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-semibold">
                                      {formatCurrency(employee.deductionAmount)}
                                    </span>
                                    {(employee.deductionDates || []).length >
                                      0 && (
                                      <button
                                        onClick={() =>
                                          setDeductionDetail({
                                            open: true,
                                            name: employee.name || "Employee",
                                            amount: employee.deductionAmount,
                                            dates:
                                              employee.deductionDates || [],
                                          })
                                        }
                                        className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                                        title="View deduction dates"
                                      >
                                        View dates
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700 text-right font-mono">
                                {formatCurrency(
                                  employee.transportAllowance || 0
                                )}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 text-right font-mono font-bold">
                                {formatCurrency(employee.netSalary || 0)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td
                          className="border border-gray-200 px-4 py-3 text-sm text-gray-900"
                          colSpan="2"
                        >
                          TOTALS
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {formatCurrency(summary?.totalGross || 0)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {formatCurrency(summary?.totalEmployeePension || 0)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {formatCurrency(summary?.totalEmployerPension || 0)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-red-600 text-right font-mono">
                          {formatCurrency(summary?.totalIncomeTax || 0)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right font-mono">
                          {formatCurrency(
                            summary?.totalTransportAllowance || 0
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-green-600 text-right font-mono">
                          {formatCurrency(summary?.totalNet || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Calculated on {new Date().toLocaleString()}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={exportPayroll}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={closeModal}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deduction Detail Modal */}
      {deductionDetail.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-gray-900">
                Deduction Details
              </div>
              <button
                onClick={() =>
                  setDeductionDetail({
                    open: false,
                    name: "",
                    amount: 0,
                    dates: [],
                  })
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm text-gray-800">
              <div>
                <span className="font-medium">Employee: </span>
                {deductionDetail.name}
              </div>
              <div>
                <span className="font-medium">Total Deduction: </span>
                {formatCurrency(deductionDetail.amount || 0)}
              </div>
              <div>
                <span className="font-medium">Dates: </span>
                {(deductionDetail.dates || []).length > 0 ? (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {deductionDetail.dates.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            <div className="px-4 py-3 border-t text-right">
              <button
                onClick={() =>
                  setDeductionDetail({
                    open: false,
                    name: "",
                    amount: 0,
                    dates: [],
                  })
                }
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar UI removed */}
    </>
  );
}
