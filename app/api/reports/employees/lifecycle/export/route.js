import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Employee Lifecycle Activity Report
export async function POST(request) {
  try {
    const data = await request.json();
    const user = await getCurrentUser(request);

    const hasPermission = await checkPermission(user.userId, "reports.export", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to export reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      activities = [],
      stats = {},
      filters = {},
    } = data;

    if (!activities || activities.length === 0) {
      return NextResponse.json(
        { error: "No activity data provided for export" },
        { status: 400 }
      );
    }

    await createAuditLog({
      action: "EXPORT",
      entityType: "report",
      entityId: "employee_lifecycle",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_lifecycle",
        format,
        recordCount: activities.length,
        filters,
      },
    });

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(activities, stats, filters);
      case "csv":
        return generateCSVExport(activities, stats, filters);
      case "pdf":
        return await generatePDFExport(activities, stats, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel, csv, or pdf" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting employee lifecycle report:", error);
    return NextResponse.json(
      {
        error: "Failed to export employee lifecycle report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(activities, stats, filters) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["EMPLOYEE LIFECYCLE ACTIVITY REPORT"],
    [],
    ["Generated on", new Date().toLocaleString()],
    [],
    ["SUMMARY"],
    [],
    ["Metric", "Value"],
    ["Total Activities", stats.totalActivities || activities.length],
    [],
    ["By Activity Type"],
    ["Activity Type", "Count"],
  ];

  if (stats.byType) {
    Object.entries(stats.byType).forEach(([type, count]) => {
      summaryData.push([type, count]);
    });
  }

  summaryData.push([], ["By Admin User"], ["Admin Email", "Activity Count"]);
  if (stats.byAdmin) {
    Object.values(stats.byAdmin).forEach((admin) => {
      summaryData.push([admin.email, admin.activityCount]);
    });
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Activity Details Sheet
  const headers = [
    "Timestamp",
    "Activity Type",
    "Description",
    "Employee Name",
    "Employee ID",
    "Department",
    "Admin User",
    "Admin Email",
    "Changes",
  ];

  const rows = [headers];
  activities.forEach((activity) => {
    rows.push([
      new Date(activity.timestamp).toLocaleString(),
      activity.activityType,
      activity.activityDescription,
      activity.employee.name,
      activity.employee.id,
      activity.employee.department,
      activity.admin.userId,
      activity.admin.email,
      activity.changes ? JSON.stringify(activity.changes) : "N/A",
    ]);
  });

  const activitySheet = XLSX.utils.aoa_to_sheet(rows);
  activitySheet["!cols"] = [
    { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, activitySheet, "Activity Details");

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `employee_lifecycle_report_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache",
    },
  });
}

function generateCSVExport(activities, stats, filters) {
  const headers = [
    "Timestamp",
    "Activity Type",
    "Description",
    "Employee Name",
    "Employee ID",
    "Department",
    "Admin User",
    "Admin Email",
  ];

  const csvRows = [headers.join(",")];
  activities.forEach((activity) => {
    const row = [
      new Date(activity.timestamp).toLocaleString(),
      `"${(activity.activityType || "").replace(/"/g, '""')}"`,
      `"${(activity.activityDescription || "").replace(/"/g, '""')}"`,
      `"${(activity.employee.name || "").replace(/"/g, '""')}"`,
      activity.employee.id || "",
      `"${(activity.employee.department || "").replace(/"/g, '""')}"`,
      activity.admin.userId || "",
      activity.admin.email || "",
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");
  const fileName = `employee_lifecycle_report_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache",
    },
  });
}

async function generatePDFExport(activities, stats, filters) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `employee_lifecycle_report_${new Date()
          .toISOString()
          .split("T")[0]}.pdf`;

        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Cache-Control": "no-cache",
            },
          })
        );
      });
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("EMPLOYEE LIFECYCLE ACTIVITY REPORT", {
        align: "center",
      });
      doc.moveDown();
      doc.fontSize(10).font("Helvetica").text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      doc.fontSize(14).font("Helvetica-Bold").text("SUMMARY");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Total Activities: ${stats.totalActivities || activities.length}`);
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("ACTIVITY DETAILS");
      doc.moveDown(0.5);

      activities.forEach((activity, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
        }

        doc.fontSize(9).font("Helvetica-Bold");
        doc.text(
          `${new Date(activity.timestamp).toLocaleString()} - ${activity.activityType}`
        );
        doc.font("Helvetica");
        doc.text(`   Employee: ${activity.employee.name} (${activity.employee.id})`);
        doc.text(`   Description: ${activity.activityDescription}`);
        doc.text(`   Admin: ${activity.admin.email}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
