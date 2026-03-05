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
        { error: "Access denied. You don't have permission to export leave reports." },
        { status: 403 }
      );
    }

    const { format = "excel", rows = [], filters = {} } = data;

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "leave_balance_entitlement",
        userId: user.userId,
        userEmail: user.email,
        metadata: { reportType: "leave_balance_entitlement", format, filters },
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
      const header = [
        "Employee ID",
        "Employee Name",
        "Department",
        "Designation",
        "Overused",
        "Underutilized",
        "Annual Available",
        "Annual Used",
        "Sick Available",
        "Sick Used",
      ].join(",");
      const csvRows = [header];
      rows.forEach((r) => {
        const b = r.balances || {};
        const ann = b.annual || {};
        const sick = b.sick || {};
        csvRows.push(
          [
            escapeCSV(r.employeeId),
            escapeCSV(r.employeeName),
            escapeCSV(r.department),
            escapeCSV(r.designation),
            r.overused ? "Yes" : "No",
            r.underutilized ? "Yes" : "No",
            escapeCSV(ann.available),
            escapeCSV(ann.used),
            escapeCSV(sick.available),
            escapeCSV(sick.used),
          ].join(",")
        );
      });
      const csv = csvRows.join("\n");
      const fileName = `leave_balance_entitlement_${new Date().toISOString().split("T")[0]}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
          "Cache-Control": "no-cache",
        },
      });
    }

    const workbook = XLSX.utils.book_new();
    const sheetRows = [
      ["LEAVE BALANCE & ENTITLEMENT REPORT"],
      [],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Employee ID", "Employee Name", "Department", "Overused", "Underutilized", "Annual Avail", "Annual Used", "Sick Avail", "Sick Used"],
    ];
    rows.forEach((r) => {
      const b = r.balances || {};
      const ann = b.annual || {};
      const sick = b.sick || {};
      sheetRows.push([
        r.employeeId,
        r.employeeName,
        r.department,
        r.overused ? "Yes" : "No",
        r.underutilized ? "Yes" : "No",
        ann.available ?? "",
        ann.used ?? "",
        sick.available ?? "",
        sick.used ?? "",
      ]);
    });
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(sheetRows),
      "Leave Balances"
    );
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `leave_balance_entitlement_${new Date().toISOString().split("T")[0]}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Leave balance export error:", error);
    return NextResponse.json(
      { error: "Export failed", message: error.message },
      { status: 500 }
    );
  }
}
