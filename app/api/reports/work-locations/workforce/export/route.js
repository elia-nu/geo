import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Workforce Distribution by Site Report
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
            "No workforce distribution data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "workforce_distribution_sites",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "workforce_distribution_sites",
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
    console.error("Error exporting workforce distribution report:", error);
    return NextResponse.json(
      {
        error: "Failed to export workforce distribution report",
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
      ["WORKFORCE DISTRIBUTION BY SITE"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Sites", summary?.totalSites || sites.length || 0],
      ["Total Employees", summary?.totalEmployees || 0],
      ["Total Present Employees", summary?.totalPresent || 0],
      [
        "Average Utilization (%)",
        (summary?.averageUtilization ?? 0).toFixed(2),
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
      "Total Employees",
      "Present Employees",
      "Utilization (%)",
      "Departments (name:count)",
      "Projects (name:count)",
    ];

    const rows = [headers];

    sites.forEach((s) => {
      const deptStr = s.departments
        ? Object.entries(s.departments)
            .map(([name, count]) => `${name}: ${count}`)
            .join("; ")
        : "";
      const projStr = s.projects
        ? Object.entries(s.projects)
            .map(([name, count]) => `${name}: ${count}`)
            .join("; ")
        : "";
      rows.push([
        s.name || "",
        s.address || "",
        s.latitude ?? "",
        s.longitude ?? "",
        s.radius ?? "",
        s.status || "",
        s.totalEmployees || 0,
        s.presentEmployees || 0,
        (s.utilization ?? 0).toFixed(2),
        deptStr,
        projStr,
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
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
      { wch: 32 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "Workforce");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `workforce_distribution_sites_${new Date()
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
      "Error generating Excel export (workforce distribution):",
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
      "Total Employees",
      "Present Employees",
      "Utilization (%)",
      "Departments (name:count)",
      "Projects (name:count)",
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
      const deptStr = s.departments
        ? Object.entries(s.departments)
            .map(([name, count]) => `${name}: ${count}`)
            .join("; ")
        : "";
      const projStr = s.projects
        ? Object.entries(s.projects)
            .map(([name, count]) => `${name}: ${count}`)
            .join("; ")
        : "";
      rows.push(
        [
          escapeCSV(s.name || ""),
          escapeCSV(s.address || ""),
          escapeCSV(s.latitude ?? ""),
          escapeCSV(s.longitude ?? ""),
          escapeCSV(s.radius ?? ""),
          escapeCSV(s.status || ""),
          escapeCSV(s.totalEmployees || 0),
          escapeCSV(s.presentEmployees || 0),
          escapeCSV((s.utilization ?? 0).toFixed(2)),
          escapeCSV(deptStr),
          escapeCSV(projStr),
        ].join(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `workforce_distribution_sites_${new Date()
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
      "Error generating CSV export (workforce distribution):",
      error
    );
    throw error;
  }
}

