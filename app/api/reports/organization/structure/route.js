import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Organizational Structure Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

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

    // Build organizational hierarchy
    // Since we don't have explicit Company/Division/Unit structure,
    // we'll infer it from departments, employees, and projects

    // Get all departments
    const departments = await db
      .collection("departments")
      .find({})
      .toArray();

    // Get all employees with their departments and roles
    const employees = await db
      .collection("employees")
      .aggregate([
        {
          $lookup: {
            from: "user_roles",
            let: { employeeId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$employeeId"] },
                      { $eq: ["$isActive", true] },
                    ],
                  },
                },
              },
              {
                $project: {
                  role: 1,
                  permissions: 1,
                },
              },
            ],
            as: "userRoles",
          },
        },
        {
          $addFields: {
            department: {
              $ifNull: [
                "$personalDetails.department",
                "$department",
                "Unassigned",
              ],
            },
            role: {
              $ifNull: [
                { $arrayElemAt: ["$userRoles.role", 0] },
                "$designation",
                "$personalDetails.designation",
                "$position",
                "$personalDetails.position",
                "Employee",
              ],
            },
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
          },
        },
        {
          $project: {
            _id: 1,
            employeeId: { $toString: "$_id" },
            employeeName: 1,
            email: {
              $ifNull: ["$personalDetails.email", "$email", ""],
            },
            department: 1,
            role: 1,
            status: {
              $ifNull: ["$status", "active"],
            },
            workLocation: {
              $ifNull: [
                "$workLocation",
                "$personalDetails.workLocation",
                "Not Assigned",
              ],
            },
          },
        },
      ])
      .toArray();

    // Build hierarchy: Company → Department → Role (no division, no unit)
    const hierarchy = {
      company: "Organization",
      departments: [],
    };

    // Helper: build roles array from a list of employees (group by role name)
    const buildRolesFromEmployees = (empList) => {
      const rolesMap = new Map();
      empList.forEach((emp) => {
        const roleName = emp.role || "Employee";
        if (!rolesMap.has(roleName)) {
          rolesMap.set(roleName, { name: roleName, employees: [] });
        }
        rolesMap.get(roleName).employees.push({
          id: emp.employeeId,
          name: emp.employeeName,
          email: emp.email,
          status: emp.status,
        });
      });
      return Array.from(rolesMap.values());
    };

    // Add each department with its roles (no units)
    departments.forEach((dept) => {
      const deptEmployees = employees.filter(
        (emp) =>
          emp.department === dept.name ||
          (dept._id && emp.department === dept._id.toString())
      );

      hierarchy.departments.push({
        id: dept._id.toString(),
        name: dept.name || "Unnamed Department",
        description: dept.description || "",
        managerId: dept.managerId
          ? dept.managerId.toString()
          : null,
        employeeCount: deptEmployees.length,
        roles: buildRolesFromEmployees(deptEmployees),
      });
    });

    // Employees not in any department
    const unassignedEmployees = employees.filter(
      (emp) => !departments.some((dept) => dept.name === emp.department)
    );

    if (unassignedEmployees.length > 0) {
      hierarchy.departments.push({
        id: "unassigned",
        name: "Unassigned Department",
        description: "Employees not assigned to any department",
        managerId: null,
        employeeCount: unassignedEmployees.length,
        roles: buildRolesFromEmployees(unassignedEmployees),
      });
    }

    // Summary (no divisions, no units)
    const summary = {
      totalDepartments: hierarchy.departments.length,
      totalRoles: new Set(employees.map((e) => e.role || "Employee")).size,
      totalEmployees: employees.length,
      byDepartment: {},
      byRole: {},
    };

    departments.forEach((dept) => {
      const deptEmployees = employees.filter(
        (emp) =>
          emp.department === dept.name ||
          (dept._id && emp.department === dept._id.toString())
      );
      summary.byDepartment[dept.name] = deptEmployees.length;
    });
    if (unassignedEmployees.length > 0) {
      summary.byDepartment["Unassigned Department"] = unassignedEmployees.length;
    }

    employees.forEach((emp) => {
      const role = emp.role || "Employee";
      summary.byRole[role] = (summary.byRole[role] || 0) + 1;
    });

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "organizational_structure",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "organizational_structure",
        recordCount: employees.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "organizational_structure",
      generatedAt: new Date().toISOString(),
      summary,
      hierarchy,
      totalRecords: employees.length,
    });
  } catch (error) {
    console.error("Error generating organizational structure report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate organizational structure report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
