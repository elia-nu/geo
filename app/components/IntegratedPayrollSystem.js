"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Eye,
} from "lucide-react";
import { formatWorkingHours } from "../utils/timeUtils";
import Pagination from "./ui/Pagination";
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

  // Attendance / absence detail modal (eye button on working days column)
  const [attendanceDetailModal, setAttendanceDetailModal] = useState({
    open: false,
    employee: null,
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

  // Pagination states
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePerPage, setAttendancePerPage] = useState(10);
  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPerPage, setPayrollPerPage] = useState(25);

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

  // Client-side Ethiopian Income Tax calculation (same brackets as backend)
  const calculateIncomeTaxClient = (gross) => {
    const monthlyGross = gross;

    if (monthlyGross <= 2000) {
      return 0;
    } else if (monthlyGross <= 4000) {
      return Math.max(0, monthlyGross * 0.15 - 300);
    } else if (monthlyGross <= 7000) {
      return Math.max(0, monthlyGross * 0.2 - 500);
    } else if (monthlyGross <= 10000) {
      return Math.max(0, monthlyGross * 0.25 - 850);
    } else if (monthlyGross <= 14000) {
      return Math.max(0, monthlyGross * 0.3 - 1350);
    } else {
      return Math.max(0, monthlyGross * 0.35 - 2050);
    }
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

      const result = await response.json();

      if (result.success) {
        const rows = Array.isArray(result.data.payrollData)
          ? result.data.payrollData
          : [];

        // Enhance each row with overtime & original values for later adjustment (all calcs based on Salary)
        const enhancedRows = rows.map((row) => {
          const salaryVal = row.salary ?? 0;
          const empPension = salaryVal <= 0 ? 0 : (row.employeePension || 0);
          const emprPension = salaryVal <= 0 ? 0 : (row.employerPension || 0);
          const incTax = salaryVal <= 0 ? 0 : (row.incomeTax || 0);
          const allowances =
            (row.transportAllowance || 0) +
            (row.telephoneAllowance || 0) +
            (row.posAllowance || 0);
          const computedNet = Math.max(
            0,
            salaryVal - (incTax + empPension) + allowances
          );
          const safeNet =
            row.netSalary != null && row.netSalary > 0
              ? row.netSalary
              : computedNet;

          return {
            ...row,
            employeePension: empPension,
            employerPension: emprPension,
            incomeTax: incTax,
            netSalary: safeNet,
            overtime: 0,
            originalIncomeTax: incTax,
            originalNetSalary: safeNet,
            taxableIncome:
              row.taxableIncome ??
              (row.salary ?? row.adjustedGross ?? row.grossSalary ?? 0),
          };
        });

        setPayrollData(enhancedRows);
        setSummary(result.data.summary || null);
        setPeriod(result.data.period || null);
        setActiveTab("calculator");
        setShowModal(true);
      } else {
        setError(result.error || "Failed to calculate payroll");
      }
    } catch (err) {
      setError("Failed to calculate payroll");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Ethiopian holidays
  const fetchEthiopianHolidays = async () => {
    try {
      const response = await fetch(
        `/api/ethiopian-calendar?action=holidays&year=${selectedYear}`
      );
      const result = await response.json();

      if (result.success) {
        console.log("=== ETHIOPIAN HOLIDAYS FOR", selectedYear, "===");
        console.log("Total holidays:", result.data.holidays.length);

        result.data.holidays.forEach((holiday, index) => {
          const date = new Date(holiday.date);
          console.log(`${index + 1}. ${holiday.name} (${holiday.nameAmharic})`);
          console.log(
            `   Date: ${date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}`
          );
          console.log(`   Type: ${holiday.type}`);
          console.log(`   Is Working Day: ${holiday.isWorkingDay}`);
          console.log("---");
        });

        console.log("=== END OF ETHIOPIAN HOLIDAYS ===");
      }
    } catch (err) {
      console.error("Error fetching Ethiopian holidays:", err);
    }
  };

  // Fetch Ethiopian holidays for selected month
  const fetchEthiopianHolidaysForMonth = async () => {
    try {
      const response = await fetch(
        `/api/ethiopian-calendar?action=holidays&year=${selectedYear}&month=${selectedMonth}`
      );
      const result = await response.json();

      if (result.success) {
        const monthName = new Date(
          selectedYear,
          selectedMonth - 1
        ).toLocaleString("default", { month: "long" });
        console.log(
          `=== ETHIOPIAN HOLIDAYS FOR ${monthName.toUpperCase()} ${selectedYear} ===`
        );
        console.log("Total holidays this month:", result.data.holidays.length);

        if (result.data.holidays.length === 0) {
          console.log("No holidays in this month");
        } else {
          result.data.holidays.forEach((holiday, index) => {
            const date = new Date(holiday.date);
            console.log(
              `${index + 1}. ${holiday.name} (${holiday.nameAmharic})`
            );
            console.log(
              `   Date: ${date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}`
            );
            console.log(`   Type: ${holiday.type}`);
            console.log(`   Is Working Day: ${holiday.isWorkingDay}`);
            console.log("---");
          });
        }

        console.log("=== END OF MONTHLY HOLIDAYS ===");
      }
    } catch (err) {
      console.error("Error fetching monthly Ethiopian holidays:", err);
    }
  };

  // Test holiday integration with payroll
  const testHolidayIntegration = async () => {
    try {
      console.log("=== TESTING HOLIDAY INTEGRATION ===");

      // First, get holidays for the month
      const holidayResponse = await fetch(
        `/api/ethiopian-calendar?action=holidays&year=${selectedYear}&month=${selectedMonth}`
      );
      const holidayResult = await holidayResponse.json();

      if (holidayResult.success) {
        console.log(
          `Found ${holidayResult.data.holidays.length} holidays in ${selectedMonth}/${selectedYear}`
        );
        holidayResult.data.holidays.forEach((holiday) => {
          const date = new Date(holiday.date);
          console.log(`- ${holiday.name}: ${date.toISOString().split("T")[0]}`);
        });
      }

      // Then test payroll calculation
      console.log("Now testing payroll calculation...");
      const payrollResponse = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      const payrollResult = await payrollResponse.json();
      if (payrollResult.success) {
        console.log("Payroll calculation successful!");
        console.log(
          `Working days: ${payrollResult.data.period?.workingDays || "N/A"}`
        );
        console.log(
          `Holidays in month: ${
            payrollResult.data.period?.holidaysInMonth || "N/A"
          }`
        );
        console.log(
          `Total employees: ${payrollResult.data.summary?.totalEmployees || 0}`
        );
      } else {
        console.error("Payroll calculation failed:", payrollResult.error);
      }

      console.log("=== END HOLIDAY INTEGRATION TEST ===");
    } catch (err) {
      console.error("Error testing holiday integration:", err);
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

      const url = `/api/attendance/reports/integrated?${params}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        // The API returns { data: { records: [...] } } structure
        const attendanceRecords = result.data?.records || result.data || [];
        setAttendanceData(attendanceRecords);
        setActiveTab("attendance");
      } else {
        setError(result.error || "Failed to fetch attendance data");
      }
    } catch (err) {
      setError("Failed to fetch attendance data");
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

  // Reset attendance page on filter or data changes
  useEffect(() => {
    setAttendancePage(1);
  }, [attendanceFilters, attendanceData]);

  const totalAttendancePages =
    Math.ceil(filteredAttendanceData.length / attendancePerPage) || 1;
  const paginatedAttendanceData = useMemo(() => {
    const start = (attendancePage - 1) * attendancePerPage;
    return filteredAttendanceData.slice(start, start + attendancePerPage);
  }, [filteredAttendanceData, attendancePage, attendancePerPage]);

  const totalPayrollPages =
    Math.ceil((payrollData?.length || 0) / payrollPerPage) || 1;
  const paginatedPayrollData = useMemo(() => {
    if (!Array.isArray(payrollData)) return [];
    const start = (payrollPage - 1) * payrollPerPage;
    return payrollData.slice(start, start + payrollPerPage);
  }, [payrollData, payrollPage, payrollPerPage]);

  // Get unique departments for filter
  const departments =
    attendanceData.length > 0
      ? [...new Set(attendanceData.map((record) => record.department))].filter(
          Boolean
        )
      : [];

  // Export payroll to CSV
  const exportPayroll = () => {
    if (!Array.isArray(payrollData) || !payrollData.length) return;

    const csvHeaders = [
      "#",
      "Hire Date",
      "Employee Name",
      "Position",
      "Department",
      "Basic Salary",
      "Working Days",
      "Overtime",
      "Earned Salary",
      "Transport Allowance",
      "Telephone Allowance",
      "Position Allowance",
      "Taxable Income",
      "Gross Pay",
      "Income Tax",
      "Pension (7%)",
      "Pension (11%)",
      "Total Deductions",
      "Net Pay",
    ];

    const getSalary = (e) =>
      e.salary ??
      ((e.grossSalary || 0) / 30) *
        Math.max(0, (e.workingDays || 0) - (e.deductionDays || 0));
    const getTaxableIncome = (e) =>
      e.taxableIncome ?? getSalary(e) + (e.overtime ?? 0);

    const csvRows = payrollData.map((employee, index) => {
      const salary = getSalary(employee);
      const taxable = getTaxableIncome(employee);
      const allowances =
        (employee?.transportAllowance || 0) +
        (employee?.telephoneAllowance || 0) +
        (employee?.posAllowance || 0);
      const grossPay = taxable + allowances;
      const deductions =
        (employee?.employeePension || 0) + (employee?.incomeTax || 0);
      const workingDays =
        employee?.workingDays != null
          ? Math.max(0, (employee.workingDays || 0) - (employee.deductionDays || 0))
          : 0;
      const hireDate = employee?.joiningDate
        ? new Date(employee.joiningDate).toLocaleDateString("en-CA")
        : "-";

      return [
        (index + 1).toString(),
        hireDate,
        employee?.name || "Unknown",
        employee?.position || employee?.designation || "-",
        employee?.department || "-",
        (employee?.grossSalary || 0).toFixed(2),
        workingDays.toString(),
        (employee?.overtime || 0).toFixed(2),
        salary.toFixed(2),
        (employee?.transportAllowance || 0).toFixed(2),
        (employee?.telephoneAllowance || 0).toFixed(2),
        (employee?.posAllowance || 0).toFixed(2),
        taxable.toFixed(2),
        grossPay.toFixed(2),
        (employee?.incomeTax || 0).toFixed(2),
        (employee?.employeePension || 0).toFixed(2),
        (employee?.employerPension || 0).toFixed(2),
        deductions.toFixed(2),
        (employee?.netSalary || 0).toFixed(2),
      ];
    });

    // Add totals row (using computedSummary so it reflects overtime edits)
    csvRows.push([
      "TOTALS",
      "",
      "",
      "",
      "",
      (computedSummary?.totalGross || 0).toFixed(2),
      (computedSummary?.totalWorkedDays || 0).toString(),
      (computedSummary?.totalOvertime || 0).toFixed(2),
      (computedSummary?.totalSalary || 0).toFixed(2),
      (computedSummary?.totalTransportAllowance || 0).toFixed(2),
      (computedSummary?.totalTelephoneAllowance || 0).toFixed(2),
      (computedSummary?.totalPosAllowance || 0).toFixed(2),
      (computedSummary?.totalTaxableIncome || 0).toFixed(2),
      (computedSummary?.totalGrossPayment || 0).toFixed(2),
      (computedSummary?.totalIncomeTax || 0).toFixed(2),
      (computedSummary?.totalEmployeePension || 0).toFixed(2),
      (computedSummary?.totalEmployerPension || 0).toFixed(2),
      (computedSummary?.totalStatutoryDeduction || 0).toFixed(2),
      (computedSummary?.totalNet || 0).toFixed(2),
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
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
      formatWorkingHours(record),
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
    setAttendanceDetailModal({ open: false, employee: null });
  };

  // Handle admin-edited Transport/Overtime per employee
  const handleOvertimeChange = (employeeId, value) => {
    const raw = parseFloat(value);
    const overtime = Number.isNaN(raw) || raw < 0 ? 0 : raw;

    setPayrollData((prev) =>
      (prev || []).map((row, index) => {
        const id = row.employeeId || row._id || index;
        if (id !== employeeId) return row;

        const updated = { ...row, overtime };

        // If no overtime, fall back to backend-calculated values (based on Salary)
        if (!overtime) {
          return {
            ...updated,
            incomeTax: row.originalIncomeTax ?? row.incomeTax,
            netSalary: row.originalNetSalary ?? row.netSalary,
            taxableIncome: row.salary ?? row.adjustedGross ?? row.grossSalary ?? 0,
          };
        }

        // Base taxable income on Salary (all other cols derive from Salary)
        const salary =
          typeof row.salary === "number" && !Number.isNaN(row.salary)
            ? row.salary
            : (row.grossSalary || 0) / 30 * Math.max(0, (row.workingDays || 0) - (row.deductionDays || 0));

        // Taxable income includes Transport/Overtime as requested
        const taxableIncome = salary + overtime;
        const newIncomeTax = calculateIncomeTaxClient(taxableIncome);

        const allowances =
          (row.transportAllowance || 0) +
          (row.telephoneAllowance || 0) +
          (row.posAllowance || 0);

        const net = Math.max(
          0,
          salary +
            overtime -
            (newIncomeTax + (row.employeePension || 0)) +
            allowances
        );

        return {
          ...updated,
          incomeTax: Math.round(newIncomeTax * 100) / 100,
          netSalary: Math.round(net * 100) / 100,
          taxableIncome,
        };
      })
    );
  };

  // Recompute summary on client so UI matches any overtime edits
  const computedSummary = useMemo(() => {
    if (!Array.isArray(payrollData) || payrollData.length === 0) {
      return summary;
    }

    const base = {
      totalEmployees: payrollData.length,
      totalGross: 0,
      totalSalary: 0,
      totalTaxableIncome: 0,
      totalGrossPayment: 0,
      totalStatutoryDeduction: 0,
      totalWorkedDays: 0,
      totalTransportAllowance: 0,
      totalTelephoneAllowance: 0,
      totalPosAllowance: 0,
      totalEmployeePension: 0,
      totalEmployerPension: 0,
      totalIncomeTax: 0,
      totalDeductions: 0,
      totalOvertime: 0,
      totalNet: 0,
    };

    payrollData.forEach((e) => {
      const salaryBase = e.salary ?? e.adjustedGross ?? e.grossSalary ?? 0;
      const taxable =
        e.taxableIncome ?? salaryBase + (e.overtime ?? 0);
      const allowances =
        (e.transportAllowance || 0) +
        (e.telephoneAllowance || 0) +
        (e.posAllowance || 0);
      const grossPayment = taxable + allowances;
      const statutory = (e.employeePension || 0) + (e.incomeTax || 0);
      const worked =
        (e.workingDays || 0) - (e.deductionDays || 0) > 0
          ? (e.workingDays || 0) - (e.deductionDays || 0)
          : 0;

      base.totalGross += e.grossSalary || 0;
      base.totalSalary += e.salary ?? 0;
      base.totalTaxableIncome += taxable;
      base.totalGrossPayment += grossPayment;
      base.totalStatutoryDeduction += statutory;
      base.totalWorkedDays += worked;
      base.totalTransportAllowance += e.transportAllowance || 0;
      base.totalTelephoneAllowance += e.telephoneAllowance || 0;
      base.totalPosAllowance += e.posAllowance || 0;
      base.totalEmployeePension += e.employeePension || 0;
      base.totalEmployerPension += e.employerPension || 0;
      base.totalIncomeTax += e.incomeTax || 0;
      base.totalDeductions += e.deductionAmount || 0;
      base.totalOvertime += e.overtime || 0;
      base.totalNet += e.netSalary || 0;
    });

    Object.keys(base).forEach((key) => {
      if (typeof base[key] === "number") {
        base[key] = Math.round(base[key] * 100) / 100;
      }
    });

    return {
      ...(summary || {}),
      ...base,
    };
  }, [payrollData, summary]);

  return (
    <>
      {/* Main Interface */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black flex items-center gap-2">
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
          </div>
        </div>

        {/* Calculator Tab */}
        {activeTab === "calculator" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-black"
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
                <label className="block text-sm font-medium text-black mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-black"
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
              <p>
                <strong>Holiday Integration:</strong> Absences on Ethiopian
                holidays are not counted as deductions
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black text-black"
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black   "
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
              <>
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
                    {paginatedAttendanceData.map((record, index) => {
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
                          <td className="border border-gray-200 px-4 py-3 text-sm text-black">
                            {record.date || "N/A"}
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-sm font-medium text-black">
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
                          <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-indigo-700 text-center">
                            {formatWorkingHours(record)}
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
              <div className="border-t border-gray-200 bg-white">
                <Pagination
                  currentPage={attendancePage}
                  totalPages={totalAttendancePages}
                  totalItems={filteredAttendanceData.length}
                  itemsPerPage={attendancePerPage}
                  onPageChange={setAttendancePage}
                  onItemsPerPageChange={(sz) => {
                    setAttendancePerPage(sz);
                    setAttendancePage(1);
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>
            </>
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
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Payroll Modal - full screen */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50">
          <div className="bg-white w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-black flex items-center gap-2">
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
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
              {/* Summary Cards */}
              <div className="p-5 border-b border-slate-200 bg-white shadow-2xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {/* Total Employees */}
                  <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 rounded-xl border border-blue-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-blue-700 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Employees
                      </span>
                    </div>
                    <span className="text-xl font-extrabold text-blue-900">
                      {computedSummary?.totalEmployees || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Staff on Payroll</span>
                  </div>

                  {/* Total Basic Salary */}
                  <div className="bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 rounded-xl border border-sky-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-sky-700 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Basic Salary
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-sky-900 truncate" title={formatCurrency(computedSummary?.totalGross || 0)}>
                      {formatCurrency(computedSummary?.totalGross || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Base Total</span>
                  </div>

                  {/* Total Overtime */}
                  <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 rounded-xl border border-amber-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-amber-700 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Overtime
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-amber-900 truncate" title={formatCurrency(computedSummary?.totalOvertime || 0)}>
                      {formatCurrency(computedSummary?.totalOvertime || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Approved OT</span>
                  </div>

                  {/* Income Tax */}
                  <div className="bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 rounded-xl border border-rose-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-rose-700 mb-1">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Income Tax
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-rose-700 truncate" title={formatCurrency(computedSummary?.totalIncomeTax || 0)}>
                      {formatCurrency(computedSummary?.totalIncomeTax || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PAYE Withheld</span>
                  </div>

                  {/* Employee Pension */}
                  <div className="bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 rounded-xl border border-purple-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-purple-700 mb-1">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Pension (7%)
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-purple-900 truncate" title={formatCurrency(computedSummary?.totalEmployeePension || 0)}>
                      {formatCurrency(computedSummary?.totalEmployeePension || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Staff Share</span>
                  </div>

                  {/* Employer Pension */}
                  <div className="bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 rounded-xl border border-indigo-100 p-3.5 shadow-2xs text-center flex flex-col justify-between">
                    <div className="flex items-center justify-center gap-1.5 text-indigo-700 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Pension (11%)
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-indigo-900 truncate" title={formatCurrency(computedSummary?.totalEmployerPension || 0)}>
                      {formatCurrency(computedSummary?.totalEmployerPension || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Employer Share</span>
                  </div>

                  {/* Total Net */}
                  <div className={`rounded-xl border p-3.5 shadow-2xs text-center flex flex-col justify-between ${
                    (computedSummary?.totalNet || 0) < 0
                      ? "bg-gradient-to-br from-rose-100/90 via-white to-rose-50/50 border-rose-300 text-rose-900"
                      : "bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border-emerald-200 text-emerald-900"
                  }`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <DollarSign className={`w-4 h-4 ${(computedSummary?.totalNet || 0) < 0 ? "text-rose-700" : "text-emerald-700"}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Total Net Pay
                      </span>
                    </div>
                    <span className={`text-xs sm:text-sm font-extrabold truncate ${
                      (computedSummary?.totalNet || 0) < 0 ? "text-rose-700" : "text-emerald-800"
                    }`} title={formatCurrency(computedSummary?.totalNet || 0)}>
                      {formatCurrency(computedSummary?.totalNet || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Net Disbursement</span>
                  </div>
                </div>
              </div>

              {/* Payroll Table */}
              <div className="flex-1 p-5 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto max-h-full rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur border-b border-slate-300">
                      <tr>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-12 bg-slate-100">
                          #
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Hire Date
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[150px] bg-slate-100">
                          Employee Name
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Basic Salary
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Working Days
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Overtime
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap bg-slate-100 font-bold">
                          Earned Salary
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-right text-xs font-semibold text-amber-900 uppercase tracking-wider whitespace-nowrap bg-amber-50/50">
                          Transport
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-right text-xs font-semibold text-amber-900 uppercase tracking-wider whitespace-nowrap bg-amber-50/50">
                          Telephone
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-right text-xs font-semibold text-amber-900 uppercase tracking-wider whitespace-nowrap bg-amber-50/50">
                          Position Allow.
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Taxable Income
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-blue-900 uppercase tracking-wider whitespace-nowrap bg-blue-50/80 font-bold">
                          Gross Pay
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-rose-800 uppercase tracking-wider whitespace-nowrap bg-rose-50/50">
                          Income Tax
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-right text-xs font-semibold text-purple-900 uppercase tracking-wider whitespace-nowrap bg-purple-50/50">
                          Pension (7%)
                        </th>
                        <th className="border-r border-slate-200 px-2.5 py-3 text-right text-xs font-semibold text-indigo-900 uppercase tracking-wider whitespace-nowrap bg-indigo-50/50">
                          Pension (11%)
                        </th>
                        <th className="border-r border-slate-200 px-3 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap bg-slate-100">
                          Total Deductions
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-emerald-900 uppercase tracking-wider whitespace-nowrap bg-emerald-50">
                          Net Pay
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(payrollData) &&
                        paginatedPayrollData.map((employee, index) => {
                          if (!employee) return null;
                          const netVal = employee.netSalary || 0;

                          return (
                            <tr
                              key={employee.employeeId || index}
                              className={`transition-colors hover:bg-blue-50/40 ${
                                index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                              }`}
                            >
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-center text-slate-500 font-mono">
                                {(payrollPage - 1) * payrollPerPage + index + 1}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                                {employee.joiningDate
                                  ? new Date(
                                      employee.joiningDate
                                    ).toLocaleDateString("en-CA", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })
                                  : "-"}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-900 whitespace-nowrap">
                                <div>{employee.name || "Unknown"}</div>
                                {employee.position && (
                                  <div className="text-[10px] font-normal text-slate-400">
                                    {employee.position}
                                  </div>
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-700 text-right font-mono">
                                {formatCurrency(employee.grossSalary || 0)}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-800 text-right font-mono">
                                <div className="inline-flex items-center justify-end gap-1.5 w-full">
                                  <span className="font-semibold">
                                    {employee.workingDays != null
                                      ? Math.max(
                                          0,
                                          (employee.workingDays || 0) -
                                            (employee.deductionDays || 0)
                                        )
                                      : "-"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceDetailModal({
                                        open: true,
                                        employee,
                                      })
                                    }
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-2xs"
                                    title="View attendance & absence details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="border-r border-slate-100 px-2 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={employee.overtime ?? 0}
                                  onChange={(e) =>
                                    handleOvertimeChange(
                                      employee.employeeId || index,
                                      e.target.value
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 px-2 py-1 border border-slate-300 rounded-md text-right text-xs font-mono font-semibold text-slate-900 bg-white shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                                />
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-800 text-right font-mono font-semibold">
                                {formatCurrency(
                                  employee.salary ??
                                    ((employee.grossSalary || 0) / 30) *
                                      Math.max(
                                        0,
                                        (employee.workingDays || 0) -
                                          (employee.deductionDays || 0)
                                      )
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-slate-700 text-right font-mono bg-amber-50/20">
                                {formatCurrency(
                                  employee.transportAllowance || 0
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-slate-700 text-right font-mono bg-amber-50/20">
                                {formatCurrency(
                                  employee.telephoneAllowance || 0
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-slate-700 text-right font-mono bg-amber-50/20">
                                {formatCurrency(employee.posAllowance || 0)}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-800 text-right font-mono font-medium">
                                {formatCurrency(
                                  employee.taxableIncome ??
                                    (employee.salary ??
                                      employee.adjustedGross ??
                                      employee.grossSalary ??
                                      0) +
                                      (employee.overtime ?? 0)
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-blue-900 text-right font-mono font-bold bg-blue-50/40">
                                {formatCurrency(
                                  (employee.taxableIncome ??
                                    (employee.salary ??
                                      employee.adjustedGross ??
                                      employee.grossSalary ??
                                      0) +
                                      (employee.overtime ?? 0)) +
                                    (employee.transportAllowance || 0) +
                                    (employee.telephoneAllowance || 0) +
                                    (employee.posAllowance || 0)
                                )}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-rose-700 text-right font-mono font-medium bg-rose-50/20">
                                {formatCurrency(employee.incomeTax || 0)}
                              </td>
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-purple-900 text-right font-mono bg-purple-50/20">
                                {formatCurrency(employee.employeePension || 0)}
                              </td>
                              <td className="border-r border-slate-100 px-2.5 py-2.5 text-xs text-indigo-900 text-right font-mono bg-indigo-50/20">
                                {formatCurrency(employee.employerPension || 0)}
                              </td>
                              <td className="border-r border-slate-100 px-3 py-2.5 text-xs text-slate-800 text-right font-mono">
                                {formatCurrency(
                                  (employee.employeePension || 0) +
                                    (employee.incomeTax || 0)
                                )}
                              </td>
                              <td className={`px-3 py-2.5 text-xs text-right font-mono font-bold whitespace-nowrap ${
                                netVal < 0
                                  ? "text-rose-600 bg-rose-50/70"
                                  : netVal === 0
                                  ? "text-slate-400 bg-slate-50/30"
                                  : "text-emerald-700 bg-emerald-50/40"
                              }`}>
                                {formatCurrency(netVal)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur border-t-2 border-slate-300 font-bold">
                      <tr>
                        <td
                          className="border-r border-slate-200 px-3 py-3 text-xs text-slate-800 uppercase tracking-wider"
                          colSpan="3"
                        >
                          TOTALS
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-slate-900 text-right font-mono">
                          {formatCurrency(computedSummary?.totalGross || 0)}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-slate-900 text-right font-mono">
                          {computedSummary?.totalWorkedDays ?? ""}
                        </td>
                        <td className="border-r border-slate-200 px-2 py-3 text-xs text-slate-900 text-right font-mono">
                          {formatCurrency(computedSummary?.totalOvertime || 0)}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-slate-900 text-right font-mono">
                          {formatCurrency(computedSummary?.totalSalary || 0)}
                        </td>
                        <td className="border-r border-slate-200 px-2.5 py-3 text-xs text-amber-900 text-right font-mono bg-amber-50/30">
                          {formatCurrency(
                            computedSummary?.totalTransportAllowance || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-2.5 py-3 text-xs text-amber-900 text-right font-mono bg-amber-50/30">
                          {formatCurrency(
                            computedSummary?.totalTelephoneAllowance || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-2.5 py-3 text-xs text-amber-900 text-right font-mono bg-amber-50/30">
                          {formatCurrency(
                            computedSummary?.totalPosAllowance || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-slate-900 text-right font-mono font-medium">
                          {formatCurrency(
                            computedSummary?.totalTaxableIncome || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-blue-900 text-right font-mono bg-blue-50/60">
                          {formatCurrency(
                            computedSummary?.totalGrossPayment || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-rose-700 text-right font-mono bg-rose-50/30">
                          {formatCurrency(
                            computedSummary?.totalIncomeTax || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-2.5 py-3 text-xs text-purple-900 text-right font-mono bg-purple-50/30">
                          {formatCurrency(
                            computedSummary?.totalEmployeePension || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-2.5 py-3 text-xs text-indigo-900 text-right font-mono bg-indigo-50/30">
                          {formatCurrency(
                            computedSummary?.totalEmployerPension || 0
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-xs text-slate-900 text-right font-mono">
                          {formatCurrency(
                            computedSummary?.totalStatutoryDeduction || 0
                          )}
                        </td>
                        <td className={`px-3 py-3 text-xs text-right font-mono font-bold whitespace-nowrap ${
                          (computedSummary?.totalNet || 0) < 0
                            ? "text-rose-600 bg-rose-50/70"
                            : "text-emerald-800 bg-emerald-50/50"
                        }`}>
                          {formatCurrency(computedSummary?.totalNet || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {Array.isArray(payrollData) && payrollData.length > 0 && (
                  <div className="border-t border-gray-200 bg-white">
                    <Pagination
                      currentPage={payrollPage}
                      totalPages={totalPayrollPages}
                      totalItems={payrollData.length}
                      itemsPerPage={payrollPerPage}
                      onPageChange={setPayrollPage}
                      onItemsPerPageChange={(sz) => {
                        setPayrollPerPage(sz);
                        setPayrollPage(1);
                      }}
                      pageSizeOptions={[15, 25, 50, 100]}
                    />
                  </div>
                )}
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

      {/* Attendance & Absence Detail Modal (eye on working days) */}
      {attendanceDetailModal.open && attendanceDetailModal.employee && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() =>
            setAttendanceDetailModal({ open: false, employee: null })
          }
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-black flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-600" />
                Attendance & Absence Details
              </h3>
              <button
                type="button"
                onClick={() =>
                  setAttendanceDetailModal({ open: false, employee: null })
                }
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <p className="text-sm font-medium text-gray-500">Employee</p>
                <p className="text-base font-semibold text-black">
                  {attendanceDetailModal.employee.name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Period</p>
                <p className="text-base text-black">
                  {selectedMonth &&
                    new Date(0, selectedMonth - 1).toLocaleString("default", {
                      month: "long",
                    })}{" "}
                  {selectedYear}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Working days (in period so far)
                  </p>
                  <p className="text-xl font-bold text-black">
                    {attendanceDetailModal.employee.workingDays ?? "-"}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Days worked
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    {attendanceDetailModal.employee.workingDays != null
                      ? (attendanceDetailModal.employee.workingDays || 0) -
                        (attendanceDetailModal.employee.deductionDays || 0)
                      : "-"}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Days deducted (absence)
                  </p>
                  <p className="text-xl font-bold text-red-700">
                    {attendanceDetailModal.employee.deductionDays ?? 0}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Absence / deduction dates
                </p>
                {Array.isArray(
                  attendanceDetailModal.employee.deductionDates
                ) && attendanceDetailModal.employee.deductionDates.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800 max-h-40 overflow-y-auto">
                    {attendanceDetailModal.employee.deductionDates
                      .slice()
                      .sort()
                      .map((dateStr) => (
                        <li key={dateStr}>
                          {new Date(dateStr + "T12:00:00").toLocaleDateString(
                            "en-GB",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No absence or deduction dates in this period.</p>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setAttendanceDetailModal({ open: false, employee: null })
                }
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduction Detail Modal */}
      {deductionDetail.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-black">
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
