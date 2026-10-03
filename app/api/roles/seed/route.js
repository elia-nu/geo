import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

// Default system roles that ship with the application
const DEFAULT_ROLES = [
  {
    name: "ADMIN",
    displayName: "Administrator",
    description: "Full system access. Can manage all settings, users, roles, and data.",
    level: 100,
    permissions: ["*"], // Special wildcard — ADMIN bypasses all permission checks
    isSystem: true,
    isActive: true,
  },
  {
    name: "HR_MANAGER",
    displayName: "HR Manager",
    description: "Manages HR operations including employees, attendance, leave, payroll, and documents.",
    level: 80,
    permissions: [
      "employee.create", "employee.read", "employee.update", "employee.export",
      "document.create", "document.read", "document.update", "document.delete",
      "attendance.view", "attendance.manage", "attendance.reports",
      "leave.approve", "leave.manage", "leave.view.all",
      "overtime.view", "overtime.manage",
      "payroll.view", "payroll.manage", "payroll.reports",
      "project.read", "project.update",
      "task.read", "task.assign", "task.manage",
      "department.read", "department.manage",
      "designation.read", "designation.manage",
      "location.read", "location.manage",
      "geofence.read",
      "contract.read", "contract.manage",
      "reports.read", "reports.export", "reports.attendance", "reports.employee",
      "reports.payroll", "reports.organization",
      "audit.read",
      "notifications.manage",
      "calendar.manage",
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "HR_STAFF",
    displayName: "HR Staff",
    description: "Day-to-day HR operations — employee data entry, document management, basic reporting.",
    level: 60,
    permissions: [
      "employee.read", "employee.update", "employee.create",
      "document.create", "document.read", "document.update",
      "attendance.view", "attendance.reports",
      "leave.view.all",
      "overtime.view",
      "payroll.view",
      "project.read",
      "task.read",
      "department.read",
      "designation.read",
      "location.read",
      "geofence.read",
      "contract.read",
      "reports.read", "reports.attendance", "reports.employee",
    ],
    isSystem: true,
    isActive: true,
  },
  {
    name: "MANAGER",
    displayName: "Department Manager",
    description: "Manages a department — can approve leave, view team attendance, assign tasks.",
    level: 50,
    permissions: [
      "employee.read",
      "document.read",
      "attendance.view", "attendance.reports",
      "leave.approve", "leave.view.all",
      "overtime.view", "overtime.manage",
      "project.read", "project.update",
      "task.create", "task.read", "task.assign", "task.manage",
      "department.read",
      "designation.read",
      "location.read",
      "reports.read", "reports.attendance",
      "employee.read.own", "employee.update.own",
      "document.read.own", "document.create.own",
      "attendance.checkin",
      "leave.request",
      "task.read.own",
    ],
    isSystem: false,
    isActive: true,
  },
  {
    name: "PROJECT_MANAGER",
    displayName: "Project Manager",
    description: "Manages projects, budgets, tasks, and team assignments.",
    level: 50,
    permissions: [
      "employee.read",
      "project.create", "project.read", "project.update", "project.budget",
      "task.create", "task.read", "task.assign", "task.manage",
      "reports.read", "reports.project",
      "department.read",
      "location.read",
      "employee.read.own", "employee.update.own",
      "document.read.own", "document.create.own",
      "attendance.checkin",
      "leave.request",
      "task.read.own",
    ],
    isSystem: false,
    isActive: true,
  },
  {
    name: "FINANCE",
    displayName: "Finance Officer",
    description: "Manages payroll processing, project budgets, and financial reports.",
    level: 40,
    permissions: [
      "employee.read",
      "payroll.view", "payroll.manage", "payroll.approve", "payroll.reports",
      "project.read", "project.budget",
      "reports.read", "reports.export", "reports.payroll", "reports.project",
      "department.read",
      "employee.read.own", "employee.update.own",
      "document.read.own", "document.create.own",
      "attendance.checkin",
      "leave.request",
    ],
    isSystem: false,
    isActive: true,
  },
  {
    name: "EMPLOYEE",
    displayName: "Employee",
    description: "Standard employee — can view own profile, check in/out, request leave, view own tasks.",
    level: 10,
    permissions: [
      "employee.read.own",
      "employee.update.own",
      "document.read.own",
      "document.create.own",
      "attendance.checkin",
      "leave.request",
      "task.read.own",
    ],
    isSystem: true,
    isActive: true,
  },
];

// POST /api/roles/seed — seed default roles into the roles collection
export async function POST(request) {
  try {
    const db = await getDb();

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const roleDef of DEFAULT_ROLES) {
      try {
        const existing = await db
          .collection("roles")
          .findOne({ name: roleDef.name });

        if (existing) {
          results.skipped.push(roleDef.name);
          continue;
        }

        await db.collection("roles").insertOne({
          ...roleDef,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "system",
        });
        results.created.push(roleDef.name);
      } catch (err) {
        results.errors.push({ role: roleDef.name, error: err.message });
      }
    }

    // Create indexes
    try {
      await db.collection("roles").createIndex({ name: 1 }, { unique: true });
      await db.collection("roles").createIndex({ isActive: 1 });
      await db.collection("roles").createIndex({ level: -1 });

      // Also ensure user_roles indexes exist
      await db
        .collection("user_roles")
        .createIndex({ userId: 1, isActive: 1 });
      await db.collection("user_roles").createIndex({ roleName: 1 });
      await db.collection("user_roles").createIndex({ email: 1 });
    } catch (indexErr) {
      console.error("Index creation error:", indexErr);
    }

    // Migrate existing user_roles that reference old hardcoded role names
    // to ensure they have a matching roleName pointing to the new roles collection
    try {
      const legacyRoles = await db
        .collection("user_roles")
        .find({ isActive: true, roleName: { $exists: false } })
        .toArray();

      let migrated = 0;
      for (const ur of legacyRoles) {
        if (ur.role) {
          const roleDef = await db
            .collection("roles")
            .findOne({ name: ur.role, isActive: true });
          if (roleDef) {
            await db.collection("user_roles").updateOne(
              { _id: ur._id },
              {
                $set: {
                  roleName: roleDef.name,
                  roleId: roleDef._id,
                  permissions: roleDef.permissions,
                  migratedAt: new Date(),
                },
              }
            );
            migrated++;
          }
        }
      }
      results.migratedUsers = migrated;
    } catch (migrateErr) {
      console.error("Migration error:", migrateErr);
      results.migrationError = migrateErr.message;
    }

    return NextResponse.json({
      message: "Role seeding completed",
      results,
      totalDefaultRoles: DEFAULT_ROLES.length,
    });
  } catch (error) {
    console.error("Error seeding roles:", error);
    return NextResponse.json(
      { error: "Failed to seed roles" },
      { status: 500 }
    );
  }
}

// GET /api/roles/seed — just returns the default role definitions (for reference)
export async function GET() {
  return NextResponse.json({
    defaultRoles: DEFAULT_ROLES.map((r) => ({
      name: r.name,
      displayName: r.displayName,
      description: r.description,
      level: r.level,
      permissionCount: r.permissions.length,
      isSystem: r.isSystem,
    })),
  });
}
