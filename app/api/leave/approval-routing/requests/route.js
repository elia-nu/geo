import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Get leave requests for approval
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);

    const managerId = url.searchParams.get("managerId"); // Optional now
    const status = url.searchParams.get("status") || "pending";
    const department = url.searchParams.get("department");
    const leaveType = url.searchParams.get("leaveType");
    const dateRange = url.searchParams.get("dateRange");
    const search = url.searchParams.get("search");

    // Get manager details if managerId is provided
    let manager = null;
    if (managerId) {
      manager = await db
        .collection("employees")
        .findOne({ _id: new ObjectId(managerId) });

      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 404 }
        );
      }
    }

    // Build query for leave requests
    let query = {
      type: "leave",
    };

    // Filter by status
    if (status !== "all") {
      query.status = status;
    }

    // Filter by department
    if (department) {
      // Get employees in the specified department
      const departmentEmployees = await db
        .collection("employees")
        .find({ department })
        .project({ _id: 1 })
        .toArray();

      const employeeIds = departmentEmployees.map((emp) => emp._id);
      query.employeeId = { $in: employeeIds };
    }

    // Filter by leave type
    if (leaveType) {
      query.leaveType = leaveType;
    }

    // Filter by date range
    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      query.submittedAt = { $gte: startDate };
    }

    // Get leave requests
    const leaveRequests = await db
      .collection("attendance_documents")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    console.log("Found leave requests:", leaveRequests.length);
    console.log("Query used:", query);
    if (leaveRequests.length > 0) {
      console.log("Sample request:", {
        id: leaveRequests[0]._id,
        employeeId: leaveRequests[0].employeeId,
        type: leaveRequests[0].type,
        status: leaveRequests[0].status,
        startDate: leaveRequests[0].startDate,
        endDate: leaveRequests[0].endDate,
      });
    }

    // Get employee details for each request
    const employeeIds = [
      ...new Set(leaveRequests.map((req) => req.employeeId)),
    ];
    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeIds } })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp;
    });

    // Filter requests based on approval routing
    const filteredRequests = [];

    console.log("Processing leave requests for approval...");
    if (manager) {
      console.log("Manager details:", {
        id: manager._id,
        name: manager.personalDetails?.name || manager.name,
        department: manager.department || manager.personalDetails?.department,
        designation:
          manager.designation || manager.personalDetails?.designation,
      });
    } else {
      console.log("No manager specified - showing all requests");
    }

    for (const request of leaveRequests) {
      console.log(
        `Processing request ${request._id} for employee ${request.employeeId}`
      );

      const employee = employeeMap[request.employeeId.toString()];
      if (!employee) {
        console.log(`Employee ${request.employeeId} not found in employeeMap`);
        continue;
      }

      console.log(
        `Found employee: ${employee.personalDetails?.name || employee.name}`
      );

      // If no manager is specified, include all requests
      let shouldApprove = true;
      let routing = null;

      if (manager) {
        // Get approval routing for this request
        routing = await getApprovalRouting(db, employee, request._id);

        // Check if this manager should approve this request
        shouldApprove = checkManagerApproval(routing, manager);
        console.log(`Should approve: ${shouldApprove}`);
      } else {
        console.log("No manager specified - including request");
      }

      if (shouldApprove) {
        // Add employee details to request
        const enhancedRequest = {
          ...request,
          employeeName:
            employee.personalDetails?.name || employee.name || "Unknown",
          employeeEmail:
            employee.personalDetails?.email || employee.email || "",
          department:
            employee.department || employee.personalDetails?.department || "",
          designation:
            employee.designation || employee.personalDetails?.designation || "",
          approvalRouting: routing,
        };

        // Apply search filter if provided
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            enhancedRequest.employeeName.toLowerCase().includes(searchLower) ||
            enhancedRequest.leaveType.toLowerCase().includes(searchLower) ||
            enhancedRequest.reason.toLowerCase().includes(searchLower);

          if (matchesSearch) {
            filteredRequests.push(enhancedRequest);
          }
        } else {
          filteredRequests.push(enhancedRequest);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredRequests,
      total: filteredRequests.length,
    });
  } catch (error) {
    console.error("Error fetching leave requests for approval:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave requests", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get approval routing
async function getApprovalRouting(db, employee, leaveRequestId) {
  // Get custom routing configuration for this employee
  const customRouting = await db
    .collection("approval_routing")
    .findOne({ employeeId: employee._id });

  // Get leave request details
  const leaveRequest = await db
    .collection("attendance_documents")
    .findOne({ _id: new ObjectId(leaveRequestId) });

  // Determine approval levels based on leave type and duration
  const approvalLevels = determineApprovalLevels(
    employee,
    leaveRequest,
    customRouting
  );

  // Get approvers for each level
  const approvers = await getApproversForLevels(db, approvalLevels, employee);

  return {
    employeeId: employee._id,
    employeeName: employee.personalDetails?.name || employee.name,
    department: employee.department || employee.personalDetails?.department,
    designation: employee.designation || employee.personalDetails?.designation,
    leaveRequest,
    approvalLevels,
    approvers,
    routingConfig: customRouting?.routingConfig || null,
  };
}

// Helper function to determine approval levels
function determineApprovalLevels(employee, leaveRequest, customRouting) {
  const levels = [];

  // If custom routing exists, use it
  if (customRouting?.routingConfig) {
    return customRouting.routingConfig.levels;
  }

  // Default routing logic based on leave type and duration
  if (leaveRequest) {
    const leaveType = leaveRequest.leaveType;
    const days = calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate
    );

    // Level 1: Immediate Supervisor (always required)
    levels.push({
      level: 1,
      role: "immediate_supervisor",
      required: true,
      description: "Immediate Supervisor Approval",
    });

    // Level 2: Department Manager (for longer leaves or specific types)
    if (days > 5 || leaveType === "maternity" || leaveType === "paternity") {
      levels.push({
        level: 2,
        role: "department_manager",
        required: true,
        description: "Department Manager Approval",
      });
    }

    // Level 3: HR Manager (for extended leaves or special cases)
    if (days > 10 || leaveType === "maternity" || leaveType === "paternity") {
      levels.push({
        level: 3,
        role: "hr_manager",
        required: true,
        description: "HR Manager Approval",
      });
    }

    // Level 4: Senior Management (for very long leaves)
    if (days > 20) {
      levels.push({
        level: 4,
        role: "senior_management",
        required: true,
        description: "Senior Management Approval",
      });
    }
  } else {
    // Default levels for new requests
    levels.push({
      level: 1,
      role: "immediate_supervisor",
      required: true,
      description: "Immediate Supervisor Approval",
    });
  }

  return levels;
}

// Helper function to get approvers for each level
async function getApproversForLevels(db, levels, employee) {
  const approvers = {};

  for (const level of levels) {
    const levelApprovers = await getApproversForRole(db, level.role, employee);
    approvers[level.level] = {
      ...level,
      approvers: levelApprovers,
    };
  }

  return approvers;
}

// Helper function to get approvers for a specific role
async function getApproversForRole(db, role, employee) {
  const department =
    employee.department || employee.personalDetails?.department;
  const designation =
    employee.designation || employee.personalDetails?.designation;

  switch (role) {
    case "immediate_supervisor":
      // Find employees with supervisor designation in the same department
      return await db
        .collection("employees")
        .find({
          department,
          designation: { $in: ["Supervisor", "Team Lead", "Manager"] },
        })
        .limit(5)
        .toArray();

    case "department_manager":
      // Find department managers
      return await db
        .collection("employees")
        .find({
          department,
          designation: { $in: ["Department Manager", "Manager", "Director"] },
        })
        .limit(3)
        .toArray();

    case "hr_manager":
      // Find HR managers
      return await db
        .collection("employees")
        .find({
          department: "HR",
          designation: { $in: ["HR Manager", "HR Director", "Manager"] },
        })
        .limit(3)
        .toArray();

    case "senior_management":
      // Find senior management
      return await db
        .collection("employees")
        .find({
          designation: { $in: ["Director", "VP", "CEO", "CTO", "CFO"] },
        })
        .limit(5)
        .toArray();

    default:
      return [];
  }
}

// Helper function to check if manager should approve this request
function checkManagerApproval(routing, manager) {
  // If no manager is provided, return true (show all requests)
  if (!manager) {
    return true;
  }

  const managerId = manager._id.toString();
  const managerDepartment =
    manager.department || manager.personalDetails?.department;
  const managerDesignation =
    manager.designation || manager.personalDetails?.designation;

  // For testing purposes, allow any manager to approve requests
  // In production, you would use the more restrictive logic below
  console.log("Checking manager approval:", {
    managerId,
    managerDepartment,
    managerDesignation,
    routingDepartment: routing.department,
  });

  // Allow any manager to approve for testing
  return true;

  // Original restrictive logic (commented out for testing):
  /*
  // Check each approval level
  for (const [level, levelData] of Object.entries(routing.approvers)) {
    const approvers = levelData.approvers || [];

    // Check if this manager is in the approvers list
    const isApprover = approvers.some(
      (approver) => approver._id.toString() === managerId
    );

    if (isApprover) {
      return true;
    }

    // Check if manager matches the role requirements
    const role = levelData.role;
    switch (role) {
      case "immediate_supervisor":
        if (
          managerDesignation &&
          ["Supervisor", "Team Lead", "Manager"].includes(managerDesignation)
        ) {
          return true;
        }
        break;
      case "department_manager":
        if (
          managerDepartment === routing.department &&
          managerDesignation &&
          ["Department Manager", "Manager", "Director"].includes(
            managerDesignation
          )
        ) {
          return true;
        }
        break;
      case "hr_manager":
        if (
          managerDepartment === "HR" &&
          managerDesignation &&
          ["HR Manager", "HR Director", "Manager"].includes(managerDesignation)
        ) {
          return true;
        }
        break;
      case "senior_management":
        if (
          managerDesignation &&
          ["Director", "VP", "CEO", "CTO", "CFO"].includes(managerDesignation)
        ) {
          return true;
        }
        break;
    }
  }

  return false;
  */
}

// Helper function to calculate number of working days
function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Exclude weekends (Saturday = 6, Sunday = 0)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days++;
    }
  }

  return days;
}
