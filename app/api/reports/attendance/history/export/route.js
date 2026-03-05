import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";

// Export 5.3 Employee Attendance History Report
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
            "Access denied. You don't have permission to export attendance reports.",
        },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      employee = {},
      records = [],
      filters = {},
    } = data;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        {
          error:
            "No attendance history data provided for export. Please generate a report first.",
        },
        { status: 400 }
      );
    }

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "employee_attendance_history",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "employee_attendance_history",
          format,
          recordCount: records.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(employee, records, filters);
      case "csv":
        return generateCSVExport(employee, records, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      "Error exporting employee attendance history report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to export employee attendance history report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(employee, records, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["EMPLOYEE ATTENDANCE HISTORY REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["EMPLOYEE"],
      [],
      ["Employee ID", employee.id || ""],
      ["Employee Name", employee.name || ""],
      ["Department", employee.department || ""],
      ["Designation", employee.designation || ""],
      [],
      ["Total Records", records.length],
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
      "Date",
      "Status",
      "Check-in Time",
      "Check-out Time",
      "Working Hours",
      "Check-in Latitude",
      "Check-in Longitude",
      "Check-out Latitude",
      "Check-out Longitude",
      "Nearest Work Location",
      "Geofence Valid",
      "Geofence Distance (m)",
      "GPS Valid",
      "GPS Risk Score",
    ];

    const rows = [headers];
    records.forEach((r) => {
      rows.push([
        r.date || "",
        r.status || "",
        r.checkInTime ? new Date(r.checkInTime).toLocaleString() : "",
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : "",
        r.workingHours ?? "",
        r.checkInLocation?.latitude ?? "",
        r.checkInLocation?.longitude ?? "",
        r.checkOutLocation?.latitude ?? "",
        r.checkOutLocation?.longitude ?? "",
        r.nearestWorkLocationName || "",
        r.geofenceValidation?.isValid ?? "",
        r.geofenceValidation?.distance ?? "",
        r.gpsValidation?.isValid ?? "",
        r.gpsValidation?.riskScore ?? "",
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, "History");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `employee_attendance_history_${(employee.id || "")
      .toString()
      .slice(-6)}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(
      "Error generating Excel export (employee attendance history):",
      error
    );
    throw error;
  }
}

function generateCSVExport(employee, records, filters) {
  try {
    const escapeCSV = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = [];
    rows.push("Section,Field,Value");
    rows.push(
      ["Employee", "Employee ID", escapeCSV(employee.id || "")].join(",")
    );
    rows.push(
      ["Employee", "Employee Name", escapeCSV(employee.name || "")].join(",")
    );
    rows.push(
      ["Employee", "Department", escapeCSV(employee.department || "")].join(",")
    );
    rows.push(
      ["Employee", "Designation", escapeCSV(employee.designation || "")].join(
        ","
      )
    );
    rows.push(["Employee", "Total Records", escapeCSV(records.length)].join(","));

    if (filters && Object.keys(filters).length > 0) {
      rows.push("");
      rows.push("Filters,Key,Value");
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          rows.push(
            ["Filters", escapeCSV(k), escapeCSV(String(v))].join(",")
          );
        }
      });
    }

    rows.push("");
    const header = [
      "Date",
      "Status",
      "Check-in Time",
      "Check-out Time",
      "Working Hours",
      "Check-in Latitude",
      "Check-in Longitude",
      "Check-out Latitude",
      "Check-out Longitude",
      "Nearest Work Location",
      "Geofence Valid",
      "Geofence Distance (m)",
      "GPS Valid",
      "GPS Risk Score",
    ];
    rows.push(header.join(","));

    records.forEach((r) => {
      rows.push(
        [
          escapeCSV(r.date || ""),
          escapeCSV(r.status || ""),
          escapeCSV(
            r.checkInTime ? new Date(r.checkInTime).toLocaleString() : ""
          ),
          escapeCSV(
            r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : ""
          ),
          escapeCSV(r.workingHours ?? ""),
          escapeCSV(r.checkInLocation?.latitude ?? ""),
          escapeCSV(r.checkInLocation?.longitude ?? ""),
          escapeCSV(r.checkOutLocation?.latitude ?? ""),
          escapeCSV(r.checkOutLocation?.longitude ?? ""),
          escapeCSV(r.nearestWorkLocationName || ""),
          escapeCSV(r.geofenceValidation?.isValid ?? ""),
          escapeCSV(r.geofenceValidation?.distance ?? ""),
          escapeCSV(r.gpsValidation?.isValid ?? ""),
          escapeCSV(r.gpsValidation?.riskScore ?? ""),
        ].join(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `employee_attendance_history_${(employee.id || "")
      .toString()
      .slice(-6)}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error(
      "Error generating CSV export (employee attendance history):",
      error
    );
    throw error;
  }
}

