import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export 5.1 Daily Attendance Summary Report
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
      summary = {},
      byDepartment = [],
      bySite = [],
      byProject = [],
      byShift = [],
      filters = {},
    } = data;

    if (!summary || typeof summary !== "object") {
      return NextResponse.json(
        {
          error:
            "No summary data provided for export. Please generate the report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "attendance_daily_summary",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "attendance_daily_summary",
          format,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(
          summary,
          byDepartment,
          bySite,
          byProject,
          byShift,
          filters
        );
      case "csv":
        return generateCSVExport(
          summary,
          byDepartment,
          bySite,
          byProject,
          byShift,
          filters
        );
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      "Error exporting daily attendance summary report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to export daily attendance summary report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(
  summary,
  byDepartment,
  bySite,
  byProject,
  byShift,
  filters
) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["DAILY ATTENDANCE SUMMARY REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY (All Employees)"],
      [],
      ["Metric", "Value"],
      ["Total Employees", summary.totalEmployees || 0],
      ["Present", summary.present || 0],
      ["Absent", summary.absent || 0],
      ["Late", summary.late || 0],
      ["Early Checkout", summary.earlyCheckout || 0],
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
      "Group",
      "Type",
      "Total Employees",
      "Present",
      "Absent",
      "Late",
      "Early Checkout",
    ];

    const deptRows = [headers];
    byDepartment.forEach((g) => {
      deptRows.push([
        g.department || g.name || "Unassigned",
        "Department",
        g.totalEmployees || 0,
        g.present || 0,
        g.absent || 0,
        g.late || 0,
        g.earlyCheckout || 0,
      ]);
    });
    const deptSheet = XLSX.utils.aoa_to_sheet(deptRows);
    XLSX.utils.book_append_sheet(workbook, deptSheet, "By Department");

    const siteRows = [headers];
    bySite.forEach((g) => {
      siteRows.push([
        g.siteName || g.name || "Location",
        "Site",
        g.totalEmployees || 0,
        g.present || 0,
        g.absent || 0,
        g.late || 0,
        g.earlyCheckout || 0,
      ]);
    });
    const siteSheet = XLSX.utils.aoa_to_sheet(siteRows);
    XLSX.utils.book_append_sheet(workbook, siteSheet, "By Site");

    const projectRows = [headers];
    byProject.forEach((g) => {
      projectRows.push([
        g.projectName || g.name || "Project",
        "Project",
        g.totalEmployees || 0,
        g.present || 0,
        g.absent || 0,
        g.late || 0,
        g.earlyCheckout || 0,
      ]);
    });
    const projectSheet = XLSX.utils.aoa_to_sheet(projectRows);
    XLSX.utils.book_append_sheet(workbook, projectSheet, "By Project");

    const shiftRows = [headers];
    byShift.forEach((g) => {
      shiftRows.push([
        g.shift || g.name || "Shift",
        "Shift",
        g.totalEmployees || 0,
        g.present || 0,
        g.absent || 0,
        g.late || 0,
        g.earlyCheckout || 0,
      ]);
    });
    const shiftSheet = XLSX.utils.aoa_to_sheet(shiftRows);
    XLSX.utils.book_append_sheet(workbook, shiftSheet, "By Shift");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `daily_attendance_summary_${new Date()
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
      "Error generating Excel export (daily attendance summary):",
      error
    );
    throw error;
  }
}

function generateCSVExport(
  summary,
  byDepartment,
  bySite,
  byProject,
  byShift,
  filters
) {
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
    rows.push("Section,Metric,Value");
    rows.push(
      [
        "Summary",
        "Total Employees",
        escapeCSV(summary.totalEmployees || 0),
      ].join(",")
    );
    rows.push(
      ["Summary", "Present", escapeCSV(summary.present || 0)].join(",")
    );
    rows.push(
      ["Summary", "Absent", escapeCSV(summary.absent || 0)].join(",")
    );
    rows.push(["Summary", "Late", escapeCSV(summary.late || 0)].join(","));
    rows.push(
      [
        "Summary",
        "Early Checkout",
        escapeCSV(summary.earlyCheckout || 0),
      ].join(",")
    );

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

    const header = [
      "Section",
      "Group",
      "Type",
      "Total Employees",
      "Present",
      "Absent",
      "Late",
      "Early Checkout",
    ].join(",");

    const pushGroupRows = (section, list, getName) => {
      if (!Array.isArray(list) || list.length === 0) return;
      rows.push("");
      rows.push(header);
      list.forEach((g) => {
        rows.push(
          [
            section,
            escapeCSV(getName(g)),
            escapeCSV(section.replace("By ", "")),
            escapeCSV(g.totalEmployees || 0),
            escapeCSV(g.present || 0),
            escapeCSV(g.absent || 0),
            escapeCSV(g.late || 0),
            escapeCSV(g.earlyCheckout || 0),
          ].join(",")
        );
      });
    };

    pushGroupRows("By Department", byDepartment, (g) => g.department || g.name);
    pushGroupRows("By Site", bySite, (g) => g.siteName || g.name);
    pushGroupRows("By Project", byProject, (g) => g.projectName || g.name);
    pushGroupRows("By Shift", byShift, (g) => g.shift || g.name);

    const csvContent = rows.join("\n");
    const fileName = `daily_attendance_summary_${new Date()
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
    console.error(
      "Error generating CSV export (daily attendance summary):",
      error
    );
    throw error;
  }
}

