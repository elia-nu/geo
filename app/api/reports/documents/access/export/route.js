import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

// Export Document Access & Activity Audit Report
export async function POST(request) {
  try {
    const data = await request.json();

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "audit.read",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to export audit reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel", // excel, csv
      events = [],
      summary = {},
      filters = {},
    } = data;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          error:
            "No audit data provided for export. Please generate the report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "document_access_audit",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "document_access_audit",
          format,
          recordCount: events.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(events, summary, filters);
      case "csv":
        return generateCSVExport(events, summary, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      "Error exporting document access & activity audit report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to export document access & activity audit report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(events, summary, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["DOCUMENT ACCESS & ACTIVITY AUDIT REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Events", summary?.totalEvents || events.length || 0],
      ["Unique Users", Object.keys(summary?.byUser || {}).length],
      ["Unique Documents", Object.keys(summary?.byDocument || {}).length],
      [],
      ["Filters"],
    ];

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        summaryData.push([key, String(value)]);
      }
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Activity sheet
    const headers = [
      "Timestamp",
      "Action",
      "Document Title",
      "Document Type",
      "Document ID",
      "Owner Name",
      "Owner Email",
      "Owner Department",
      "Actor Email",
      "Actor ID",
      "Actor Role",
      "IP Address",
      "User Agent",
      "Device",
    ];

    const rows = [headers];

    events.forEach((ev) => {
      let ts = "";
      try {
        if (ev.timestamp) {
          const d =
            ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);
          if (!isNaN(d.getTime())) ts = d.toLocaleString();
        }
      } catch {
        ts = String(ev.timestamp || "");
      }

      rows.push([
        ts,
        ev.action || "",
        ev.documentTitle || "",
        ev.documentType || "",
        ev.documentId || "",
        ev.ownerName || "",
        ev.ownerEmail || "",
        ev.ownerDepartment || "",
        ev.actorEmail || "",
        ev.actorId || "",
        ev.actorRole || "",
        ev.ip || "",
        ev.userAgent || "",
        ev.device || "",
      ]);
    });

    const activitySheet = XLSX.utils.aoa_to_sheet(rows);
    activitySheet["!cols"] = [
      { wch: 20 }, // Timestamp
      { wch: 10 }, // Action
      { wch: 30 }, // Document Title
      { wch: 18 }, // Document Type
      { wch: 20 }, // Document ID
      { wch: 24 }, // Owner Name
      { wch: 26 }, // Owner Email
      { wch: 20 }, // Owner Department
      { wch: 26 }, // Actor Email
      { wch: 18 }, // Actor ID
      { wch: 16 }, // Actor Role
      { wch: 16 }, // IP
      { wch: 40 }, // User Agent
      { wch: 14 }, // Device
    ];
    XLSX.utils.book_append_sheet(workbook, activitySheet, "Activity");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `document_access_audit_${new Date()
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
      "Error generating Excel export (document access & activity):",
      error
    );
    throw error;
  }
}

function generateCSVExport(events, summary, filters) {
  try {
    const headers = [
      "Timestamp",
      "Action",
      "Document Title",
      "Document Type",
      "Document ID",
      "Owner Name",
      "Owner Email",
      "Owner Department",
      "Actor Email",
      "Actor ID",
      "Actor Role",
      "IP Address",
      "User Agent",
      "Device",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.join(",")];

    events.forEach((ev) => {
      let ts = "";
      try {
        if (ev.timestamp) {
          const d =
            ev.timestamp instanceof Date ? ev.timestamp : new Date(ev.timestamp);
          if (!isNaN(d.getTime())) ts = d.toLocaleString();
        }
      } catch {
        ts = String(ev.timestamp || "");
      }

      const line = [
        escapeCSV(ts),
        escapeCSV(ev.action || ""),
        escapeCSV(ev.documentTitle || ""),
        escapeCSV(ev.documentType || ""),
        escapeCSV(ev.documentId || ""),
        escapeCSV(ev.ownerName || ""),
        escapeCSV(ev.ownerEmail || ""),
        escapeCSV(ev.ownerDepartment || ""),
        escapeCSV(ev.actorEmail || ""),
        escapeCSV(ev.actorId || ""),
        escapeCSV(ev.actorRole || ""),
        escapeCSV(ev.ip || ""),
        escapeCSV(ev.userAgent || ""),
        escapeCSV(ev.device || ""),
      ];

      rows.push(line.join(","));
    });

    const csvContent = rows.join("\n");
    const fileName = `document_access_audit_${new Date()
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
      "Error generating CSV export (document access & activity):",
      error
    );
    throw error;
  }
}

