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
    
    // Check permission to view reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view reports." },
        { status: 403 }
      );
    }

    // Get all user roles
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

    // Standard role definitions (from auth/roles/route.js)
    const standardRoles = {
      ADMIN: {
        name: "Administrator",
        permissions: [
          "employee.create",
          "employee.read",
          "employee.update",
          "employee.delete",
          "document.create",
          "document.read",
          "document.update",
          "document.delete",
          "reports.read",
          "reports.export",
          "audit.read",
          "settings.manage",
          "user.create",
          "user.update",
          "user.delete",
          "notifications.manage",
        ],
      },
      HR_MANAGER: {
        name: "HR Manager",
        permissions: [
          "employee.create",
          "employee.read",
          "employee.update",
          "document.create",
          "document.read",
          "document.update",
          "document.delete",
          "reports.read",
          "reports.export",
          "audit.read",
          "notifications.manage",
        ],
      },
      HR_STAFF: {
        name: "HR Staff",
        permissions: [
          "employee.read",
          "employee.update",
          "document.create",
          "document.read",
          "document.update",
          "reports.read",
        ],
      },
      EMPLOYEE: {
        name: "Employee",
        permissions: [
          "employee.read.own",
          "employee.update.own",
          "document.read.own",
          "document.create.own",
        ],
      },
    };

    // Analyze roles and permissions
    const roleAnalysis = [];
    const allPermissions = new Set();
    const permissionToRoles = new Map();

    // Process each user role
    userRoles.forEach((userRole) => {
      const employee = employeeMap.get(userRole.userId);
      const roleName = userRole.role || "UNKNOWN";
      const standardRole = standardRoles[roleName];

      // Get assigned users for this role
      const assignedUsers = userRoles
        .filter((ur) => ur.role === roleName)
        .map((ur) => {
          const emp = employeeMap.get(ur.userId);
          return {
            userId: ur.userId,
            email: ur.email || emp?.email || "",
            name: emp?.employeeName || "Unknown",
            department: emp?.department || "Not Assigned",
            assignedAt: ur.assignedAt || null,
            assignedBy: ur.assignedBy || "Unknown",
          };
        });

      // Check for excessive permissions
      const actualPermissions = userRole.permissions || [];
      const standardPermissions = standardRole?.permissions || [];
      const excessivePermissions = actualPermissions.filter(
        (p) => !standardPermissions.includes(p)
      );
      const missingPermissions = standardPermissions.filter(
        (p) => !actualPermissions.includes(p)
      );

      // Check for conflicts (users with multiple roles)
      const userOtherRoles = userRoles.filter(
        (ur) => ur.userId === userRole.userId && ur.role !== roleName
      );

      // Track permissions
      actualPermissions.forEach((perm) => {
        allPermissions.add(perm);
        if (!permissionToRoles.has(perm)) {
          permissionToRoles.set(perm, []);
        }
        if (!permissionToRoles.get(perm).includes(roleName)) {
          permissionToRoles.get(perm).push(roleName);
        }
      });

      roleAnalysis.push({
        role: roleName,
        roleDisplayName: standardRole?.name || roleName,
        totalUsers: assignedUsers.length,
        assignedUsers: assignedUsers,
        standardPermissions: standardPermissions,
        actualPermissions: actualPermissions,
        excessivePermissions: excessivePermissions,
        missingPermissions: missingPermissions,
        hasExcessivePermissions: excessivePermissions.length > 0,
        hasMissingPermissions: missingPermissions.length > 0,
        hasConflicts: userOtherRoles.length > 0,
        conflicts: userOtherRoles.map((ur) => ({
          role: ur.role,
          email: ur.email,
        })),
      });
    });

    // Remove duplicates (group by role)
    const uniqueRoleAnalysis = [];
    const roleMap = new Map();

    roleAnalysis.forEach((analysis) => {
      if (!roleMap.has(analysis.role)) {
        roleMap.set(analysis.role, analysis);
      } else {
        // Merge user lists
        const existing = roleMap.get(analysis.role);
        existing.assignedUsers = [
          ...existing.assignedUsers,
          ...analysis.assignedUsers,
        ];
        existing.totalUsers = existing.assignedUsers.length;
      }
    });

    uniqueRoleAnalysis.push(...roleMap.values());

    // Find permission conflicts (permissions assigned to multiple roles)
    const permissionConflicts = [];
    permissionToRoles.forEach((roles, permission) => {
      if (roles.length > 1) {
        permissionConflicts.push({
          permission,
          assignedToRoles: roles,
          conflictLevel: roles.length > 2 ? "high" : "medium",
        });
      }
    });

    // Summary statistics
    const summary = {
      totalRoles: uniqueRoleAnalysis.length,
      totalUsers: userRoles.length,
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
      permissionConflicts: permissionConflicts.length,
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
      reportType: "roles_permissions_audit",
      generatedAt: new Date().toISOString(),
      summary,
      roles: uniqueRoleAnalysis,
      permissionConflicts,
      standardRoles,
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
