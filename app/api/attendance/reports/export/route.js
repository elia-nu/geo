import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Export attendance report to Excel file
export async function POST(request) {
  try {
    const data = await request.json();
    const { reportType, startDate, endDate, summary, records, stats, filters } =
      data;

    // Validation
    if (!reportType || !startDate || !endDate || !summary) {
      return NextResponse.json(
        { error: "Report data is required for export" },
        { status: 400 }
      );
    }

    // Generate Excel workbook
    const workbook = generateExcelReport(
      { summary, records, stats },
      reportType,
      startDate,
      endDate
    );

    // Generate filename
    let fileName;
    switch (reportType) {
      case "daily":
        fileName = `daily_attendance_${startDate}.xlsx`;
        break;
      case "weekly":
        fileName = `weekly_attendance_${startDate}_to_${endDate}.xlsx`;
        break;
      case "monthly":
        fileName = `monthly_attendance_${startDate.substring(0, 7)}.xlsx`;
        break;
      case "random":
        fileName = `random_attendance_${startDate}_to_${endDate}.xlsx`;
        break;
      default:
        fileName = `attendance_report_${startDate}.xlsx`;
    }

    // Convert workbook to buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error exporting attendance report:", error);
    return NextResponse.json(
      { error: "Failed to export attendance report", message: error.message },
      { status: 500 }
    );
  }
}

function generateExcelReport(reportData, reportType, startDate, endDate) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["ATTENDANCE REPORT"],
    [],
    [
      "Report Type",
      reportType.charAt(0).toUpperCase() + reportType.slice(1) + " Report",
    ],
    ["Period", `${startDate} - ${endDate}`],
    ["Generated on", new Date().toLocaleString()],
    [],
    ["SUMMARY"],
    [],
    ["Metric", "Value"],
    ["Total Records", reportData.summary.totalRecords],
    ["Unique Employees", reportData.summary.uniqueEmployees],
    ["Total Check-ins", reportData.summary.totalCheckIns],
    ["Total Check-outs", reportData.summary.totalCheckOuts],
    ["Total Working Hours", reportData.summary.totalWorkingHours],
    ["Face Verified", reportData.summary.totalFaceVerified],
    ["Location Verified", reportData.summary.totalLocationVerified],
    ["Average Working Hours", reportData.summary.averageWorkingHours],
  ];

  if (reportData.summary.uniqueDepartments) {
    summaryData.push([
      "Unique Departments",
      reportData.summary.uniqueDepartments,
    ]);
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Statistics Sheet
  if (reportData.stats && reportData.stats.length > 0) {
    const statsHeaders = [
      "Period",
      "Check-ins",
      "Check-outs",
      "Working Hours",
      "Face Verified",
      "Location Verified",
      "Unique Employees",
    ];

    // Add optional columns
    const hasActiveDays = reportData.stats.some(
      (s) => s.activeDays !== undefined
    );
    const hasDepartments = reportData.stats.some(
      (s) => s.uniqueDepartments !== undefined
    );

    if (hasActiveDays) statsHeaders.push("Active Days");
    if (hasDepartments) statsHeaders.push("Departments");

    const statsRows = [statsHeaders];

    reportData.stats.forEach((stat) => {
      const period = stat.date || stat.weekStart || stat.monthKey;
      const row = [
        period,
        stat.checkIns,
        stat.checkOuts,
        stat.workingHours,
        stat.faceVerified,
        stat.locationVerified,
        stat.uniqueEmployees,
      ];

      if (hasActiveDays) row.push(stat.activeDays || "");
      if (hasDepartments) row.push(stat.uniqueDepartments || "");

      statsRows.push(row);
    });

    const statsSheet = XLSX.utils.aoa_to_sheet(statsRows);
    XLSX.utils.book_append_sheet(workbook, statsSheet, "Statistics");
  }

  // Detailed Records Sheet
  if (reportData.records && reportData.records.length > 0) {
    const recordsHeaders = [
      "Employee Name",
      "Employee ID",
      "Date",
      "Department",
      "Check-in Time",
      "Check-out Time",
      "Working Hours",
      "Work Location",
      "Face Verified",
      "Location Verified",
      "Approval Status",
    ];

    const recordsRows = [recordsHeaders];

    reportData.records.forEach((record) => {
      recordsRows.push([
        record.employeeName || "N/A",
        record.employeeId || "N/A",
        record.date || "N/A",
        record.department || "N/A",
        record.checkInTime
          ? new Date(record.checkInTime).toLocaleString()
          : "N/A",
        record.checkOutTime
          ? new Date(record.checkOutTime).toLocaleString()
          : "N/A",
        record.workingHours || "N/A",
        record.workLocationName || "N/A",
        record.faceVerified ? "Yes" : "No",
        record.locationVerified ? "Yes" : "No",
        record.approvalStatus || "N/A",
      ]);
    });

    const recordsSheet = XLSX.utils.aoa_to_sheet(recordsRows);

    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Employee ID
      { wch: 12 }, // Date
      { wch: 15 }, // Department
      { wch: 20 }, // Check-in Time
      { wch: 20 }, // Check-out Time
      { wch: 15 }, // Working Hours
      { wch: 20 }, // Work Location
      { wch: 12 }, // Face Verified
      { wch: 15 }, // Location Verified
      { wch: 15 }, // Approval Status
    ];
    recordsSheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, recordsSheet, "Detailed Records");
  }

  return workbook;
}
