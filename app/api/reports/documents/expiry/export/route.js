import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Document Expiry & Compliance Report
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
            "Access denied. You don't have permission to export document reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel", // excel, csv
      summary = {},
      expiring = [],
      expired = [],
      params = {},
    } = data;

    if (!Array.isArray(expiring) && !Array.isArray(expired)) {
      return NextResponse.json(
        {
          error:
            "No document expiry data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "document_expiry_compliance",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "document_expiry_compliance",
          format,
          counts: {
            totalExpiring: summary?.totalExpiring || expiring.length || 0,
            totalExpired: summary?.totalExpired || expired.length || 0,
          },
          params,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(summary, expiring, expired, params);
      case "csv":
        return generateCSVExport(summary, expiring, expired, params);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting document expiry & compliance report:", error);
    return NextResponse.json(
      {
        error: "Failed to export document expiry & compliance report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(summary, expiring, expired, params) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["DOCUMENT EXPIRY & COMPLIANCE REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Expiring", summary?.totalExpiring || expiring.length || 0],
      ["Total Expired", summary?.totalExpired || expired.length || 0],
      [],
      ["Window (days)", params?.days || 30],
      [
        "Target Types",
        Array.isArray(params?.targetTypes)
          ? params.targetTypes.join(", ")
          : "",
      ],
    ];

    summaryData.push([], ["By Type"], ["Type", "Count"]);
    if (summary?.byType) {
      Object.entries(summary.byType).forEach(([t, count]) => {
        summaryData.push([t, count || 0]);
      });
    }

    summaryData.push([], ["By Department"], ["Department", "Count"]);
    if (summary?.byDepartment) {
      Object.entries(summary.byDepartment).forEach(([d, count]) => {
        summaryData.push([d, count || 0]);
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Helper for date + days
    const formatDate = (iso) => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return String(iso);
        return d.toLocaleDateString();
      } catch {
        return String(iso);
      }
    };

    const headers = [
      "Status",
      "Type",
      "Title",
      "Owner Name",
      "Owner Email",
      "Department",
      "Expiry Date",
      "Days Until Expiry",
      "Document ID",
      "Owner ID",
    ];

    const rows = [headers];

    const addRows = (list, statusLabel) => {
      list.forEach((item) => {
        rows.push([
          statusLabel,
          item.type || "",
          item.title || "",
          item.ownerName || "",
          item.ownerEmail || "",
          item.ownerDepartment || "",
          formatDate(item.expiryDate),
          item.daysUntilExpiry ?? "",
          item.documentId || "",
          item.ownerId || "",
        ]);
      });
    };

    addRows(expiring || [], "Expiring");
    addRows(expired || [], "Expired");

    const detailSheet = XLSX.utils.aoa_to_sheet(rows);
    detailSheet["!cols"] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 30 },
      { wch: 24 },
      { wch: 28 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Expiry Details");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `document_expiry_compliance_${new Date()
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
      "Error generating Excel export (document expiry & compliance):",
      error
    );
    throw error;
  }
}

function generateCSVExport(summary, expiring, expired, params) {
  try {
    const headers = [
      "Status",
      "Type",
      "Title",
      "Owner Name",
      "Owner Email",
      "Department",
      "Expiry Date",
      "Days Until Expiry",
      "Document ID",
      "Owner ID",
    ];

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (iso) => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return String(iso);
        return d.toLocaleDateString();
      } catch {
        return String(iso);
      }
    };

    const rows = [headers.join(",")];

    const addRows = (list, statusLabel) => {
      list.forEach((item) => {
        rows.push(
          [
            escapeCSV(statusLabel),
            escapeCSV(item.type || ""),
            escapeCSV(item.title || ""),
            escapeCSV(item.ownerName || ""),
            escapeCSV(item.ownerEmail || ""),
            escapeCSV(item.ownerDepartment || ""),
            escapeCSV(formatDate(item.expiryDate)),
            escapeCSV(item.daysUntilExpiry ?? ""),
            escapeCSV(item.documentId || ""),
            escapeCSV(item.ownerId || ""),
          ].join(",")
        );
      });
    };

    addRows(expiring || [], "Expiring");
    addRows(expired || [], "Expired");

    const csvContent = rows.join("\n");
    const fileName = `document_expiry_compliance_${new Date()
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
      "Error generating CSV export (document expiry & compliance):",
      error
    );
    throw error;
  }
}

