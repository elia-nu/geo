import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get approval routing for a leave request
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const leaveRequestId = url.searchParams.get("leaveRequestId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(employeeId) });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get approval routing
    const routing = await getApprovalRouting(db, employee, leaveRequestId);

    return NextResponse.json({
      success: true,
      data: routing,
    });
  } catch (error) {
    console.error("Error getting approval routing:", error);
    return NextResponse.json(
      { error: "Failed to get approval routing", message: error.message },
      { status: 500 }
    );
  }
}

// Update approval routing (for admin/HR use)
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { employeeId, routingConfig, adminId } = data;

    if (!employeeId || !routingConfig || !adminId) {
      return NextResponse.json(
        { error: "Employee ID, routing config, and admin ID are required" },
        { status: 400 }
      );
    }

    // Update approval routing configuration
    await db.collection("approval_routing").updateOne(
      { employeeId: new ObjectId(employeeId) },
      {
        $set: {
          routingConfig,
          updatedBy: adminId,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Approval routing updated successfully",
    });
  } catch (error) {
    console.error("Error updating approval routing:", error);
    return NextResponse.json(
      { error: "Failed to update approval routing", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get approval routing for an employee
async function getApprovalRouting(db, employee, leaveRequestId = null) {
  // Get employee's department and hierarchy
  const department = employee.department || employee.personalDetails?.department;
  const designation = employee.designation || employee.personalDetails?.designation;
  
  // Get leave request details if provided
  let leaveRequest = null;
  if (leaveRequestId) {
    leaveRequest = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(leaveRequestId) });
  }

  // Get custom routing configuration for this employee
  const customRouting = await db
    .collection("approval_routing")
    .findOne({ employeeId: employee._id });

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
    department,
    designation,
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
    const days = calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate);

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
  const department = employee.department || employee.personalDetails?.department;
  const designation = employee.designation || employee.personalDetails?.designation;

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
