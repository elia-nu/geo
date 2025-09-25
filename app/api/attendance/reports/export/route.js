import { NextResponse } from "next/server";

// Export attendance report to text file
export async function POST(request) {
  try {
    const data = await request.json();
    console.log("Export request data:", data);

    const { reportType, startDate, endDate, summary, records, stats, filters } =
      data;

    // Validation
    if (!reportType || !startDate || !endDate || !summary) {
      return NextResponse.json(
        { error: "Report data is required for export" },
        { status: 400 }
      );
    }

    console.log("Generating text report for export...");

    // Generate text report
    const reportText = generateTextReport(
      { summary, records, stats },
      reportType,
      startDate,
      endDate
    );

    // Generate filename
    let fileName;
    switch (reportType) {
      case "daily":
        fileName = `daily_attendance_${startDate}.txt`;
        break;
      case "weekly":
        fileName = `weekly_attendance_${startDate}_to_${endDate}.txt`;
        break;
      case "monthly":
        fileName = `monthly_attendance_${startDate.substring(0, 7)}.txt`;
        break;
    }

    return new NextResponse(reportText, {
      headers: {
        "Content-Type": "text/plain",
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

function generateTextReport(reportData, reportType, startDate, endDate) {
  const lines = [];

  // Header
  lines.push("=".repeat(60));
  lines.push("ATTENDANCE REPORT");
  lines.push("=".repeat(60));
  lines.push("");

  // Report Type and Period
  lines.push(
    `Report Type: ${
      reportType.charAt(0).toUpperCase() + reportType.slice(1)
    } Report`
  );
  lines.push(`Period: ${startDate} - ${endDate}`);
  lines.push(`Generated on: ${new Date().toLocaleString()}`);
  lines.push("");

  // Summary
  lines.push("-".repeat(40));
  lines.push("SUMMARY");
  lines.push("-".repeat(40));
  const summary = reportData.summary;
  lines.push(`Total Records: ${summary.totalRecords}`);
  lines.push(`Unique Employees: ${summary.uniqueEmployees}`);
  lines.push(`Total Check-ins: ${summary.totalCheckIns}`);
  lines.push(`Total Check-outs: ${summary.totalCheckOuts}`);
  lines.push(`Total Working Hours: ${summary.totalWorkingHours}`);
  lines.push(`Face Verified: ${summary.totalFaceVerified}`);
  lines.push(`Location Verified: ${summary.totalLocationVerified}`);
  lines.push(`Average Working Hours: ${summary.averageWorkingHours}`);
  if (summary.uniqueDepartments) {
    lines.push(`Unique Departments: ${summary.uniqueDepartments}`);
  }
  lines.push("");

  // Statistics
  if (reportData.stats && reportData.stats.length > 0) {
    lines.push("-".repeat(40));
    lines.push("STATISTICS");
    lines.push("-".repeat(40));

    reportData.stats.forEach((stat, index) => {
      const period = stat.date || stat.weekStart || stat.monthKey;
      lines.push(`Period: ${period}`);
      lines.push(`  Check-ins: ${stat.checkIns}`);
      lines.push(`  Check-outs: ${stat.checkOuts}`);
      lines.push(`  Working Hours: ${stat.workingHours}`);
      lines.push(`  Face Verified: ${stat.faceVerified}`);
      lines.push(`  Location Verified: ${stat.locationVerified}`);
      lines.push(`  Unique Employees: ${stat.uniqueEmployees}`);
      if (stat.activeDays) lines.push(`  Active Days: ${stat.activeDays}`);
      if (stat.uniqueDepartments)
        lines.push(`  Departments: ${stat.uniqueDepartments}`);
      lines.push("");
    });
  }

  // Detailed Records (first 20 records only)
  if (reportData.records && reportData.records.length > 0) {
    lines.push("-".repeat(40));
    lines.push("DETAILED RECORDS");
    lines.push("-".repeat(40));

    reportData.records.slice(0, 20).forEach((record, index) => {
      lines.push(`${index + 1}. ${record.employeeName} - ${record.date}`);
      lines.push(`   Department: ${record.department}`);
      lines.push(
        `   Check-in: ${
          record.checkInTime
            ? new Date(record.checkInTime).toLocaleTimeString()
            : "N/A"
        }`
      );
      lines.push(
        `   Check-out: ${
          record.checkOutTime
            ? new Date(record.checkOutTime).toLocaleTimeString()
            : "N/A"
        }`
      );
      lines.push(`   Working Hours: ${record.workingHours || "N/A"}`);
      lines.push(`   Location: ${record.workLocationName}`);
      lines.push(`   Face Verified: ${record.faceVerified ? "Yes" : "No"}`);
      lines.push(`   Approval Status: ${record.approvalStatus}`);
      lines.push("");
    });

    if (reportData.records.length > 20) {
      lines.push(`... and ${reportData.records.length - 20} more records`);
      lines.push("");
    }
  }

  // Footer
  lines.push("-".repeat(40));
  lines.push("This report is for record-keeping and compliance purposes.");
  lines.push("Generated by HRM System");
  lines.push("=".repeat(60));

  return lines.join("\n");
}
