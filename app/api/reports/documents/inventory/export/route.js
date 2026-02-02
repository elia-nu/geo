import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

// Export Document Inventory Report
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
      documents = [],
      summary = {},
      filters = {},
    } = data;

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        {
          error:
            "No document data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    // Non-blocking audit log
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "document_inventory",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "document_inventory",
          format,
          recordCount: documents.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(documents, summary, filters);
      case "csv":
        return generateCSVExport(documents, summary, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting document inventory report:", error);
    return NextResponse.json(
      {
        error: "Failed to export document inventory report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(documents, summary, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["DOCUMENT INVENTORY REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Documents", summary?.total || documents.length || 0],
    ];

    summaryData.push([], ["By Type"], ["Type", "Count"]);
    if (summary?.byType) {
      Object.entries(summary.byType).forEach(([t, count]) => {
        summaryData.push([t, count || 0]);
      });
    }

    summaryData.push([], ["By Status"], ["Status", "Count"]);
    if (summary?.byStatus) {
      Object.entries(summary.byStatus).forEach(([s, count]) => {
        summaryData.push([s, count || 0]);
      });
    }

    summaryData.push([], ["By Department"], ["Department", "Count"]);
    if (summary?.byDepartment) {
      Object.entries(summary.byDepartment).forEach(([d, count]) => {
        summaryData.push([d, count || 0]);
      });
    }

    if (filters && Object.keys(filters).length > 0) {
      summaryData.push([], ["FILTERS APPLIED"]);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          summaryData.push([key, String(value)]);
        }
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Detail sheet
    const headers = [
      "Document ID",
      "Title",
      "Original Name",
      "Type",
      "Owner Name",
      "Owner Email",
      "Department",
      "Projects",
      "Status",
      "Raw Status",
      "Upload Date",
      "Expiry Date",
      "File Size (bytes)",
      "MIME Type",
    ];

    const rows = [headers];

    documents.forEach((doc) => {
      let uploadDate = "";
      try {
        if (doc.uploadDate) {
          const d =
            doc.uploadDate instanceof Date
              ? doc.uploadDate
              : new Date(doc.uploadDate);
          if (!isNaN(d.getTime())) uploadDate = d.toLocaleDateString();
        }
      } catch (_) {
        uploadDate = String(doc.uploadDate || "");
      }

      let expiryDate = "";
      try {
        if (doc.expiryDate) {
          const d =
            doc.expiryDate instanceof Date
              ? doc.expiryDate
              : new Date(doc.expiryDate);
          if (!isNaN(d.getTime())) expiryDate = d.toLocaleDateString();
        }
      } catch (_) {
        expiryDate = String(doc.expiryDate || "");
      }

      rows.push([
        doc.documentId || doc._id?.toString() || "",
        doc.title || "",
        doc.originalName || "",
        doc.normalizedType || doc.documentType || "",
        doc.ownerName || "",
        doc.ownerEmail || "",
        doc.ownerDepartment || "",
        Array.isArray(doc.projectNames) ? doc.projectNames.join(", ") : "",
        doc.status || "",
        doc.rawStatus || "",
        uploadDate,
        expiryDate,
        doc.fileSize || "",
        doc.mimeType || "",
      ]);
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(rows);
    detailSheet["!cols"] = [
      { wch: 16 },
      { wch: 30 },
      { wch: 30 },
      { wch: 16 },
      { wch: 24 },
      { wch: 28 },
      { wch: 20 },
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Inventory");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `document_inventory_report_${new Date()
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
    console.error("Error generating Excel export (document inventory):", error);
    throw error;
  }
}

function generateCSVExport(documents, summary, filters) {
  try {
    const headers = [
      "Document ID",
      "Title",
      "Original Name",
      "Type",
      "Owner Name",
      "Owner Email",
      "Department",
      "Projects",
      "Status",
      "Raw Status",
      "Upload Date",
      "Expiry Date",
      "File Size (bytes)",
      "MIME Type",
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

    documents.forEach((doc) => {
      let uploadDate = "";
      try {
        if (doc.uploadDate) {
          const d =
            doc.uploadDate instanceof Date
              ? doc.uploadDate
              : new Date(doc.uploadDate);
          if (!isNaN(d.getTime())) uploadDate = d.toLocaleDateString();
        }
      } catch (_) {
        uploadDate = String(doc.uploadDate || "");
      }

      let expiryDate = "";
      try {
        if (doc.expiryDate) {
          const d =
            doc.expiryDate instanceof Date
              ? doc.expiryDate
              : new Date(doc.expiryDate);
          if (!isNaN(d.getTime())) expiryDate = d.toLocaleDateString();
        }
      } catch (_) {
        expiryDate = String(doc.expiryDate || "");
      }

      const line = [
        escapeCSV(doc.documentId || doc._id?.toString() || ""),
        escapeCSV(doc.title || ""),
        escapeCSV(doc.originalName || ""),
        escapeCSV(doc.normalizedType || doc.documentType || ""),
        escapeCSV(doc.ownerName || ""),
        escapeCSV(doc.ownerEmail || ""),
        escapeCSV(doc.ownerDepartment || ""),
        escapeCSV(
          Array.isArray(doc.projectNames) ? doc.projectNames.join(", ") : ""
        ),
        escapeCSV(doc.status || ""),
        escapeCSV(doc.rawStatus || ""),
        escapeCSV(uploadDate),
        escapeCSV(expiryDate),
        escapeCSV(doc.fileSize || ""),
        escapeCSV(doc.mimeType || ""),
      ];

      rows.push(line.join(","));
    });

    const csvContent = rows.join("\n");
    const fileName = `document_inventory_report_${new Date()
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
    console.error("Error generating CSV export (document inventory):", error);
    throw error;
  }
}

