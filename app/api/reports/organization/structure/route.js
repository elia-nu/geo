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

    // Get all projects (can represent divisions/units)
    const projects = await db
      .collection("projects")
      .find({})
      .project({
        _id: 1,
        name: 1,
        status: 1,
        description: 1,
      })
      .toArray();

    // Build hierarchy structure
    // Structure: Company → Division (Projects) → Department → Unit (Work Locations) → Role
    const hierarchy = {
      company: "Organization", // Default company name
      divisions: [],
    };

    // Group by projects (divisions)
    const projectMap = new Map();
    projects.forEach((project) => {
      projectMap.set(project._id.toString(), {
        id: project._id.toString(),
        name: project.name || "Unassigned Division",
        status: project.status || "active",
        departments: [],
      });
    });

    // Add departments to projects
    departments.forEach((dept) => {
      const projectId = dept.projectId
        ? dept.projectId.toString()
        : "unassigned";
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          id: projectId,
          name: "Unassigned Division",
          status: "active",
          departments: [],
        });
      }

      const division = projectMap.get(projectId);
      
      // Group employees by department
      const deptEmployees = employees.filter(
        (emp) =>
          emp.department === dept.name ||
          (dept._id && emp.department === dept._id.toString())
      );

      // Group by work location (units)
      const unitsMap = new Map();
      deptEmployees.forEach((emp) => {
        const unitName = emp.workLocation || "Unassigned Unit";
        if (!unitsMap.has(unitName)) {
          unitsMap.set(unitName, {
            name: unitName,
            roles: [],
          });
        }

        const unit = unitsMap.get(unitName);
        const roleName = emp.role || "Employee";
        
        let roleGroup = unit.roles.find((r) => r.name === roleName);
        if (!roleGroup) {
          roleGroup = {
            name: roleName,
            employees: [],
          };
          unit.roles.push(roleGroup);
        }

        roleGroup.employees.push({
          id: emp.employeeId,
          name: emp.employeeName,
          email: emp.email,
          status: emp.status,
        });
      });

      division.departments.push({
        id: dept._id.toString(),
        name: dept.name || "Unnamed Department",
        description: dept.description || "",
        managerId: dept.managerId
          ? dept.managerId.toString()
          : null,
        employeeCount: deptEmployees.length,
        units: Array.from(unitsMap.values()),
      });
    });

    // Also handle employees without departments
    const unassignedEmployees = employees.filter(
      (emp) => !departments.some((dept) => dept.name === emp.department)
    );

    if (unassignedEmployees.length > 0) {
      const unassignedDivision = projectMap.get("unassigned") || {
        id: "unassigned",
        name: "Unassigned Division",
        status: "active",
        departments: [],
      };

      const unitsMap = new Map();
      unassignedEmployees.forEach((emp) => {
        const unitName = emp.workLocation || "Unassigned Unit";
        if (!unitsMap.has(unitName)) {
          unitsMap.set(unitName, {
            name: unitName,
            roles: [],
          });
        }

        const unit = unitsMap.get(unitName);
        const roleName = emp.role || "Employee";
        
        let roleGroup = unit.roles.find((r) => r.name === roleName);
        if (!roleGroup) {
          roleGroup = {
            name: roleName,
            employees: [],
          };
          unit.roles.push(roleGroup);
        }

        roleGroup.employees.push({
          id: emp.employeeId,
          name: emp.employeeName,
          email: emp.email,
          status: emp.status,
        });
      });

      unassignedDivision.departments.push({
        id: "unassigned",
        name: "Unassigned Department",
        description: "Employees not assigned to any department",
        managerId: null,
        employeeCount: unassignedEmployees.length,
        units: Array.from(unitsMap.values()),
      });

      if (!projectMap.has("unassigned")) {
        projectMap.set("unassigned", unassignedDivision);
      }
    }

    hierarchy.divisions = Array.from(projectMap.values());

    // Calculate summary statistics
    const summary = {
      totalDivisions: hierarchy.divisions.length,
      totalDepartments: departments.length + (unassignedEmployees.length > 0 ? 1 : 0),
      totalUnits: new Set(
        employees.map((e) => e.workLocation || "Unassigned Unit")
      ).size,
      totalRoles: new Set(employees.map((e) => e.role || "Employee")).size,
      totalEmployees: employees.length,
      byDivision: {},
      byDepartment: {},
      byRole: {},
    };

    hierarchy.divisions.forEach((div) => {
      summary.byDivision[div.name] = {
        departments: div.departments.length,
        employees: div.departments.reduce(
          (sum, dept) => sum + dept.employeeCount,
          0
        ),
      };
    });

    departments.forEach((dept) => {
      const deptEmployees = employees.filter(
        (emp) =>
          emp.department === dept.name ||
          (dept._id && emp.department === dept._id.toString())
      );
      summary.byDepartment[dept.name] = deptEmployees.length;
    });

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
