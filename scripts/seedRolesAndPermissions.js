import { MongoClient } from "mongodb";
import { getMongoUri } from "./getMongoUri.js";

const uri = getMongoUri();

export const DEFAULT_ROLES = [
  {
    name: "ADMIN",
    displayName: "Administrator",
    description: "Full system access. Can manage all settings, users, roles, and data.",
    level: 100,
    permissions: ["*"], // Wildcard — ADMIN bypasses all permission checks
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
      "location.read", "location.create", "location.update", "location.delete", "location.assign", "location.manage",
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
      "project.create", "project.read", "project.read.assigned", "project.update", "project.budget",
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
      "project.read.assigned",
      "project.read.own",
    ],
    isSystem: true,
    isActive: true,
  },
];

export async function seedRolesAndPermissions(db) {
  const col = db.collection("roles");
  await col.createIndex({ name: 1 }, { unique: true });

  for (const role of DEFAULT_ROLES) {
    await col.updateOne(
      { name: role.name },
      {
        $set: {
          ...role,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }
  console.log(`✅ Roles & permissions seeded (${DEFAULT_ROLES.length} roles).`);
}

if (process.argv[1]?.endsWith("seedRolesAndPermissions.js")) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("geo");
    await seedRolesAndPermissions(db);
    console.log("Roles and permissions script completed successfully.");
  } finally {
    await client.close();
  }
}
