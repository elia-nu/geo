import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Employee Allocation Report API
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

    // Extract filter parameters
    const projectId = searchParams.get("projectId");
    const locationId = searchParams.get("locationId");
    const department = searchParams.get("department");
    const supervisorId = searchParams.get("supervisorId");
    const format = searchParams.get("format") || "json";

    // Build aggregation pipeline
    let pipeline = [];

    // Match employees based on filters
    let matchQuery = {};
    if (department) {
      matchQuery.$or = [
        { department: department },
        { "personalDetails.department": department },
      ];
    }
    if (supervisorId && ObjectId.isValid(supervisorId)) {
      matchQuery.supervisor = new ObjectId(supervisorId);
    }
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }

    // Lookup projects
    pipeline.push({
      $lookup: {
        from: "projects",
        let: { employeeId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$$employeeId", { $ifNull: ["$assignedEmployees", []] }],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              status: 1,
              startDate: 1,
              endDate: 1,
            },
          },
        ],
        as: "projects",
      },
    });

    // Lookup work locations
    pipeline.push({
      $lookup: {
        from: "work_locations",
        let: { locationId: "$workLocation" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$_id", "$$locationId"] },
                  { $in: ["$$locationId", { $ifNull: ["$assignedEmployees", []] }] },
                ],
              },
            },
          },
          {
            $project: {
              name: 1,
              address: 1,
            },
          },
        ],
        as: "workLocationDetails",
      },
    });

    // Lookup supervisor
    pipeline.push({
      $lookup: {
        from: "employees",
        let: { supervisorId: "$supervisor" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$supervisorId"],
              },
            },
          },
          {
            $project: {
              name: { $ifNull: ["$personalDetails.name", "$name"] },
              email: { $ifNull: ["$personalDetails.email", "$email"] },
            },
          },
        ],
        as: "supervisorDetails",
      },
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
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
          $ifNull: ["$department", "$personalDetails.department", "Not Assigned"],
        },
        role: {
          $ifNull: [
            "$designation",
            "$personalDetails.designation",
            "$position",
            "$personalDetails.position",
            "Employee",
          ],
        },
        workLocation: {
          $ifNull: [
            { $arrayElemAt: ["$workLocationDetails.name", 0] },
            "$workLocation",
            "$personalDetails.workLocation",
            "Not Assigned",
          ],
        },
        supervisor: {
          $ifNull: [
            { $arrayElemAt: ["$supervisorDetails.name", 0] },
            "$supervisorName",
            "Not Assigned",
          ],
        },
        supervisorEmail: {
          $ifNull: [
            { $arrayElemAt: ["$supervisorDetails.email", 0] },
            "$supervisorEmail",
            "",
          ],
        },
        projectCount: { $size: "$projects" },
        assignedProjects: {
          $map: {
            input: "$projects",
            as: "project",
            in: {
              id: "$$project._id",
              name: "$$project.name",
              status: "$$project.status",
            },
          },
        },
      },
    });

    // Filter by project if provided
    if (projectId && ObjectId.isValid(projectId)) {
      pipeline.push({
        $match: {
          "assignedProjects.id": new ObjectId(projectId),
        },
      });
    }

    // Filter by location if provided
    if (locationId && ObjectId.isValid(locationId)) {
      pipeline.push({
        $match: {
          $or: [
            { workLocation: { $regex: locationId, $options: "i" } },
            { "workLocationDetails._id": new ObjectId(locationId) },
          ],
        },
      });
    }

    // Sort by name
    pipeline.push({
      $sort: { employeeName: 1 },
    });

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        employeeId: { $toString: "$_id" },
        employeeName: 1,
        email: 1,
        department: 1,
        role: 1,
        workLocation: 1,
        supervisor: 1,
        supervisorEmail: 1,
        projectCount: 1,
        assignedProjects: 1,
      },
    });

    // Execute aggregation
    const employees = await db
      .collection("employees")
      .aggregate(pipeline)
      .toArray();

    // Calculate allocation statistics
    const allocationStats = {
      totalEmployees: employees.length,
      byProject: {},
      byLocation: {},
      byDepartment: {},
      bySupervisor: {},
      utilization: {
        overloaded: [], // Employees with > 3 projects
        underutilized: [], // Employees with 0 projects
        optimal: [], // Employees with 1-3 projects
      },
    };

    employees.forEach((emp) => {
      // Count by project
      emp.assignedProjects?.forEach((project) => {
        const projectName = project.name;
        if (!allocationStats.byProject[projectName]) {
          allocationStats.byProject[projectName] = {
            name: projectName,
            employeeCount: 0,
            employees: [],
          };
        }
        allocationStats.byProject[projectName].employeeCount++;
        allocationStats.byProject[projectName].employees.push({
          id: emp.employeeId,
          name: emp.employeeName,
          department: emp.department,
        });
      });

      // Count by location
      const location = emp.workLocation || "Not Assigned";
      if (!allocationStats.byLocation[location]) {
        allocationStats.byLocation[location] = {
          name: location,
          employeeCount: 0,
          employees: [],
        };
      }
      allocationStats.byLocation[location].employeeCount++;
      allocationStats.byLocation[location].employees.push({
        id: emp.employeeId,
        name: emp.employeeName,
        projectCount: emp.projectCount,
      });

      // Count by department
      const dept = emp.department || "Not Assigned";
      if (!allocationStats.byDepartment[dept]) {
        allocationStats.byDepartment[dept] = {
          name: dept,
          employeeCount: 0,
          employees: [],
        };
      }
      allocationStats.byDepartment[dept].employeeCount++;
      allocationStats.byDepartment[dept].employees.push({
        id: emp.employeeId,
        name: emp.employeeName,
        projectCount: emp.projectCount,
      });

      // Count by supervisor
      const supervisor = emp.supervisor || "Not Assigned";
      if (!allocationStats.bySupervisor[supervisor]) {
        allocationStats.bySupervisor[supervisor] = {
          name: supervisor,
          employeeCount: 0,
          employees: [],
        };
      }
      allocationStats.bySupervisor[supervisor].employeeCount++;
      allocationStats.bySupervisor[supervisor].employees.push({
        id: emp.employeeId,
        name: emp.employeeName,
        projectCount: emp.projectCount,
      });

      // Utilization analysis
      const projectCount = emp.projectCount || 0;
      if (projectCount === 0) {
        allocationStats.utilization.underutilized.push({
          id: emp.employeeId,
          name: emp.employeeName,
          department: emp.department,
          projectCount: 0,
        });
      } else if (projectCount > 3) {
        allocationStats.utilization.overloaded.push({
          id: emp.employeeId,
          name: emp.employeeName,
          department: emp.department,
          projectCount: projectCount,
          projects: emp.assignedProjects,
        });
      } else {
        allocationStats.utilization.optimal.push({
          id: emp.employeeId,
          name: emp.employeeName,
          department: emp.department,
          projectCount: projectCount,
        });
      }
    });

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "employee_allocation",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_allocation",
        filters: {
          projectId,
          locationId,
          department,
          supervisorId,
        },
        recordCount: employees.length,
      },
    });

    // Return data
    return NextResponse.json({
      success: true,
      reportType: "employee_allocation",
      generatedAt: new Date().toISOString(),
      filters: {
        projectId,
        locationId,
        department,
        supervisorId,
      },
      allocationStats,
      employees,
      totalRecords: employees.length,
    });
  } catch (error) {
    console.error("Error generating employee allocation report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate employee allocation report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
