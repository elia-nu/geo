import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Organizational Structure Report
export async function POST(request) {
  try {
    const data = await request.json();

    // Get current user for role-based access
    const user = await getCurrentUser(request);

    // Check permission to export reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.export", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to export reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel", // excel, csv
      hierarchy = {},
      summary = {},
    } = data;

    // Validate data
    if (!hierarchy || !hierarchy.divisions) {
      return NextResponse.json(
        { error: "No organizational structure data provided for export. Please generate a report first." },
        { status: 400 }
      );
    }

    // Create audit log (don't block export if this fails)
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "organizational_structure",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "organizational_structure",
          format,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    // Generate export based on format
    try {
      switch (format.toLowerCase()) {
        case "excel":
        case "xlsx":
          return generateExcelExport(hierarchy, summary);
        case "csv":
          return generateCSVExport(hierarchy, summary);
        default:
          return NextResponse.json(
            { error: "Unsupported export format. Use: excel or csv" },
            { status: 400 }
          );
      }
    } catch (exportError) {
      console.error("Error in export generation:", exportError);
      return NextResponse.json(
        {
          error: "Failed to generate export file",
          message: exportError.message || "Unknown error occurred",
          details: process.env.NODE_ENV === "development" ? exportError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error exporting organizational structure report:", error);
    return NextResponse.json(
      {
        error: "Failed to export organizational structure report",
        message: error.message || "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate Excel export
function generateExcelExport(hierarchy, summary) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["ORGANIZATIONAL STRUCTURE REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Divisions", summary?.totalDivisions || 0],
      ["Total Departments", summary?.totalDepartments || 0],
      ["Total Units", summary?.totalUnits || 0],
      ["Total Roles", summary?.totalRoles || 0],
      ["Total Employees", summary?.totalEmployees || 0],
      [],
      ["By Division"],
      ["Division", "Departments", "Employees"],
    ];

    if (summary?.byDivision) {
      Object.entries(summary.byDivision).forEach(([div, data]) => {
        summaryData.push([div, data.departments || 0, data.employees || 0]);
      });
    }

    summaryData.push([], ["By Department"], ["Department", "Employees"]);
    if (summary?.byDepartment) {
      Object.entries(summary.byDepartment).forEach(([dept, count]) => {
        summaryData.push([dept, count || 0]);
      });
    }

    summaryData.push([], ["By Role"], ["Role", "Employees"]);
    if (summary?.byRole) {
      Object.entries(summary.byRole).forEach(([role, count]) => {
        summaryData.push([role, count || 0]);
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Hierarchy Sheet - Flattened structure
    const hierarchyHeaders = [
      "Company",
      "Division",
      "Department",
      "Unit",
      "Role",
      "Employee ID",
      "Employee Name",
      "Email",
      "Status",
    ];

    const hierarchyRows = [hierarchyHeaders];

    const companyName = hierarchy.company || "Organization";
    const divisions = hierarchy.divisions || [];

    divisions.forEach((division) => {
      const divisionName = division.name || "Unassigned";
      const departments = division.departments || [];

      departments.forEach((department) => {
        const departmentName = department.name || "Unassigned";
        const units = department.units || [];

        units.forEach((unit) => {
          const unitName = unit.name || "Unassigned";
          const roles = unit.roles || [];

          roles.forEach((role) => {
            const roleName = role.name || "Employee";
            const employees = role.employees || [];

            if (employees.length === 0) {
              // Add row even if no employees
              hierarchyRows.push([
                companyName,
                divisionName,
                departmentName,
                unitName,
                roleName,
                "",
                "",
                "",
                "",
              ]);
            } else {
              employees.forEach((emp) => {
                hierarchyRows.push([
                  companyName,
                  divisionName,
                  departmentName,
                  unitName,
                  roleName,
                  emp.id || "",
                  emp.name || "",
                  emp.email || "",
                  emp.status || "",
                ]);
              });
            }
          });
        });
      });
    });

    const hierarchySheet = XLSX.utils.aoa_to_sheet(hierarchyRows);

    // Set column widths
    hierarchySheet["!cols"] = [
      { wch: 20 }, // Company
      { wch: 25 }, // Division
      { wch: 25 }, // Department
      { wch: 20 }, // Unit
      { wch: 20 }, // Role
      { wch: 15 }, // Employee ID
      { wch: 30 }, // Employee Name
      { wch: 30 }, // Email
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(workbook, hierarchySheet, "Hierarchy");

    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `organizational_structure_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating Excel export:", error);
    throw error;
  }
}

// Generate CSV export
function generateCSVExport(hierarchy, summary) {
  try {
    const headers = [
      "Company",
      "Division",
      "Department",
      "Unit",
      "Role",
      "Employee ID",
      "Employee Name",
      "Email",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    const companyName = hierarchy.company || "Organization";
    const divisions = hierarchy.divisions || [];

    divisions.forEach((division) => {
      const divisionName = division.name || "Unassigned";
      const departments = division.departments || [];

      departments.forEach((department) => {
        const departmentName = department.name || "Unassigned";
        const units = department.units || [];

        units.forEach((unit) => {
          const unitName = unit.name || "Unassigned";
          const roles = unit.roles || [];

          roles.forEach((role) => {
            const roleName = role.name || "Employee";
            const employees = role.employees || [];

            // Escape CSV values properly
            const escapeCSV = (value) => {
              if (value === null || value === undefined) return "";
              const str = String(value);
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            };

            if (employees.length === 0) {
              csvRows.push([
                escapeCSV(companyName),
                escapeCSV(divisionName),
                escapeCSV(departmentName),
                escapeCSV(unitName),
                escapeCSV(roleName),
                "",
                "",
                "",
                "",
              ].join(","));
            } else {
              employees.forEach((emp) => {
                csvRows.push([
                  escapeCSV(companyName),
                  escapeCSV(divisionName),
                  escapeCSV(departmentName),
                  escapeCSV(unitName),
                  escapeCSV(roleName),
                  escapeCSV(emp.id || ""),
                  escapeCSV(emp.name || ""),
                  escapeCSV(emp.email || ""),
                  escapeCSV(emp.status || ""),
                ].join(","));
              });
            }
          });
        });
      });
    });

    const csvContent = csvRows.join("\n");
    const fileName = `organizational_structure_report_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating CSV export:", error);
    throw error;
  }
}
