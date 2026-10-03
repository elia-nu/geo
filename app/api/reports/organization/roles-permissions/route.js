import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Role & Permission Audit Report API
export async function GET(request) {
  try {
    const db = await getDb();

    // Get current user for role-based access
    const user = await getCurrentUser(request);
    
    // Check permission to view role audit reports (reports.organization or role.manage or role.read)
    const hasPermission =
      (await checkPermission(user.userId, "reports.organization", user.role)) ||
      (await checkPermission(user.userId, "role.manage", user.role)) ||
      (await checkPermission(user.userId, "role.read", user.role));
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view role audit reports." },
        { status: 403 }
      );
    }

    // Get all active user roles
    const userRoles = await db
      .collection("user_roles")
      .find({ isActive: true })
      .toArray();

    // Get all employees to match with user roles
    const employees = await db
      .collection("employees")
      .aggregate([
        {
          $project: {
            _id: 1,
            employeeId: { $toString: "$_id" },
            employeeName: {
              $ifNull: [
                "$personalDetails.name",
                {
                  $concat: [
                    { $ifNull: ["$personalDetails.firstName", ""] },
                    " ",
                    { $ifNull: ["$personalDetails.lastName", ""] },
                  ],
                },
                "$name",
              ],
            },
            email: {
              $ifNull: ["$personalDetails.email", "$email", ""],
            },
            department: {
              $ifNull: [
                "$personalDetails.department",
                "$department",
                "Not Assigned",
              ],
            },
            status: {
              $ifNull: ["$status", "active"],
            },
          },
        },
      ])
      .toArray();

    // Create employee map for quick lookup
    const employeeMap = new Map();
    employees.forEach((emp) => {
      employeeMap.set(emp.employeeId, emp);
    });

    // Derive standard permissions from current UI navigation (admin & employee sidebars)
    const adminUiPermissions = [
      // Top-level admin navigation
      "dashboard",
      "organization",
      "departments",
      "designations",
      "employees",
      "employee-location",
      "contracts",
      "documents",
      "work-locations",
      "attendance",
      "admin-attendance",
      "attendance-all",
      "attendance-reports",
      "payroll",
      "leave-management",
      "leave-approval",
      "leave-balances",
      "project",
      "projects",
      "project-categories",
      "budget-management",
      "calendar",
      "analytics",
      // Analytics & Reports submenu
      "employee-management-reports",
      "organization-management-reports",
      "document-inventory-report",
      "document-expiry-compliance-report",
      "document-access-audit-report",
      "site-location-master-report",
      "site-attendance-compliance-report",
      "workforce-distribution-report",
      "leave-reports",
      "payroll-reports",
      "project-reports",
      "executive-reports",
      "completed-activities",
      "workflow-bottlenecks",
      "user-activity-security",
      "employee-stats",
      "department-stats",
      "document-stats",
    ];

    const employeeUiPermissions = [
      "dashboard",
      "attendance", // Daily Attendance
      "attendance-history",
      "leave-requests",
      "leave-balance",
      "projects",
      "tasks",
      "milestones",
      "documents",
      "requests-status",
      "profile",
    ];

    // Dynamic role definitions from DB (with fallback to defaults)
    const dbRoles = await db.collection("roles").find({ isActive: true }).toArray();
    const dynamicRoles = {};
    if (dbRoles && dbRoles.length > 0) {
      for (const r of dbRoles) {
        dynamicRoles[r.name] = {
          name: r.displayName || r.name,
          permissions: r.permissions || [],
          level: r.level || 10,
        };
      }
    } else {
      dynamicRoles.ADMIN = { name: "Administrator", permissions: adminUiPermissions, level: 100 };
      dynamicRoles.HR_MANAGER = { name: "HR Manager", permissions: ["employee.create", "employee.read", "employee.update", "document.create", "document.read", "reports.read"], level: 80 };
      dynamicRoles.HR_STAFF = { name: "HR Staff", permissions: ["employee.read", "employee.update", "document.read"], level: 60 };
      dynamicRoles.EMPLOYEE = { name: "Employee", permissions: employeeUiPermissions, level: 10 };
    }

    // Analyze roles and permissions (one aggregated entry per role)
    const allPermissions = new Set();
    const roleMap = new Map(); // roleName -> aggregated role info

    // Pre-populate roleMap with all DB-defined roles
    for (const [name, def] of Object.entries(dynamicRoles)) {
      roleMap.set(name, {
        role: name,
        roleDisplayName: def.name,
        standardPermissions: def.permissions,
        userIds: new Set(),
        assignedUsers: [],
        actualPermissionsSet: new Set(def.permissions),
      });
      def.permissions.forEach((p) => allPermissions.add(p));
    }

    userRoles.forEach((userRole) => {
      const roleName = userRole.roleName || userRole.role || "UNKNOWN";
      const dynamicRole = dynamicRoles[roleName];
      const standardPermissions = dynamicRole?.permissions || [];

      // Ensure role entry
      if (!roleMap.has(roleName)) {
        roleMap.set(roleName, {
          role: roleName,
          roleDisplayName: dynamicRole?.name || roleName,
          standardPermissions,
          userIds: new Set(),
          assignedUsers: [],
          actualPermissionsSet: new Set(),
        });
      }

      const roleEntry = roleMap.get(roleName);

      // Track permissions from this userRole
      const actualPermissions = userRole.permissions || [];
      actualPermissions.forEach((perm) => {
        roleEntry.actualPermissionsSet.add(perm);
        allPermissions.add(perm);
      });

      // Link to employee if exists
      const emp = employeeMap.get(userRole.userId);
      if (emp && userRole.userId && !roleEntry.userIds.has(userRole.userId)) {
        roleEntry.userIds.add(userRole.userId);
        roleEntry.assignedUsers.push({
          userId: userRole.userId,
          email: userRole.email || emp.email || "",
          name: emp.employeeName || "Unknown",
          department: emp.department || "Not Assigned",
          assignedAt: userRole.assignedAt || null,
          assignedBy: userRole.assignedBy || "Unknown",
        });
      }
    });

    // Finalize per-role analysis
    const uniqueRoleAnalysis = Array.from(roleMap.values()).map((entry) => {
      const standardPermissions = entry.standardPermissions || [];

      // For UI-driven roles (ADMIN, EMPLOYEE), treat actual permissions
      // as exactly equal to the standard UI permissions and do NOT compute
      // excessive/missing (since DB permissions are incomplete/noisy).
      if (entry.role === "ADMIN" || entry.role === "EMPLOYEE") {
        const actualPermissions = standardPermissions;
        const excessivePermissions = [];
        const missingPermissions = [];

        return {
          role: entry.role,
          roleDisplayName: entry.roleDisplayName,
          totalUsers: entry.userIds.size,
          assignedUsers: entry.assignedUsers,
          standardPermissions,
          actualPermissions,
          excessivePermissions,
          missingPermissions,
          hasExcessivePermissions: false,
          hasMissingPermissions: false,
        };
      }

      // For other roles, still compare DB-defined permissions to standard
      if (entry.actualPermissionsSet.size === 0 && standardPermissions.length) {
        entry.actualPermissionsSet = new Set(standardPermissions);
      }

      const actualPermissions = Array.from(entry.actualPermissionsSet);
      const excessivePermissions = standardPermissions.length
        ? actualPermissions.filter((p) => !standardPermissions.includes(p))
        : [];
      const missingPermissions = standardPermissions.length
        ? standardPermissions.filter((p) => !entry.actualPermissionsSet.has(p))
        : [];

      return {
        role: entry.role,
        roleDisplayName: entry.roleDisplayName,
        totalUsers: entry.userIds.size,
        assignedUsers: entry.assignedUsers,
        standardPermissions,
        actualPermissions,
        excessivePermissions,
        missingPermissions,
        hasExcessivePermissions: excessivePermissions.length > 0,
        hasMissingPermissions: missingPermissions.length > 0,
      };
    });

    // Summary statistics (based on unique users and roles that reference real employees)
    const uniqueUserIds = new Set(
      userRoles
        .map((ur) => ur.userId)
        .filter((id) => !!id && employeeMap.has(id))
    );

    const summary = {
      totalRoles: uniqueRoleAnalysis.length,
      totalUsers: uniqueUserIds.size,
      totalPermissions: allPermissions.size,
      rolesWithExcessivePermissions: uniqueRoleAnalysis.filter(
        (r) => r.hasExcessivePermissions
      ).length,
      rolesWithMissingPermissions: uniqueRoleAnalysis.filter(
        (r) => r.hasMissingPermissions
      ).length,
      usersWithMultipleRoles: new Set(
        userRoles
          .filter((ur, index, self) =>
            self.findIndex((u) => u.userId === ur.userId) !== index
          )
          .map((ur) => ur.userId)
      ).size,
      byRole: {},
    };

    uniqueRoleAnalysis.forEach((role) => {
      summary.byRole[role.role] = {
        users: role.totalUsers,
        permissions: role.actualPermissions.length,
        excessivePermissions: role.excessivePermissions.length,
        missingPermissions: role.missingPermissions.length,
      };
    });

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "roles_permissions_audit",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "roles_permissions_audit",
        totalRoles: summary.totalRoles,
        totalUsers: summary.totalUsers,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "role_audit",
      generatedAt: new Date().toISOString(),
      summary,
      roles: uniqueRoleAnalysis,
      standardRoles: dynamicRoles,
      totalRecords: uniqueRoleAnalysis.length,
    });
  } catch (error) {
    console.error("Error generating roles & permissions audit report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate roles & permissions audit report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
