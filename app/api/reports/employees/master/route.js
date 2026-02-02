import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Employee Master Report API
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
    const department = searchParams.get("department");
    const projectId = searchParams.get("projectId");
    const location = searchParams.get("location");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status"); // active, inactive, on_leave, terminated
    const startDate = searchParams.get("startDate"); // For historical data
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json"; // json, csv, excel, pdf

    // Build aggregation pipeline
    let pipeline = [];

    // Build initial match query for basic filters
    let matchQuery = {};

    // Employee ID filter (exact match)
    if (employeeId && ObjectId.isValid(employeeId)) {
      matchQuery._id = new ObjectId(employeeId);
    }

    // Department filter
    if (department && department.trim() !== "") {
      matchQuery.$or = [
        { department: department },
        { "personalDetails.department": department },
      ];
    }

    // Location filter - combine with department using $and if both exist
    if (location && location.trim() !== "") {
      const locationFilter = {
        $or: [
          { workLocation: location },
          { "personalDetails.workLocation": location },
        ],
      };

      if (matchQuery.$or) {
        // If we already have department filter, use $and to require both
        matchQuery = {
          $and: [
            { $or: matchQuery.$or },
            locationFilter,
          ],
        };
      } else {
        matchQuery.$or = locationFilter.$or;
      }
    }

    // Apply initial match if we have filters
    if (Object.keys(matchQuery).length > 0) {
      pipeline.push({ $match: matchQuery });
    }

    // Lookup projects to get project assignments
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
                $eq: ["$_id", "$$locationId"],
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

    // Lookup supervisor (if supervisor field exists)
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

    // Lookup leave records to determine if on leave
    pipeline.push({
      $lookup: {
        from: "leave_requests",
        let: { employeeId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$employeeId", "$$employeeId"] },
              status: "approved",
              $or: [
                {
                  startDate: { $lte: new Date() },
                  endDate: { $gte: new Date() },
                },
              ],
            },
          },
          {
            $project: {
              startDate: 1,
              endDate: 1,
              leaveType: 1,
            },
          },
        ],
        as: "activeLeave",
      },
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        // Employee name
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
        // Email
        email: {
          $ifNull: ["$personalDetails.email", "$email", ""],
        },
        // Department
        departmentName: {
          $ifNull: ["$department", "$personalDetails.department", "Not Assigned"],
        },
        // Designation/Role
        role: {
          $ifNull: [
            "$designation",
            "$personalDetails.designation",
            "$position",
            "$personalDetails.position",
            "Employee",
          ],
        },
        // Work location
        workLocationName: {
          $ifNull: [
            { $arrayElemAt: ["$workLocationDetails.name", 0] },
            "$workLocation",
            "$personalDetails.workLocation",
            "Not Assigned",
          ],
        },
        // Supervisor
        supervisorName: {
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
        // Contract type
        contractType: {
          $ifNull: [
            "$personalDetails.employeeType",
            "$employeeType",
            "$contractType",
            "Permanent",
          ],
        },
        // Joining date
        joiningDate: {
          $ifNull: [
            "$personalDetails.joiningDate",
            "$joiningDate",
            "$createdAt",
            null,
          ],
        },
        // Contract expiry date
        contractExpiryDate: {
          $ifNull: [
            "$personalDetails.contractExpiryDate",
            "$contractExpiryDate",
            null,
          ],
        },
        // Project assignments
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
        // Determine employee status
        computedStatus: {
          $let: {
            vars: {
              contractExpiry: {
                $ifNull: [
                  "$personalDetails.contractExpiryDate",
                  "$contractExpiryDate",
                  null,
                ],
              },
              currentDate: new Date(),
            },
            in: {
              $cond: {
                // First check: Is employee on leave?
                if: { $gt: [{ $size: "$activeLeave" }, 0] },
                then: "On Leave",
                else: {
                  $cond: {
                    // Second check: Is status explicitly set to terminated?
                    if: {
                      $or: [
                        { $eq: ["$status", "terminated"] },
                        { $eq: ["$status", "Terminated"] },
                        { $eq: ["$status", "TERMINATED"] },
                      ],
                    },
                    then: "Terminated",
                    else: {
                      $cond: {
                        // Third check: Has contract expired?
                        if: {
                          $and: [
                            { $ne: ["$$contractExpiry", null] },
                            { $lt: ["$$contractExpiry", "$$currentDate"] },
                          ],
                        },
                        then: "Terminated",
                        else: {
                          $cond: {
                            // Fourth check: Is status explicitly inactive?
                            if: {
                              $or: [
                                { $eq: ["$status", "inactive"] },
                                { $eq: ["$status", "Inactive"] },
                                { $eq: ["$status", "INACTIVE"] },
                              ],
                            },
                            then: "Inactive",
                            else: "Active",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter by status if provided (only if explicitly set and not "all")
    // Note: status filter should be case-insensitive and match the computed status
    if (status && status !== "all" && status.trim() !== "") {
      // Normalize status values
      const statusMap = {
        "active": "Active",
        "inactive": "Inactive",
        "on_leave": "On Leave",
        "on leave": "On Leave",
        "terminated": "Terminated",
      };
      const normalizedStatus = statusMap[status.toLowerCase()] || status;
      
      pipeline.push({
        $match: {
          computedStatus: normalizedStatus,
        },
      });
    }

    // Filter by project if provided
    if (projectId && ObjectId.isValid(projectId)) {
      pipeline.push({
        $match: {
          "assignedProjects.id": new ObjectId(projectId),
        },
      });
    }

    // Filter by date range (for historical data - based on joining date or contract dates)
    // Only apply this filter if BOTH dates are provided
    // This filter shows employees whose joining date OR contract dates fall within the range
    // Note: This is an OR condition, so it will show employees if ANY of these dates match
    if (startDate && endDate && startDate.trim() !== "" && endDate.trim() !== "") {
      pipeline.push({
        $match: {
          $or: [
            {
              joiningDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
            {
              contractExpiryDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
            {
              "personalDetails.contractExpiryDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
            {
              "personalDetails.joiningDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
            {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
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
        department: "$departmentName",
        role: 1,
        workLocation: "$workLocationName",
        supervisor: "$supervisorName",
        supervisorEmail: 1,
        contractType: 1,
        joiningDate: 1,
        contractExpiryDate: 1,
        status: "$computedStatus",
        assignedProjects: 1,
        contactNumber: {
          $ifNull: [
            "$personalDetails.contactNumber",
            "$contactNumber",
            "",
          ],
        },
        createdAt: 1,
        updatedAt: 1,
      },
    });

    // Execute aggregation
    const employees = await db
      .collection("employees")
      .aggregate(pipeline)
      .toArray();

    // Get summary statistics
    const summary = {
      total: employees.length,
      byStatus: {
        Active: employees.filter((e) => e.status === "Active").length,
        Inactive: employees.filter((e) => e.status === "Inactive").length,
        "On Leave": employees.filter((e) => e.status === "On Leave").length,
        Terminated: employees.filter((e) => e.status === "Terminated").length,
      },
      byDepartment: {},
      byContractType: {},
    };

    employees.forEach((emp) => {
      // Count by department
      const dept = emp.department || "Not Assigned";
      summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;

      // Count by contract type
      const contract = emp.contractType || "Permanent";
      summary.byContractType[contract] =
        (summary.byContractType[contract] || 0) + 1;
    });

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "employee_master",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_master",
        filters: {
          department,
          projectId,
          location,
          employeeId,
          status,
          startDate,
          endDate,
        },
        recordCount: employees.length,
      },
    });

    // Return data based on format
    if (format === "json") {
      return NextResponse.json({
        success: true,
        reportType: "employee_master",
        generatedAt: new Date().toISOString(),
        filters: {
          department,
          projectId,
          location,
          employeeId,
          status,
          startDate,
          endDate,
        },
        summary,
        employees,
        totalRecords: employees.length,
      });
    }

    // For other formats, we'll handle in export endpoint
    return NextResponse.json({
      success: true,
      message: "Use export endpoint for CSV, Excel, or PDF formats",
      data: {
        reportType: "employee_master",
        summary,
        employees,
      },
    });
  } catch (error) {
    console.error("Error generating employee master report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate employee master report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
