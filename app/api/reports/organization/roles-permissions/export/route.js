import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Role & Permission Audit Report
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
      roles = [],
      summary = {},
      permissionConflicts = [],
    } = data;

    // Validate data
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: "No role data provided for export. Please generate a report first." },
        { status: 400 }
      );
    }

    // Create audit log (don't block export if this fails)
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "roles_permissions_audit",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "roles_permissions_audit",
          format,
          recordCount: roles.length,
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
          return generateExcelExport(roles, summary, permissionConflicts);
        case "csv":
          return generateCSVExport(roles, summary, permissionConflicts);
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
    console.error("Error exporting roles & permissions audit report:", error);
    return NextResponse.json(
      {
        error: "Failed to export roles & permissions audit report",
        message: error.message || "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate Excel export
function generateExcelExport(roles, summary, permissionConflicts) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["ROLE & PERMISSION AUDIT REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Roles", summary?.totalRoles || 0],
      ["Total Users", summary?.totalUsers || 0],
      ["Total Permissions", summary?.totalPermissions || 0],
      ["Roles with Excessive Permissions", summary?.rolesWithExcessivePermissions || 0],
      ["Roles with Missing Permissions", summary?.rolesWithMissingPermissions || 0],
      ["Users with Multiple Roles", summary?.usersWithMultipleRoles || 0],
      ["Permission Conflicts", summary?.permissionConflicts || 0],
      [],
      ["By Role"],
      ["Role", "Users", "Permissions", "Excessive", "Missing"],
    ];

    if (summary?.byRole) {
      Object.entries(summary.byRole).forEach(([role, data]) => {
        summaryData.push([
          role,
          data.users || 0,
          data.permissions || 0,
          data.excessivePermissions || 0,
          data.missingPermissions || 0,
        ]);
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Roles & Permissions Sheet
    const rolesHeaders = [
      "Role",
      "Role Display Name",
      "Total Users",
      "Standard Permissions",
      "Actual Permissions",
      "Excessive Permissions",
      "Missing Permissions",
      "Has Conflicts",
    ];

    const rolesRows = [rolesHeaders];

    roles.forEach((role) => {
      rolesRows.push([
        role.role || "",
        role.roleDisplayName || "",
        role.totalUsers || 0,
        (role.standardPermissions || []).join("; "),
        (role.actualPermissions || []).join("; "),
        (role.excessivePermissions || []).join("; "),
        (role.missingPermissions || []).join("; "),
        role.hasConflicts ? "Yes" : "No",
      ]);
    });

    const rolesSheet = XLSX.utils.aoa_to_sheet(rolesRows);

    // Set column widths
    rolesSheet["!cols"] = [
      { wch: 15 }, // Role
      { wch: 25 }, // Role Display Name
      { wch: 12 }, // Total Users
      { wch: 50 }, // Standard Permissions
      { wch: 50 }, // Actual Permissions
      { wch: 50 }, // Excessive Permissions
      { wch: 50 }, // Missing Permissions
      { wch: 15 }, // Has Conflicts
    ];

    XLSX.utils.book_append_sheet(workbook, rolesSheet, "Roles & Permissions");

    // Assigned Users Sheet
    const usersHeaders = [
      "Role",
      "User ID",
      "Email",
      "Name",
      "Department",
      "Assigned At",
      "Assigned By",
      "Has Multiple Roles",
      "Conflicting Roles",
    ];

    const usersRows = [usersHeaders];

    roles.forEach((role) => {
      const assignedUsers = role.assignedUsers || [];
      assignedUsers.forEach((user) => {
        const conflicts = role.hasConflicts
          ? (role.conflicts || [])
              .map((c) => c.role)
              .join(", ")
          : "";
        
        usersRows.push([
          role.role || "",
          user.userId || "",
          user.email || "",
          user.name || "",
          user.department || "",
          user.assignedAt
            ? new Date(user.assignedAt).toLocaleDateString()
            : "",
          user.assignedBy || "",
          role.hasConflicts ? "Yes" : "No",
          conflicts,
        ]);
      });
    });

    const usersSheet = XLSX.utils.aoa_to_sheet(usersRows);

    // Set column widths
    usersSheet["!cols"] = [
      { wch: 15 }, // Role
      { wch: 15 }, // User ID
      { wch: 30 }, // Email
      { wch: 30 }, // Name
      { wch: 20 }, // Department
      { wch: 15 }, // Assigned At
      { wch: 20 }, // Assigned By
      { wch: 18 }, // Has Multiple Roles
      { wch: 30 }, // Conflicting Roles
    ];

    XLSX.utils.book_append_sheet(workbook, usersSheet, "Assigned Users");

    // Permission Conflicts Sheet
    if (permissionConflicts && permissionConflicts.length > 0) {
      const conflictsHeaders = [
        "Permission",
        "Assigned To Roles",
        "Conflict Level",
      ];

      const conflictsRows = [conflictsHeaders];

      permissionConflicts.forEach((conflict) => {
        conflictsRows.push([
          conflict.permission || "",
          (conflict.assignedToRoles || []).join(", "),
          conflict.conflictLevel || "low",
        ]);
      });

      const conflictsSheet = XLSX.utils.aoa_to_sheet(conflictsRows);

      // Set column widths
      conflictsSheet["!cols"] = [
        { wch: 40 }, // Permission
        { wch: 40 }, // Assigned To Roles
        { wch: 15 }, // Conflict Level
      ];

      XLSX.utils.book_append_sheet(workbook, conflictsSheet, "Permission Conflicts");
    }

    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `roles_permissions_audit_report_${new Date()
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
function generateCSVExport(roles, summary, permissionConflicts) {
  try {
    // Main roles export
    const headers = [
      "Role",
      "Role Display Name",
      "Total Users",
      "Standard Permissions",
      "Actual Permissions",
      "Excessive Permissions",
      "Missing Permissions",
      "Has Conflicts",
    ];

    const csvRows = [headers.join(",")];

    // Escape CSV values properly
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    roles.forEach((role) => {
      csvRows.push([
        escapeCSV(role.role || ""),
        escapeCSV(role.roleDisplayName || ""),
        escapeCSV(role.totalUsers || 0),
        escapeCSV((role.standardPermissions || []).join("; ")),
        escapeCSV((role.actualPermissions || []).join("; ")),
        escapeCSV((role.excessivePermissions || []).join("; ")),
        escapeCSV((role.missingPermissions || []).join("; ")),
        escapeCSV(role.hasConflicts ? "Yes" : "No"),
      ].join(","));
    });

    const csvContent = csvRows.join("\n");
    const fileName = `roles_permissions_audit_report_${new Date()
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
