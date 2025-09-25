import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Approve or reject leave requests
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const {
      requestId,
      leaveRequestId,
      action,
      comments,
      notes,
      approverId,
      managerName,
    } = data;

    // Handle both field names for backward compatibility
    const actualRequestId = requestId || leaveRequestId;
    const actualComments = comments || notes;

    console.log("Approval request data:", {
      requestId,
      leaveRequestId,
      actualRequestId,
      action,
      comments,
      notes,
      actualComments,
      approverId,
      managerName,
    });

    if (!actualRequestId || !action) {
      console.log("Missing required fields:", { actualRequestId, action });
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      console.log("Invalid action:", action);
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(actualRequestId)) {
      console.log("Invalid ObjectId format:", actualRequestId);
      return NextResponse.json(
        { error: "Invalid request ID format" },
        { status: 400 }
      );
    }

    // Get the leave request
    const leaveRequest = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(actualRequestId) });

    if (!leaveRequest) {
      console.log("Leave request not found:", actualRequestId);
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    // Check if request is already processed
    if (leaveRequest.status !== "pending") {
      console.log(
        `Request ${actualRequestId} is already ${leaveRequest.status}`
      );
      return NextResponse.json(
        { error: "Leave request has already been processed" },
        { status: 400 }
      );
    }

    // Update the leave request status
    const newStatus = action === "approve" ? "approved" : "rejected";
    const updateData = {
      status: newStatus,
      processedAt: new Date(),
      processedBy: approverId || managerName || "system",
      comments: actualComments || "",
    };

    await db
      .collection("attendance_documents")
      .updateOne({ _id: new ObjectId(actualRequestId) }, { $set: updateData });

    // If approved, update the employee's leave balance
    if (action === "approve") {
      await updateLeaveBalanceOnApproval(db, leaveRequest);
    }

    // Get employee details for audit log
    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(leaveRequest.employeeId) });

    // Create audit log
    const auditMetadata = {
      employeeId: leaveRequest.employeeId,
      employeeName:
        employee?.personalDetails?.name || employee?.name || "Unknown",
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      action,
      comments: actualComments,
      previousStatus: "pending",
      newStatus,
    };

    // If approved, add balance update information to audit log
    if (action === "approve") {
      const days = calculateLeaveDays(
        leaveRequest.startDate,
        leaveRequest.endDate
      );
      auditMetadata.daysApproved = days;
      auditMetadata.balanceUpdated = true;
    }

    await createAuditLog({
      action: `LEAVE_REQUEST_${action.toUpperCase()}`,
      entityType: "leave_request",
      entityId: actualRequestId,
      userId: approverId || "system",
      metadata: auditMetadata,
    });

    // Get updated request
    const updatedRequest = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(actualRequestId) });

    return NextResponse.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error processing leave request:", error);
    return NextResponse.json(
      { error: "Failed to process leave request", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to update leave balance when a request is approved
async function updateLeaveBalanceOnApproval(db, leaveRequest) {
  try {
    console.log(
      "Updating leave balance for approved request:",
      leaveRequest._id
    );

    // Calculate the number of days for this leave request
    const days = calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate
    );
    console.log(
      `Calculated ${days} days for leave type: ${leaveRequest.leaveType}`
    );

    // Get the employee's current leave balance
    const leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(leaveRequest.employeeId) });

    if (!leaveBalance) {
      console.log(
        "No leave balance found for employee:",
        leaveRequest.employeeId
      );
      return;
    }

    // Check if the leave type exists in the balance
    if (!leaveBalance.balances[leaveRequest.leaveType]) {
      console.log(`Leave type ${leaveRequest.leaveType} not found in balance`);
      return;
    }

    const currentBalance = leaveBalance.balances[leaveRequest.leaveType];

    // Check if there are enough available days
    if (currentBalance.available < days) {
      console.log(
        `Insufficient leave balance. Available: ${currentBalance.available}, Requested: ${days}`
      );
      // Note: We could throw an error here, but since the request is already approved,
      // we'll just log the issue and continue
    }

    // Update the used days
    const newUsed = currentBalance.used + days;
    const newAvailable = Math.max(0, currentBalance.available - days);

    console.log(
      `Updating balance - Used: ${currentBalance.used} -> ${newUsed}, Available: ${currentBalance.available} -> ${newAvailable}`
    );

    // Update the leave balance in the database
    await db.collection("leave_balances").updateOne(
      { _id: leaveBalance._id },
      {
        $set: {
          [`balances.${leaveRequest.leaveType}.used`]: newUsed,
          [`balances.${leaveRequest.leaveType}.available`]: newAvailable,
          [`balances.${leaveRequest.leaveType}.lastCalculated`]: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log("Successfully updated leave balance");
  } catch (error) {
    console.error("Error updating leave balance on approval:", error);
    // Don't throw the error to avoid breaking the approval process
  }
}

// Helper function to calculate leave days
function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1; // Default to 1 day if dates are missing

  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

  return Math.max(1, daysDiff); // Minimum 1 day
}
