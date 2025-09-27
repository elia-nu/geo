import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Get leave balance history and audit trail
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const leaveType = url.searchParams.get("leaveType");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const action = url.searchParams.get("action");
    const limit = parseInt(url.searchParams.get("limit")) || 50;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Build query for leave balance history
    let query = { employeeId: new ObjectId(employeeId) };

    if (leaveType) {
      query["adjustments.leaveType"] = leaveType;
    }

    if (startDate || endDate) {
      query["adjustments.adjustedAt"] = {};
      if (startDate) {
        query["adjustments.adjustedAt"].$gte = new Date(startDate);
      }
      if (endDate) {
        query["adjustments.adjustedAt"].$lte = new Date(endDate);
      }
    }

    // Get leave balance records with adjustments
    const leaveBalances = await db
      .collection("leave_balances")
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    // Get audit logs for leave balance actions
    const auditQuery = {
      entityType: "leave_balance",
      userId: new ObjectId(employeeId),
    };

    if (action) {
      auditQuery.action = { $regex: action, $options: "i" };
    }

    if (startDate || endDate) {
      auditQuery.createdAt = {};
      if (startDate) {
        auditQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        auditQuery.createdAt.$lte = new Date(endDate);
      }
    }

    const auditLogs = await db
      .collection("audit_logs")
      .find(auditQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get employee details
    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(employeeId) });

    // Process history data
    const history = [];

    // Add leave balance adjustments
    leaveBalances.forEach((balance) => {
      if (balance.adjustments && balance.adjustments.length > 0) {
        balance.adjustments.forEach((adjustment) => {
          history.push({
            type: "adjustment",
            date: adjustment.adjustedAt,
            leaveType: adjustment.leaveType,
            action: "adjustment",
            details: {
              adjustment: adjustment.adjustment,
              reason: adjustment.reason,
              adminId: adjustment.adminId,
            },
            description: `${
              adjustment.adjustment > 0 ? "Added" : "Deducted"
            } ${Math.abs(adjustment.adjustment)} days of ${
              adjustment.leaveType
            } leave`,
          });
        });
      }
    });

    // Add audit log entries
    auditLogs.forEach((log) => {
      history.push({
        type: "audit",
        date: log.createdAt,
        leaveType: log.metadata?.leaveType || "all",
        action: log.action,
        details: log.metadata,
        description: getAuditDescription(log),
      });
    });

    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get current leave balance for context
    const currentBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    // Calculate summary statistics
    const summary = calculateHistorySummary(history, currentBalance);

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee?._id,
          name: employee?.personalDetails?.name || employee?.name,
          email: employee?.personalDetails?.email || employee?.email,
          department: employee?.department,
        },
        currentBalance,
        history: history.slice(0, limit),
        summary,
        totalRecords: history.length,
      },
    });
  } catch (error) {
    console.error("Error fetching leave balance history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch leave balance history",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Create leave balance history entry
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { employeeId, leaveType, action, details, adminId } = data;

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: "Employee ID and action are required" },
        { status: 400 }
      );
    }

    // Create history entry
    const historyEntry = {
      employeeId: new ObjectId(employeeId),
      leaveType: leaveType || "all",
      action,
      details,
      adminId,
      createdAt: new Date(),
    };

    // Insert into leave_balance_history collection
    await db.collection("leave_balance_history").insertOne(historyEntry);

    // Also add to adjustments array in leave_balances collection
    if (
      action === "adjustment" &&
      leaveType &&
      details.adjustment !== undefined
    ) {
      await db.collection("leave_balances").updateOne(
        { employeeId: new ObjectId(employeeId) },
        {
          $push: {
            adjustments: {
              leaveType,
              adjustment: details.adjustment,
              reason: details.reason,
              adminId,
              adjustedAt: new Date(),
            },
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Leave balance history entry created successfully",
      data: historyEntry,
    });
  } catch (error) {
    console.error("Error creating leave balance history:", error);
    return NextResponse.json(
      {
        error: "Failed to create leave balance history",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to get audit description
function getAuditDescription(log) {
  const action = log.action;
  const metadata = log.metadata || {};

  switch (action) {
    case "LEAVE_BALANCE_RECALCULATE":
      return "Leave balance recalculated";
    case "LEAVE_BALANCE_ADJUST":
      return `Leave balance adjusted: ${metadata.adjustment > 0 ? "+" : ""}${
        metadata.adjustment
      } days of ${metadata.leaveType} leave`;
    case "LEAVE_BALANCE_RESET":
      return "Leave balance reset to initial state";
    case "EMPLOYEE_CHECK_IN":
      return "Employee checked in";
    case "EMPLOYEE_CHECK_OUT":
      return "Employee checked out";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

// Helper function to calculate history summary
function calculateHistorySummary(history, currentBalance) {
  const summary = {
    totalAdjustments: 0,
    totalAdded: 0,
    totalDeducted: 0,
    adjustmentsByType: {},
    recentActivity: 0,
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  history.forEach((entry) => {
    if (entry.type === "adjustment") {
      summary.totalAdjustments++;

      if (entry.details.adjustment > 0) {
        summary.totalAdded += entry.details.adjustment;
      } else {
        summary.totalDeducted += Math.abs(entry.details.adjustment);
      }

      // Count by leave type
      if (!summary.adjustmentsByType[entry.leaveType]) {
        summary.adjustmentsByType[entry.leaveType] = 0;
      }
      summary.adjustmentsByType[entry.leaveType]++;
    }

    // Count recent activity
    if (new Date(entry.date) > thirtyDaysAgo) {
      summary.recentActivity++;
    }
  });

  return summary;
}
