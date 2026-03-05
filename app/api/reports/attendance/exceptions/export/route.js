import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export 5.2 Attendance Exception & Violation Report
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
      summary = {},
      lateArrivals = [],
      earlyDepartures = [],
      outsideGeofenceAttempts = [],
      missedCheckIns = [],
      filters = {},
    } = data;

    const totalRecords =
      lateArrivals.length +
      earlyDepartures.length +
      outsideGeofenceAttempts.length +
      missedCheckIns.length;

    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "attendance_exceptions",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "attendance_exceptions",
          format,
          recordCount: totalRecords,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(
          summary,
          lateArrivals,
          earlyDepartures,
          outsideGeofenceAttempts,
          missedCheckIns,
          filters
        );
      case "csv":
        return generateCSVExport(
          summary,
          lateArrivals,
          earlyDepartures,
          outsideGeofenceAttempts,
          missedCheckIns,
          filters
        );
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel or csv" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(
      "Error exporting attendance exception & violation report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to export attendance exception report",
        message: error.message || "Unknown error occurred",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(
  summary,
  lateArrivals,
  earlyDepartures,
  outsideGeofenceAttempts,
  missedCheckIns,
  filters
) {
  try {
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      ["ATTENDANCE EXCEPTION & VIOLATION REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Employees Considered", summary.totalEmployees || 0],
      ["Late Arrivals", summary.lateArrivals || lateArrivals.length || 0],
      [
        "Early Departures",
        summary.earlyDepartures || earlyDepartures.length || 0,
      ],
      [
        "Outside-geofence Attempts",
        summary.outsideGeofence || outsideGeofenceAttempts.length || 0,
      ],
      ["Missed Check-ins", summary.missedCheckIns || missedCheckIns.length || 0],
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

    const commonHeaders = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Shift",
      "Date",
    ];

    // Late arrivals sheet
    const lateRows = [
      [
        ...commonHeaders,
        "Check-in Time",
        "Projects",
      ],
    ];
    lateArrivals.forEach((r) => {
      lateRows.push([
        r.employeeId || "",
        r.employeeName || "",
        r.department || "",
        r.shift || "",
        r.date || "",
        r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "",
        (r.projectAssignments || [])
          .map((p) => p.name || p.id || "")
          .join(", "),
      ]);
    });
    const lateSheet = XLSX.utils.aoa_to_sheet(lateRows);
    XLSX.utils.book_append_sheet(workbook, lateSheet, "Late Arrivals");

    // Early departures sheet
    const earlyRows = [
      [
        ...commonHeaders,
        "Check-out Time",
        "Projects",
      ],
    ];
    earlyDepartures.forEach((r) => {
      earlyRows.push([
        r.employeeId || "",
        r.employeeName || "",
        r.department || "",
        r.shift || "",
        r.date || "",
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "",
        (r.projectAssignments || [])
          .map((p) => p.name || p.id || "")
          .join(", "),
      ]);
    });
    const earlySheet = XLSX.utils.aoa_to_sheet(earlyRows);
    XLSX.utils.book_append_sheet(workbook, earlySheet, "Early Departures");

    // Outside-geofence sheet
    const outsideRows = [
      [
        ...commonHeaders,
        "Action",
        "Distance (m)",
        "Work Location Name",
        "Nearest Location",
        "Message",
      ],
    ];
    outsideGeofenceAttempts.forEach((r) => {
      outsideRows.push([
        r.employeeId || "",
        r.employeeName || "",
        r.department || "",
        r.shift || "",
        r.date || "",
        r.action || "",
        r.distance ?? "",
        r.workLocationName || "",
        r.nearestLocation?.name || "",
        r.message || "",
      ]);
    });
    const outsideSheet = XLSX.utils.aoa_to_sheet(outsideRows);
    XLSX.utils.book_append_sheet(workbook, outsideSheet, "Outside Geofence");

    // Missed check-ins sheet
    const missedRows = [
      [
        "Employee ID",
        "Employee Name",
        "Department",
        "Date",
      ],
    ];
    missedCheckIns.forEach((r) => {
      missedRows.push([
        r.employeeId || "",
        r.employeeName || "",
        r.department || "",
        r.date || "",
      ]);
    });
    const missedSheet = XLSX.utils.aoa_to_sheet(missedRows);
    XLSX.utils.book_append_sheet(workbook, missedSheet, "Missed Check-ins");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const fileName = `attendance_exceptions_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

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
      "Error generating Excel export (attendance exceptions):",
      error
    );
    throw error;
  }
}

function generateCSVExport(
  summary,
  lateArrivals,
  earlyDepartures,
  outsideGeofenceAttempts,
  missedCheckIns,
  filters
) {
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
    rows.push("Section,Metric,Value");
    rows.push(
      [
        "Summary",
        "Employees Considered",
        escapeCSV(summary.totalEmployees || 0),
      ].join(",")
    );
    rows.push(
      [
        "Summary",
        "Late Arrivals",
        escapeCSV(summary.lateArrivals || lateArrivals.length || 0),
      ].join(",")
    );
    rows.push(
      [
        "Summary",
        "Early Departures",
        escapeCSV(summary.earlyDepartures || earlyDepartures.length || 0),
      ].join(",")
    );
    rows.push(
      [
        "Summary",
        "Outside-geofence Attempts",
        escapeCSV(
          summary.outsideGeofence || outsideGeofenceAttempts.length || 0
        ),
      ].join(",")
    );
    rows.push(
      [
        "Summary",
        "Missed Check-ins",
        escapeCSV(summary.missedCheckIns || missedCheckIns.length || 0),
      ].join(",")
    );

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

    const headerLate = [
      "Section",
      "Employee ID",
      "Employee Name",
      "Department",
      "Shift",
      "Date",
      "Check-in Time",
      "Projects",
    ].join(",");
    rows.push("");
    rows.push(headerLate);
    lateArrivals.forEach((r) => {
      rows.push(
        [
          "Late Arrivals",
          escapeCSV(r.employeeId || ""),
          escapeCSV(r.employeeName || ""),
          escapeCSV(r.department || ""),
          escapeCSV(r.shift || ""),
          escapeCSV(r.date || ""),
          escapeCSV(
            r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : ""
          ),
          escapeCSV(
            (r.projectAssignments || [])
              .map((p) => p.name || p.id || "")
              .join(", ")
          ),
        ].join(",")
      );
    });

    const headerEarly = [
      "Section",
      "Employee ID",
      "Employee Name",
      "Department",
      "Shift",
      "Date",
      "Check-out Time",
      "Projects",
    ].join(",");
    rows.push("");
    rows.push(headerEarly);
    earlyDepartures.forEach((r) => {
      rows.push(
        [
          "Early Departures",
          escapeCSV(r.employeeId || ""),
          escapeCSV(r.employeeName || ""),
          escapeCSV(r.department || ""),
          escapeCSV(r.shift || ""),
          escapeCSV(r.date || ""),
          escapeCSV(
            r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : ""
          ),
          escapeCSV(
            (r.projectAssignments || [])
              .map((p) => p.name || p.id || "")
              .join(", ")
          ),
        ].join(",")
      );
    });

    const headerOutside = [
      "Section",
      "Employee ID",
      "Employee Name",
      "Department",
      "Shift",
      "Date",
      "Action",
      "Distance (m)",
      "Work Location Name",
      "Nearest Location",
      "Message",
    ].join(",");
    rows.push("");
    rows.push(headerOutside);
    outsideGeofenceAttempts.forEach((r) => {
      rows.push(
        [
          "Outside Geofence",
          escapeCSV(r.employeeId || ""),
          escapeCSV(r.employeeName || ""),
          escapeCSV(r.department || ""),
          escapeCSV(r.shift || ""),
          escapeCSV(r.date || ""),
          escapeCSV(r.action || ""),
          escapeCSV(r.distance ?? ""),
          escapeCSV(r.workLocationName || ""),
          escapeCSV(r.nearestLocation?.name || ""),
          escapeCSV(r.message || ""),
        ].join(",")
      );
    });

    const headerMissed = [
      "Section",
      "Employee ID",
      "Employee Name",
      "Department",
      "Date",
    ].join(",");
    rows.push("");
    rows.push(headerMissed);
    missedCheckIns.forEach((r) => {
      rows.push(
        [
          "Missed Check-ins",
          escapeCSV(r.employeeId || ""),
          escapeCSV(r.employeeName || ""),
          escapeCSV(r.department || ""),
          escapeCSV(r.date || ""),
        ].join(",")
      );
    });

    const csvContent = rows.join("\n");
    const fileName = `attendance_exceptions_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

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
      "Error generating CSV export (attendance exceptions):",
      error
    );
    throw error;
  }
}

