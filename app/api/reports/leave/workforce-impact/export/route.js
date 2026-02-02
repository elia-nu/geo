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
        { error: "Access denied. You don't have permission to export leave reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      summary = {},
      projectsAffected = [],
      coverageGaps = [],
      replacementDemandForecast = [],
      filters = {},
    } = data;

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "leave_workforce_impact",
        userId: user.userId,
        userEmail: user.email,
        metadata: { reportType: "leave_workforce_impact", format, filters },
      });
    } catch (e) {
      console.error("Audit log (non-blocking):", e);
    }

    const escapeCSV = (v) => {
      if (v == null) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n"))
        return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    if (format.toLowerCase() === "csv") {
      const rows = [];
      rows.push("LEAVE IMPACT ON WORKFORCE AVAILABILITY REPORT");
      rows.push("");
      rows.push("Summary,Projects Affected," + (summary.projectsAffectedCount ?? 0));
      rows.push("Summary,Coverage Gaps," + (summary.coverageGapsCount ?? 0));
      rows.push("Summary,Total Replacement Demand," + (summary.totalReplacementDemand ?? 0));
      rows.push("");
      rows.push("Project ID,Project Name,Total Assigned,On Leave Count");
      projectsAffected.forEach((p) => {
        rows.push([p.projectId, p.projectName, p.totalAssigned, p.onLeaveCount].map(escapeCSV).join(","));
      });
      rows.push("");
      rows.push("Coverage Gaps,Project Name,Assigned Count,On Leave Count,Gap");
      coverageGaps.forEach((g) => {
        rows.push([g.projectId, g.projectName, g.assignedCount, g.onLeaveCount, g.gap].map(escapeCSV).join(","));
      });
      rows.push("");
      rows.push("Replacement Forecast,Project Name,Replacement FTE,Suggestion");
      replacementDemandForecast.forEach((r) => {
        rows.push([r.projectId, r.projectName, r.replacementFte, r.suggestedCoverage].map(escapeCSV).join(","));
      });
      const csv = rows.join("\n");
      const fileName = `leave_workforce_impact_${new Date().toISOString().split("T")[0]}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ["LEAVE IMPACT ON WORKFORCE AVAILABILITY REPORT"],
      [],
      ["Generated", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      ["Projects Affected", summary.projectsAffectedCount ?? 0],
      ["Coverage Gaps", summary.coverageGapsCount ?? 0],
      ["Total Replacement Demand", summary.totalReplacementDemand ?? 0],
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(summaryRows),
      "Summary"
    );
    const affectedRows = [
      ["Project ID", "Project Name", "Total Assigned", "On Leave Count"],
      ...projectsAffected.map((p) => [p.projectId, p.projectName, p.totalAssigned, p.onLeaveCount]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(affectedRows),
      "Projects Affected"
    );
    const gapRows = [
      ["Project ID", "Project Name", "Assigned Count", "On Leave Count", "Gap"],
      ...coverageGaps.map((g) => [g.projectId, g.projectName, g.assignedCount, g.onLeaveCount, g.gap]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(gapRows),
      "Coverage Gaps"
    );
    const replRows = [
      ["Project ID", "Project Name", "Replacement FTE", "Suggestion"],
      ...replacementDemandForecast.map((r) => [r.projectId, r.projectName, r.replacementFte, r.suggestedCoverage]),
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(replRows),
      "Replacement Forecast"
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `leave_workforce_impact_${new Date().toISOString().split("T")[0]}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Leave workforce impact export error:", error);
    return NextResponse.json(
      { error: "Export failed", message: error.message },
      { status: 500 }
    );
  }
}
