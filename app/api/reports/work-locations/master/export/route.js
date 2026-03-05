import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export 4.1 Site Location Master Report
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
      locations = [],
      summary = {},
      filters = {},
    } = data;

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        {
          error:
            "No location data provided for export. Please generate the report first.",
        },
        { status: 400 }
      );
    }

    // Non-blocking audit
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "site_location_master",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "site_location_master",
          format,
          recordCount: locations.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(locations, summary, filters);
      case "csv":
        return generateCSVExport(locations, summary, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting site location master report:", error);
    return NextResponse.json(
      {
        error: "Failed to export site location master report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(locations, summary, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["SITE LOCATION MASTER REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Locations", summary?.totalLocations || locations.length || 0],
      ["Active Locations", summary?.active || 0],
      ["Inactive Locations", summary?.inactive || 0],
      ["Total Employees Assigned", summary?.totalEmployees || 0],
    ];

    summaryData.push([], ["By Status"], ["Status", "Count"]);
    if (summary?.byStatus) {
      Object.entries(summary.byStatus).forEach(([st, count]) => {
        summaryData.push([st, count || 0]);
      });
    }

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

    // Detail sheet
    const headers = [
      "Location ID",
      "Name",
      "Address",
      "Latitude",
      "Longitude",
      "Radius (m)",
      "Status",
      "Employees Assigned",
      "Linked Projects",
      "Created At",
      "Updated At",
    ];

    const rows = [headers];

    locations.forEach((loc) => {
      const createdAt = loc.createdAt
        ? new Date(loc.createdAt).toLocaleString()
        : "";
      const updatedAt = loc.updatedAt
        ? new Date(loc.updatedAt).toLocaleString()
        : "";
      const projects = Array.isArray(loc.projectLinks)
        ? loc.projectLinks.map((p) => p.name).join(", ")
        : "";

      rows.push([
        loc.id || "",
        loc.name || "",
        loc.address || "",
        loc.latitude ?? "",
        loc.longitude ?? "",
        loc.radius ?? "",
        loc.status || "",
        loc.employeeCount ?? 0,
        projects,
        createdAt,
        updatedAt,
      ]);
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(rows);
    detailSheet["!cols"] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 32 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 32 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Locations");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `site_location_master_${new Date()
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
      "Error generating Excel export (site location master):",
      error
    );
    throw error;
  }
}

function generateCSVExport(locations, summary, filters) {
  try {
    const headers = [
      "Location ID",
      "Name",
      "Address",
      "Latitude",
      "Longitude",
      "Radius (m)",
      "Status",
      "Employees Assigned",
      "Linked Projects",
      "Created At",
      "Updated At",
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

    locations.forEach((loc) => {
      const createdAt = loc.createdAt
        ? new Date(loc.createdAt).toLocaleString()
        : "";
      const updatedAt = loc.updatedAt
        ? new Date(loc.updatedAt).toLocaleString()
        : "";
      const projects = Array.isArray(loc.projectLinks)
        ? loc.projectLinks.map((p) => p.name).join(", ")
        : "";

      rows.push(
        [
          escapeCSV(loc.id || ""),
          escapeCSV(loc.name || ""),
          escapeCSV(loc.address || ""),
          escapeCSV(loc.latitude ?? ""),
          escapeCSV(loc.longitude ?? ""),
          escapeCSV(loc.radius ?? ""),
          escapeCSV(loc.status || ""),
          escapeCSV(loc.employeeCount ?? 0),
          escapeCSV(projects),
          escapeCSV(createdAt),
          escapeCSV(updatedAt),
        ].join(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `site_location_master_${new Date()
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
      "Error generating CSV export (site location master):",
      error
    );
    throw error;
  }
}

