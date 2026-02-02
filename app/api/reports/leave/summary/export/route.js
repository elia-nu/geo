import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

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
            "Access denied. You don't have permission to export leave reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      summary = {},
      byDepartment = [],
      byProject = [],
      bySite = [],
      filters = {},
    } = data;

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "leave_request_summary",
        userId: user.userId,
        userEmail: user.email,
        metadata: { reportType: "leave_request_summary", format, filters },
      });
    } catch (e) {
      console.error("Audit log (non-blocking):", e);
    }

    if (format.toLowerCase() === "csv") {
      return generateCSV(
        summary,
        byDepartment,
        byProject,
        bySite,
        filters
      );
    }

    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      ["LEAVE REQUEST SUMMARY REPORT"],
      [],
      ["Generated", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      ["Total Requests", summary.totalRequests || 0],
      [],
      ["By Type"],
      ["Type", "Count"],
      ...(summary.byType || []).map((r) => [r.type, r.count]),
      [],
      ["By Status"],
      ["Status", "Count"],
      ...(summary.byStatus || []).map((r) => [r.status, r.count]),
    ];

    if (filters && Object.keys(filters).length) {
      summaryRows.push([], ["FILTERS"]);
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== "") summaryRows.push([k, String(v)]);
      });
    }

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryRows),
      "Summary"
    );

    const deptRows = [
      ["Department", "Total Requests"],
      ...byDepartment.map((r) => [r.department || r.name, r.total]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(deptRows),
      "By Department"
    );

    const projRows = [
      ["Project", "Total Requests"],
      ...byProject.map((r) => [r.projectName || r.name, r.total]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(projRows),
      "By Project"
    );

    const siteRows = [
      ["Site", "Total Requests"],
      ...bySite.map((r) => [r.siteName || r.name, r.total]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(siteRows),
      "By Site"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `leave_request_summary_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Leave request summary export error:", error);
    return NextResponse.json(
      { error: "Export failed", message: error.message },
      { status: 500 }
    );
  }
}

function escapeCSV(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function generateCSV(summary, byDepartment, byProject, bySite, filters) {
  const rows = [];
  rows.push("Section,Key,Value");
  rows.push(["Summary", "Total Requests", summary.totalRequests || 0].map(escapeCSV).join(","));
  (summary.byType || []).forEach((r) => {
    rows.push(["By Type", r.type, r.count].map(escapeCSV).join(","));
  });
  (summary.byStatus || []).forEach((r) => {
    rows.push(["By Status", r.status, r.count].map(escapeCSV).join(","));
  });
  if (filters && Object.keys(filters).length) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v != null && v !== "") rows.push(["Filter", k, v].map(escapeCSV).join(","));
    });
  }
  rows.push("");
  rows.push("Department,Total Requests");
  byDepartment.forEach((r) => {
    rows.push([r.department || r.name, r.total].map(escapeCSV).join(","));
  });
  rows.push("");
  rows.push("Project,Total Requests");
  byProject.forEach((r) => {
    rows.push([r.projectName || r.name, r.total].map(escapeCSV).join(","));
  });
  rows.push("");
  rows.push("Site,Total Requests");
  bySite.forEach((r) => {
    rows.push([r.siteName || r.name, r.total].map(escapeCSV).join(","));
  });

  const csv = rows.join("\n");
  const fileName = `leave_request_summary_${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "no-cache",
    },
  });
}
