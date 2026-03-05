import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

// Export Site Attendance Compliance Report
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
            "Access denied. You don't have permission to export work location reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      sites = [],
      summary = {},
      filters = {},
    } = data;

    if (!Array.isArray(sites) || sites.length === 0) {
      return NextResponse.json(
        {
          error:
            "No site compliance data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "site_attendance_compliance",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "site_attendance_compliance",
          format,
          recordCount: sites.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(sites, summary, filters);
      case "csv":
        return generateCSVExport(sites, summary, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting site attendance compliance report:", error);
    return NextResponse.json(
      {
        error: "Failed to export site attendance compliance report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(sites, summary, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["SITE ATTENDANCE COMPLIANCE REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Sites", summary?.totalSites || sites.length || 0],
      ["Total Check-ins", summary?.totalChecks || 0],
      ["Total Compliant Check-ins", summary?.totalCompliant || 0],
      ["Total Non-compliant Check-ins", summary?.totalNonCompliant || 0],
      [
        "Overall Compliance Rate (%)",
        (summary?.overallComplianceRate ?? 0).toFixed(2),
      ],
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
      "Site Name",
      "Address",
      "Latitude",
      "Longitude",
      "Radius (m)",
      "Status",
      "Total Check-ins",
      "Compliant Check-ins",
      "Non-compliant Check-ins",
      "Compliance Rate (%)",
      "Non-compliance Rate (%)",
      "Unique Employees",
    ];

    const rows = [headers];

    sites.forEach((s) => {
      rows.push([
        s.name || "",
        s.address || "",
        s.latitude ?? "",
        s.longitude ?? "",
        s.radius ?? "",
        s.status || "",
        s.totalChecks || 0,
        s.compliant || 0,
        s.nonCompliant || 0,
        (s.complianceRate ?? 0).toFixed(2),
        (s.nonComplianceRate ?? 0).toFixed(2),
        s.uniqueEmployees || 0,
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 24 },
      { wch: 32 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "Site Compliance");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `site_attendance_compliance_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${encodeURIComponent(
          fileName
        )}\"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(
      "Error generating Excel export (site attendance compliance):",
      error
    );
    throw error;
  }
}

function generateCSVExport(sites, summary, filters) {
  try {
    const headers = [
      "Site Name",
      "Address",
      "Latitude",
      "Longitude",
      "Radius (m)",
      "Status",
      "Total Check-ins",
      "Compliant Check-ins",
      "Non-compliant Check-ins",
      "Compliance Rate (%)",
      "Non-compliance Rate (%)",
      "Unique Employees",
    ];

    const escapeCSV = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [headers.join(",")];

    sites.forEach((s) => {
      rows.push(
        [
          escapeCSV(s.name || ""),
          escapeCSV(s.address || ""),
          escapeCSV(s.latitude ?? ""),
          escapeCSV(s.longitude ?? ""),
          escapeCSV(s.radius ?? ""),
          escapeCSV(s.status || ""),
          escapeCSV(s.totalChecks || 0),
          escapeCSV(s.compliant || 0),
          escapeCSV(s.nonCompliant || 0),
          escapeCSV((s.complianceRate ?? 0).toFixed(2)),
          escapeCSV((s.nonComplianceRate ?? 0).toFixed(2)),
          escapeCSV(s.uniqueEmployees || 0),
        ].joined(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `site_attendance_compliance_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${encodeURIComponent(
          fileName
        )}\"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(
      "Error generating CSV export (site attendance compliance):",
      error
    );
    throw error;
  }
}

