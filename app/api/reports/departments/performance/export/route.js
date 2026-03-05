import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Department Performance Summary Report
export async function POST(request) {
  try {
    const data = await request.json();

    // Get current user for role-based access
    const user = await getCurrentUser(request);

    // Check permission to export reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.export", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to export reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel", // excel, csv
      departments = [],
      summary = {},
    } = data;

    // Validate data
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return NextResponse.json(
        { error: "No department data provided for export. Please generate a report first." },
        { status: 400 }
      );
    }

    // Create audit log (don't block export if this fails)
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "department_performance",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "department_performance",
          format,
          recordCount: departments.length,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    // Generate export based on format
    try {
      switch (format.toLowerCase()) {
        case "excel":
        case "xlsx":
          return generateExcelExport(departments, summary);
        case "csv":
          return generateCSVExport(departments, summary);
        default:
          return NextResponse.json(
            { error: "Unsupported export format. Use: excel or csv" },
            { status: 400 }
          );
      }
    } catch (exportError) {
      console.error("Error in export generation:", exportError);
      return NextResponse.json(
        {
          error: "Failed to generate export file",
          message: exportError.message || "Unknown error occurred",
          details: process.env.NODE_ENV === "development" ? exportError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error exporting department performance report:", error);
    return NextResponse.json(
      {
        error: "Failed to export department performance report",
        message: error.message || "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate Excel export
function generateExcelExport(departments, summary) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["DEPARTMENT PERFORMANCE SUMMARY REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Departments", summary?.totalDepartments || 0],
      ["Total Employees", summary?.totalEmployees || 0],
      ["Total Active Employees", summary?.totalActiveEmployees || 0],
      ["Average Attendance Rate", `${(summary?.averageAttendanceRate || 0).toFixed(2)}%`],
      ["Total Payroll Cost", summary?.totalPayrollCost || 0],
      ["Average Workforce Utilization", `${(summary?.averageWorkforceUtilization || 0).toFixed(2)}%`],
      ["Total Leave Requests", summary?.totalLeaveRequests || 0],
      [],
      ["Period"],
      ["Start Date", summary?.period?.startDate || ""],
      ["End Date", summary?.period?.endDate || ""],
      ["Working Days", summary?.period?.workingDays || 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Department Performance Sheet
    const performanceHeaders = [
      "Department",
      "Total Employees",
      "Active Employees",
      "Attendance Rate (%)",
      "Total Attendance Days",
      "Expected Attendance Days",
      "Leave Frequency",
      "Total Leave Days",
      "Payroll Cost",
      "Workforce Utilization (%)",
      "Total Working Hours",
      "Expected Working Hours",
      "Average Working Hours",
    ];

    const performanceRows = [performanceHeaders];

    departments.forEach((dept) => {
      performanceRows.push([
        dept.departmentName || "",
        dept.totalEmployees || 0,
        dept.activeEmployees || 0,
        (dept.attendanceRate || 0).toFixed(2),
        dept.totalAttendanceDays || 0,
        dept.expectedAttendanceDays || 0,
        dept.leaveFrequency || 0,
        dept.totalLeaveDays || 0,
        dept.payrollCost || 0,
        (dept.workforceUtilization || 0).toFixed(2),
        dept.totalWorkingHours || 0,
        dept.expectedWorkingHours || 0,
        (dept.averageWorkingHours || 0).toFixed(2),
      ]);
    });

    const performanceSheet = XLSX.utils.aoa_to_sheet(performanceRows);

    // Set column widths
    performanceSheet["!cols"] = [
      { wch: 25 }, // Department
      { wch: 15 }, // Total Employees
      { wch: 15 }, // Active Employees
      { wch: 18 }, // Attendance Rate
      { wch: 20 }, // Total Attendance Days
      { wch: 22 }, // Expected Attendance Days
      { wch: 15 }, // Leave Frequency
      { wch: 15 }, // Total Leave Days
      { wch: 15 }, // Payroll Cost
      { wch: 22 }, // Workforce Utilization
      { wch: 18 }, // Total Working Hours
      { wch: 20 }, // Expected Working Hours
      { wch: 18 }, // Average Working Hours
    ];

    XLSX.utils.book_append_sheet(workbook, performanceSheet, "Department Performance");

    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `department_performance_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating Excel export:", error);
    throw error;
  }
}

// Generate CSV export
function generateCSVExport(departments, summary) {
  try {
    const headers = [
      "Department",
      "Total Employees",
      "Active Employees",
      "Attendance Rate (%)",
      "Total Attendance Days",
      "Expected Attendance Days",
      "Leave Frequency",
      "Total Leave Days",
      "Payroll Cost",
      "Workforce Utilization (%)",
      "Total Working Hours",
      "Expected Working Hours",
      "Average Working Hours",
    ];

    const csvRows = [headers.join(",")];

    // Escape CSV values properly
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    departments.forEach((dept) => {
      csvRows.push([
        escapeCSV(dept.departmentName || ""),
        escapeCSV(dept.totalEmployees || 0),
        escapeCSV(dept.activeEmployees || 0),
        escapeCSV((dept.attendanceRate || 0).toFixed(2)),
        escapeCSV(dept.totalAttendanceDays || 0),
        escapeCSV(dept.expectedAttendanceDays || 0),
        escapeCSV(dept.leaveFrequency || 0),
        escapeCSV(dept.totalLeaveDays || 0),
        escapeCSV(dept.payrollCost || 0),
        escapeCSV((dept.workforceUtilization || 0).toFixed(2)),
        escapeCSV(dept.totalWorkingHours || 0),
        escapeCSV(dept.expectedWorkingHours || 0),
        escapeCSV((dept.averageWorkingHours || 0).toFixed(2)),
      ].join(","));
    });

    const csvContent = csvRows.join("\n");
    const fileName = `department_performance_report_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating CSV export:", error);
    throw error;
  }
}
