import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

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
      byPerson = [],
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
        byPerson,
        bySite,
        filters
      );
    }

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryRows = [
      ["LEAVE REQUEST SUMMARY REPORT"],
      [],
      ["Generated", new Date().toLocaleString()],
      [],
      ["OVERALL METRICS"],
      ["Total Requests", summary.totalRequests || 0],
      ["Total Requested Days", summary.totalDays || 0],
      ["Total Approved Days", summary.totalApprovedDays || 0],
      ["Total Persons on Leave", summary.totalPersons || byPerson.length || 0],
      ["Total Projects Involved", summary.totalProjects || byProject.length || 0],
      [],
      ["BY LEAVE TYPE"],
      ["Type", "Count"],
      ...(summary.byType || []).map((r) => [r.type, r.count]),
      [],
      ["BY REQUEST STATUS"],
      ["Status", "Count"],
      ...(summary.byStatus || []).map((r) => [r.status, r.count]),
    ];

    if (filters && Object.keys(filters).length) {
      summaryRows.push([], ["ACTIVE FILTERS"]);
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== "") summaryRows.push([k, String(v)]);
      });
    }

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryRows),
      "Overview Summary"
    );

    // By Project Sheet
    const projRows = [
      [
        "Project Name",
        "Total Requests",
        "Approved Requests",
        "Pending Requests",
        "Rejected Requests",
        "Total Leave Days",
        "Approved Days",
        "Employees on Leave",
      ],
      ...byProject.map((r) => [
        r.projectName || r.name || "Unassigned",
        r.total || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
        r.totalDays || 0,
        r.approvedDays || 0,
        r.uniqueEmployeesCount || (r.employeeIds ? r.employeeIds.length : 0),
      ]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(projRows),
      "By Project"
    );

    // By Person Sheet
    const personRows = [
      [
        "Employee Code",
        "Employee Name",
        "Department",
        "Designation",
        "Assigned Project(s)",
        "Total Requests",
        "Approved Requests",
        "Pending Requests",
        "Rejected Requests",
        "Total Days Requested",
        "Approved Days",
      ],
      ...byPerson.map((r) => [
        r.employeeCode || "—",
        r.employeeName || "—",
        r.department || "—",
        r.designation || "—",
        r.projectNames || "None",
        r.total || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
        r.totalDays || 0,
        r.approvedDays || 0,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(personRows),
      "By Person"
    );

    // By Department Sheet
    const deptRows = [
      ["Department", "Total Requests", "Total Days", "Approved", "Pending", "Rejected"],
      ...byDepartment.map((r) => [
        r.department || r.name,
        r.total || 0,
        r.days || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(deptRows),
      "By Department"
    );

    // By Site Sheet
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

function generateCSV(summary, byDepartment, byProject, byPerson, bySite, filters) {
  const rows = [];
  rows.push("LEAVE REQUEST SUMMARY REPORT");
  rows.push("");
  rows.push("Section,Metric,Value");
  rows.push(["Summary", "Total Requests", summary.totalRequests || 0].map(escapeCSV).join(","));
  rows.push(["Summary", "Total Days Requested", summary.totalDays || 0].map(escapeCSV).join(","));
  rows.push(["Summary", "Total Approved Days", summary.totalApprovedDays || 0].map(escapeCSV).join(","));
  rows.push(["Summary", "Total Persons", byPerson.length || 0].map(escapeCSV).join(","));
  rows.push(["Summary", "Total Projects", byProject.length || 0].map(escapeCSV).join(","));
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
  rows.push("=== LEAVE SUMMARY BY PROJECT ===");
  rows.push(
    "Project Name,Total Requests,Approved Requests,Pending Requests,Rejected Requests,Total Days,Approved Days,Employees on Leave"
  );
  byProject.forEach((r) => {
    rows.push(
      [
        r.projectName || r.name || "Unassigned",
        r.total || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
        r.totalDays || 0,
        r.approvedDays || 0,
        r.uniqueEmployeesCount || 0,
      ]
        .map(escapeCSV)
        .join(",")
    );
  });

  rows.push("");
  rows.push("=== LEAVE SUMMARY PER PERSON ===");
  rows.push(
    "Employee Code,Employee Name,Department,Designation,Project(s),Total Requests,Approved,Pending,Rejected,Total Days,Approved Days"
  );
  byPerson.forEach((r) => {
    rows.push(
      [
        r.employeeCode || "—",
        r.employeeName || "—",
        r.department || "—",
        r.designation || "—",
        r.projectNames || "None",
        r.total || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
        r.totalDays || 0,
        r.approvedDays || 0,
      ]
        .map(escapeCSV)
        .join(",")
    );
  });

  rows.push("");
  rows.push("=== LEAVE SUMMARY BY DEPARTMENT ===");
  rows.push("Department,Total Requests,Total Days,Approved,Pending,Rejected");
  byDepartment.forEach((r) => {
    rows.push(
      [
        r.department || r.name,
        r.total || 0,
        r.days || 0,
        r.approved || 0,
        r.pending || 0,
        r.rejected || 0,
      ]
        .map(escapeCSV)
        .join(",")
    );
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
