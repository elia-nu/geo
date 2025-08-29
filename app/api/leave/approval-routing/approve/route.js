import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Approve or reject leave request
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      leaveRequestId,
      action, // "approve" or "reject"
      managerId,
      managerName = "System Manager",
      notes = "",
    } = data;

    if (!leaveRequestId || !action) {
      return NextResponse.json(
        { error: "Leave request ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the leave request
    const leaveRequest = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(leaveRequestId) });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (leaveRequest.type !== "leave") {
      return NextResponse.json(
        { error: "This is not a leave request" },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await db
      .collection("employees")
      .findOne({ _id: leaveRequest.employeeId });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

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

      // Check if manager has permission to approve this request
      const hasPermission = await checkManagerPermission(
        db,
        leaveRequest,
        manager
      );
      if (!hasPermission) {
        return NextResponse.json(
          { error: "You don't have permission to approve this leave request" },
          { status: 403 }
        );
      }
    } else {
      // For testing purposes, allow approval without manager validation
      console.log("No manager ID provided - allowing approval for testing");
    }

    // Prepare approval data
    const approvalData = {
      approverId: managerId ? new ObjectId(managerId) : null,
      approverName:
        managerName ||
        (manager
          ? manager.personalDetails?.name || manager.name
          : "System Manager"),
      action: action,
      notes: notes,
      approvedAt: new Date(),
    };

    // Update leave request
    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: new Date(),
    };

    // Add approval history
    if (!leaveRequest.approvalHistory) {
      updateData.approvalHistory = [approvalData];
    } else {
      updateData.approvalHistory = [
        ...leaveRequest.approvalHistory,
        approvalData,
      ];
    }

    // If approved, update leave balance
    if (action === "approve") {
      await updateLeaveBalance(db, leaveRequest);
    }

    // Update the leave request
    await db
      .collection("attendance_documents")
      .updateOne({ _id: new ObjectId(leaveRequestId) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action:
        action === "approve" ? "APPROVE_LEAVE_REQUEST" : "REJECT_LEAVE_REQUEST",
      entityType: "attendance_document",
      entityId: leaveRequestId,
      userId: managerId || "system",
      userEmail: manager
        ? manager.personalDetails?.email || manager.email || ""
        : "system@company.com",
      metadata: {
        employeeName: employee.personalDetails?.name || employee.name,
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        managerName:
          managerName ||
          (manager
            ? manager.personalDetails?.name || manager.name
            : "System Manager"),
        notes: notes,
        previousStatus: leaveRequest.status,
      },
    });

    // Get updated leave request
    const updatedRequest = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(leaveRequestId) });

    return NextResponse.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error processing leave approval:", error);
    return NextResponse.json(
      { error: "Failed to process leave approval", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to check if manager has permission to approve
async function checkManagerPermission(db, leaveRequest, manager) {
  const managerId = manager._id.toString();
  const managerDepartment =
    manager.department || manager.personalDetails?.department;
  const managerDesignation =
    manager.designation || manager.personalDetails?.designation;

  // Get employee details
  const employee = await db
    .collection("employees")
    .findOne({ _id: leaveRequest.employeeId });

  if (!employee) return false;

  const employeeDepartment =
    employee.department || employee.personalDetails?.department;

  // Check if manager is the employee's direct supervisor
  if (
    managerDepartment === employeeDepartment &&
    managerDesignation &&
    ["Supervisor", "Team Lead", "Manager"].includes(managerDesignation)
  ) {
    return true;
  }

  // Check if manager is a department manager for the employee's department
  if (
    managerDepartment === employeeDepartment &&
    managerDesignation &&
    ["Department Manager", "Manager", "Director"].includes(managerDesignation)
  ) {
    return true;
  }

  // Check if manager is HR manager
  if (
    managerDepartment === "HR" &&
    managerDesignation &&
    ["HR Manager", "HR Director", "Manager"].includes(managerDesignation)
  ) {
    return true;
  }

  // Check if manager is senior management
  if (
    managerDesignation &&
    ["Director", "VP", "CEO", "CTO", "CFO"].includes(managerDesignation)
  ) {
    return true;
  }

  // Check custom approval routing
  const customRouting = await db
    .collection("approval_routing")
    .findOne({ employeeId: leaveRequest.employeeId });

  if (customRouting?.routingConfig?.levels) {
    for (const level of customRouting.routingConfig.levels) {
      if (level.approvers && level.approvers.includes(managerId)) {
        return true;
      }
    }
  }

  return false;
}

// Helper function to update leave balance when request is approved
async function updateLeaveBalance(db, leaveRequest) {
  try {
    // Get current leave balance
    let leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: leaveRequest.employeeId });

    if (!leaveBalance) {
      // Create initial leave balance if it doesn't exist
      const employee = await db
        .collection("employees")
        .findOne({ _id: leaveRequest.employeeId });

      if (employee) {
        leaveBalance = await createInitialLeaveBalance(db, employee);
      } else {
        return; // Employee not found, skip balance update
      }
    }

    // Calculate leave days
    const leaveDays = calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate
    );
    const leaveType = leaveRequest.leaveType;

    // Update the specific leave type balance
    if (leaveBalance.balances && leaveBalance.balances[leaveType]) {
      const currentBalance = leaveBalance.balances[leaveType];
      const newUsed = currentBalance.used + leaveDays;
      const newAvailable = Math.max(0, currentBalance.available - leaveDays);

      // Update leave balance
      await db.collection("leave_balances").updateOne(
        { employeeId: leaveRequest.employeeId },
        {
          $set: {
            [`balances.${leaveType}.used`]: newUsed,
            [`balances.${leaveType}.available`]: newAvailable,
            updatedAt: new Date(),
          },
        }
      );
    }
  } catch (error) {
    console.error("Error updating leave balance:", error);
    // Don't fail the approval if balance update fails
  }
}

// Helper function to create initial leave balance
async function createInitialLeaveBalance(db, employee) {
  const employmentDate = new Date(
    employee.employmentHistory?.[0]?.startDate || employee.createdAt
  );
  const currentDate = new Date();

  // Calculate years of service
  const yearsOfService =
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365);

  // Default leave entitlements
  const leaveEntitlements = {
    annual: {
      daysPerYear: 20,
      maxCarryForward: 5,
      description: "Annual Leave",
    },
    sick: { daysPerYear: 10, maxCarryForward: 0, description: "Sick Leave" },
    personal: {
      daysPerYear: 5,
      maxCarryForward: 0,
      description: "Personal Leave",
    },
    maternity: {
      daysPerYear: 90,
      maxCarryForward: 0,
      description: "Maternity Leave",
    },
    paternity: {
      daysPerYear: 14,
      maxCarryForward: 0,
      description: "Paternity Leave",
    },
    bereavement: {
      daysPerYear: 3,
      maxCarryForward: 0,
      description: "Bereavement Leave",
    },
  };

  // Calculate initial balances
  const balances = {};
  Object.keys(leaveEntitlements).forEach((leaveType) => {
    const entitlement = leaveEntitlements[leaveType];
    const totalEarned = Math.floor(yearsOfService * entitlement.daysPerYear);
    const carriedForward = Math.min(
      entitlement.maxCarryForward,
      Math.max(0, totalEarned - entitlement.daysPerYear)
    );

    balances[leaveType] = {
      totalEarned,
      carriedForward,
      available: totalEarned + carriedForward,
      used: 0,
      pending: 0,
      description: entitlement.description,
    };
  });

  const leaveBalance = {
    employeeId: employee._id,
    employeeName: employee.personalDetails?.name || employee.name,
    employmentDate,
    yearsOfService: Math.floor(yearsOfService * 100) / 100,
    balances,
    adjustments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("leave_balances").insertOne(leaveBalance);
  return leaveBalance;
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
