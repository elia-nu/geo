import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

// Export 5.4 Attendance Trend & Productivity Report
export async function POST(request) {
  try {
    const data = await request.json();

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "reports.export",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to export attendance reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      trends = [],
      filters = {},
    } = data;

    if (!Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        {
          error:
            "No trend data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "attendance_trends",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "attendance_trends",
          format,
          recordCount: trends.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(trends, filters);
      case "csv":
        return generateCSVExport(trends, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      "Error exporting attendance trend & productivity report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to export attendance trend & productivity report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(trends, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["ATTENDANCE TREND & PRODUCTIVITY REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["PERIODS"],
      [],
      ["Total Periods", trends.length],
    ];

    if (filters && Object.keys(filters).length > 0) {
      summaryData.push([], ["FILTERS APPLIED"]);
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          summaryData.push([k, String(v)]);
        }
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const headers = [
      "Period",
      "Year",
      "Month",
      "Quarter",
      "Total Working Hours",
      "Total Overtime Hours",
      "Distinct Employees",
      "Employee-Days Present",
      "Days in Period",
      "Absenteeism Rate (%)",
      "Avg Overtime per Employee (hrs)",
    ];

    const rows = [headers];
    trends.forEach((t) => {
      rows.push([
        t.periodKey || "",
        t.year ?? "",
        t.month ?? "",
        t.quarter ?? "",
        t.totalWorkingHours ?? 0,
        t.totalOvertimeHours ?? 0,
        t.distinctEmployees ?? 0,
        t.employeeDaysPresent ?? 0,
        t.daysInPeriod ?? 0,
        t.absenteeismRate ?? 0,
        t.avgOvertimePerEmployee ?? 0,
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 14 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 20 },
      { wch: 26 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "Trends");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `attendance_trends_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(
      "Error generating Excel export (attendance trends):",
      error
    );
    throw error;
  }
}

function generateCSVExport(trends, filters) {
  try {
    const escapeCSV = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [];
    rows.push("Section,Field,Value");
    rows.push(["Summary", "Total Periods", escapeCSV(trends.length)].join(","));

    if (filters && Object.keys(filters).length > 0) {
      rows.push("");
      rows.push("Filters,Key,Value");
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          rows.push(
            ["Filters", escapeCSV(k), escapeCSV(String(v))].join(",")
          );
        }
      });
    }

    rows.push("");
    const header = [
      "Period",
      "Year",
      "Month",
      "Quarter",
      "Total Working Hours",
      "Total Overtime Hours",
      "Distinct Employees",
      "Employee-Days Present",
      "Days in Period",
      "Absenteeism Rate (%)",
      "Avg Overtime per Employee (hrs)",
    ];
    rows.push(header.join(","));

    trends.forEach((t) => {
      rows.push(
        [
          escapeCSV(t.periodKey || ""),
          escapeCSV(t.year ?? ""),
          escapeCSV(t.month ?? ""),
          escapeCSV(t.quarter ?? ""),
          escapeCSV(t.totalWorkingHours ?? 0),
          escapeCSV(t.totalOvertimeHours ?? 0),
          escapeCSV(t.distinctEmployees ?? 0),
          escapeCSV(t.employeeDaysPresent ?? 0),
          escapeCSV(t.daysInPeriod ?? 0),
          escapeCSV(t.absenteeismRate ?? 0),
          escapeCSV(t.avgOvertimePerEmployee ?? 0),
        ].join(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `attendance_trends_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating CSV export (attendance trends):", error);
    throw error;
  }
}

