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
    let query = {};
    if (ObjectId.isValid(employeeId)) {
      query = {
        $or: [
          { employeeId: new ObjectId(employeeId) },
          { employeeId: employeeId },
        ],
      };
    } else {
      query = { employeeId: employeeId };
    }

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
      $or: [
        ...(ObjectId.isValid(employeeId) ? [{ userId: new ObjectId(employeeId) }] : []),
        { userId: employeeId },
        { "metadata.employeeId": employeeId },
      ],
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
    const employee = ObjectId.isValid(employeeId)
      ? await db.collection("employees").findOne({ _id: new ObjectId(employeeId) })
      : await db.collection("employees").findOne({ $or: [{ employeeId: employeeId }, { empId: employeeId }] });

    // Process history data
    const history = [];

    // Add leave balance adjustments
    leaveBalances.forEach((balance) => {
      if (balance.adjustments && balance.adjustments.length > 0) {
        let runningBalance = balance.balances?.annual?.baseAllowance || 16;
        balance.adjustments.forEach((adjustment) => {
          const isStartingSet = adjustment.type === "starting_balance_set" || adjustment.type === "set_balance";
          const adjVal = typeof adjustment.adjustment === "number" ? adjustment.adjustment : 0;

          let prevBal = adjustment.previousBalance;
          let newBal = adjustment.newBalance;

          if (prevBal === undefined && newBal === undefined) {
            prevBal = runningBalance;
            newBal = isStartingSet ? (adjustment.balanceSet ?? adjVal) : runningBalance + adjVal;
          } else if (prevBal === undefined && newBal !== undefined) {
            prevBal = isStartingSet ? 0 : newBal - adjVal;
          } else if (newBal === undefined && prevBal !== undefined) {
            newBal = isStartingSet ? (adjustment.balanceSet ?? adjVal) : prevBal + adjVal;
          }

          if (newBal !== undefined) {
            runningBalance = newBal;
          }

          history.push({
            type: isStartingSet ? "set_balance" : (adjustment.type || "adjustment"),
            date: adjustment.adjustedAt || new Date(),
            adjustedAt: adjustment.adjustedAt || new Date(),
            leaveType: adjustment.leaveType || "annual",
            action: isStartingSet ? "Set Balance" : (adjustment.type || "adjustment"),
            adjustment: adjVal,
            balanceSet: adjustment.balanceSet ?? newBal,
            previousBalance: prevBal,
            newBalance: newBal,
            reason: adjustment.reason || "-",
            adminId: adjustment.adminId || "admin",
            details: {
              adjustment: adjVal,
              balanceSet: adjustment.balanceSet ?? newBal,
              reason: adjustment.reason,
              adminId: adjustment.adminId,
              previousBalance: prevBal,
              newBalance: newBal,
              type: adjustment.type,
            },
            description: `Annual leave balance set to ${newBal ?? adjVal} days (previous: ${prevBal ?? 0} days)`,
          });
        });
      }
    });

    // Add distinct audit log entries that aren't already represented in balance adjustments
    auditLogs.forEach((log) => {
      const act = (log.action || "").toUpperCase();
      // Skip background recalculations and non-balance adjustments
      if (
        act.includes("RECALCULATE") ||
        act.includes("LOGIN") ||
        act.includes("PASSWORD") ||
        act.includes("ROLE") ||
        act.includes("CREATE")
      ) {
        return;
      }

      const daysVal = log.metadata?.days ?? log.metadata?.adjustment ?? 0;
      if (daysVal === 0 && !log.metadata?.previousBalance && !log.metadata?.newBalance) {
        return;
      }

      const logTime = new Date(log.timestamp || log.createdAt).getTime();
      const isDuplicate = history.some((h) => {
        const hTime = new Date(h.date || h.adjustedAt).getTime();
        const sameAmount = (h.adjustment ?? 0) === daysVal;
        return (
          Math.abs(hTime - logTime) < 60000 ||
          (sameAmount && Math.abs(hTime - logTime) < 300000)
        );
      });

      if (!isDuplicate) {
        const prevBal = log.metadata?.previousBalance;
        const newBal = log.metadata?.newBalance ?? (prevBal !== undefined ? prevBal + daysVal : undefined);
        history.push({
          type: log.metadata?.type || "adjustment",
          date: log.timestamp || log.createdAt || new Date(),
          adjustedAt: log.timestamp || log.createdAt || new Date(),
          leaveType: log.metadata?.leaveType || "annual",
          action: log.action,
          adjustment: daysVal,
          previousBalance: prevBal,
          newBalance: newBal,
          reason: log.metadata?.reason || log.action || "-",
          adminId: log.userId || log.metadata?.adminId || "admin",
          details: log.metadata,
          description: getAuditDescription(log),
        });
      }
    });

    // Sort oldest to newest to ensure running balances are continuous
    history.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBal = leaveBalances[0]?.balances?.annual?.baseAllowance || 16;
    history.forEach((item) => {
      const isStarting = item.type === "starting_balance_set";
      const adj = typeof item.adjustment === "number" ? item.adjustment : 0;
      if (item.previousBalance === undefined && item.newBalance === undefined) {
        item.previousBalance = runningBal;
        item.newBalance = isStarting ? adj : Math.max(0, runningBal + adj);
      } else if (item.previousBalance === undefined && item.newBalance !== undefined) {
        item.previousBalance = isStarting ? 0 : Math.max(0, item.newBalance - adj);
      } else if (item.newBalance === undefined && item.previousBalance !== undefined) {
        item.newBalance = isStarting ? adj : Math.max(0, item.previousBalance + adj);
      }
      if (item.details) {
        item.details.previousBalance = item.previousBalance;
        item.details.newBalance = item.newBalance;
      }
      runningBal = item.newBalance ?? runningBal;
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
