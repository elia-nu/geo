import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get real-time leave balance updates
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const department = url.searchParams.get("department");
    const includeNotifications =
      url.searchParams.get("includeNotifications") === "true";

    console.log(
      "Received employeeId parameter:",
      employeeId,
      "Type:",
      typeof employeeId
    );

    let empFilter = {};
    if (employeeId && employeeId !== "all") {
      empFilter._id = new ObjectId(employeeId);
    }

    // Get all matching employees
    const allEmployees = await db
      .collection("employees")
      .find(empFilter)
      .toArray();

    // Map all employees
    const employeeMap = {};
    allEmployees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        _id: emp._id.toString(),
        employeeId: emp.employeeId || emp.personalDetails?.employeeId || emp._id.toString(),
        name: emp.personalDetails?.name || emp.name,
        email: emp.personalDetails?.email || emp.email,
        department: emp.personalDetails?.department || emp.department,
        designation: emp.personalDetails?.designation || emp.designation,
        joiningDate: emp.personalDetails?.joiningDate || emp.joiningDate || emp.employmentDate,
        employmentHistory: emp.employmentHistory,
        createdAt: emp.createdAt,
        sex: emp.personalDetails?.sex || emp.sex || "M",
      };
    });

    let query = {};
    if (employeeId && employeeId !== "all") {
      query.employeeId = new ObjectId(employeeId);
    }

    let leaveBalances = await db
      .collection("leave_balances")
      .find(query)
      .toArray();

    const existingBalanceEmpIds = new Set(
      leaveBalances.map((b) => b.employeeId?.toString())
    );

    // Auto-create initial leave balances for any missing employees
    for (const emp of allEmployees) {
      if (!existingBalanceEmpIds.has(emp._id.toString())) {
        try {
          const initialBal = await createInitialLeaveBalance(db, emp);
          leaveBalances.push(initialBal);
          existingBalanceEmpIds.add(emp._id.toString());
        } catch (e) {
          console.warn("Failed to create initial leave balance for", emp.name, e);
        }
      }
    }

    // Enhance balances with employee details and real-time calculations
    const enhancedBalances = await Promise.all(
      leaveBalances.map(async (balance) => {
        const employee = employeeMap[balance.employeeId.toString()];
        if (!employee) return null;

        // Filter by department if specified
        if (department && employee.department !== department) {
          return null;
        }

        // Check if employment date needs to be updated
        let correctEmploymentDate;
        console.log("Employee data for date calculation:", {
          joiningDate: employee.joiningDate,
          employmentHistory: employee.employmentHistory?.[0]?.startDate,
          createdAt: employee.createdAt,
        });
        console.log("Full employee object keys:", Object.keys(employee));
        console.log(
          "Employee.joiningDate type:",
          typeof employee.joiningDate,
          "value:",
          employee.joiningDate
        );

        if (employee.joiningDate) {
          // joiningDate is in format 'YYYY-MM-DD', so we need to parse it correctly
          correctEmploymentDate = new Date(
            employee.joiningDate + "T00:00:00.000Z"
          );
          console.log(
            "Using joiningDate:",
            employee.joiningDate,
            "->",
            correctEmploymentDate
          );
        } else if (employee.employmentHistory?.[0]?.startDate) {
          correctEmploymentDate = new Date(
            employee.employmentHistory[0].startDate + "T00:00:00.000Z"
          );
          console.log(
            "Using employmentHistory startDate:",
            employee.employmentHistory[0].startDate,
            "->",
            correctEmploymentDate
          );
        } else {
          correctEmploymentDate = new Date(employee.createdAt);
          console.log(
            "Using createdAt:",
            employee.createdAt,
            "->",
            correctEmploymentDate
          );
        }

        if (
          new Date(balance.employmentDate).getTime() !==
          correctEmploymentDate.getTime()
        ) {
          console.log(
            "Updating employment date from",
            balance.employmentDate,
            "to",
            correctEmploymentDate
          );
          // Update the employment date in the balance
          balance.employmentDate = correctEmploymentDate;
          // Update in database
          await db
            .collection("leave_balances")
            .updateOne(
              { _id: balance._id },
              { $set: { employmentDate: correctEmploymentDate } }
            );
        }

        // Calculate real-time accruals
        console.log(
          "Calculating real-time accruals for balance:",
          balance.employeeName
        );
        console.log("Employment date from balance:", balance.employmentDate);
        const realTimeBalance = await calculateRealTimeAccruals(db, balance);
        console.log(
          "Real-time balance result:",
          realTimeBalance.yearsOfService
        );

        return {
          ...realTimeBalance,
          employee: employee,
          lastUpdated: new Date(),
        };
      })
    );

    // Filter out null results
    const validBalances = enhancedBalances.filter(
      (balance) => balance !== null
    );

    // Get notifications if requested
    let notifications = [];
    if (includeNotifications) {
      notifications = await getLeaveBalanceNotifications(db, validBalances);
    }

    // Serialize the data to ensure ObjectIds are converted to strings
    const serializedBalances = validBalances.map((balance) => ({
      ...balance,
      _id: balance._id.toString(),
      employeeId: balance.employeeId.toString(),
      employmentDate: balance.employmentDate,
      lastUpdated: balance.lastUpdated,
      lastCalculated: balance.lastCalculated,
      createdAt: balance.createdAt,
      updatedAt: balance.updatedAt,
    }));

    // If requesting a specific employee (not "all"), return the single balance object
    if (employeeId && employeeId !== "all" && serializedBalances.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          ...serializedBalances[0],
          notifications,
          lastUpdated: new Date(),
        },
      });
    }

    // For "all" employees or multiple employees, return the array structure
    return NextResponse.json({
      success: true,
      data: {
        balances: serializedBalances,
        notifications,
        totalEmployees: validBalances.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching real-time leave balances:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch real-time leave balances",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Update leave balance with real-time recalculation
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { employeeId, action, leaveType, days, reason, adminId } = data;

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: "Employee ID and action are required" },
        { status: 400 }
      );
    }

    // Get current leave balance
    let leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    if (!leaveBalance) {
      return NextResponse.json(
        { error: "Leave balance not found" },
        { status: 404 }
      );
    }

    // Perform the requested action
    let updatedBalance;
    switch (action) {
      case "recalculate":
        updatedBalance = await calculateRealTimeAccruals(db, leaveBalance);
        break;
      case "adjust":
        updatedBalance = await adjustLeaveBalance(
          db,
          leaveBalance,
          leaveType,
          days,
          reason,
          adminId
        );
        break;
      case "reset":
        updatedBalance = await resetLeaveBalance(db, leaveBalance, adminId);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Create audit log
    await createAuditLog({
      action: `LEAVE_BALANCE_${action.toUpperCase()}`,
      entityType: "leave_balance",
      entityId: leaveBalance._id.toString(),
      userId: adminId || employeeId,
      metadata: {
        action,
        leaveType,
        days,
        reason,
        employeeId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Leave balance ${action} completed successfully`,
      data: updatedBalance,
    });
  } catch (error) {
    console.error("Error updating leave balance:", error);
    return NextResponse.json(
      { error: "Failed to update leave balance", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate real-time accruals for standard 16 days annual leave
async function calculateRealTimeAccruals(db, leaveBalance) {
  const currentDate = new Date();
  const employmentDate = new Date(leaveBalance.employmentDate);
  const yearsOfService = Math.max(
    0,
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365.25)
  );

  // Get all approved and pending leave requests
  const leaveRequests = await db
    .collection("attendance_documents")
    .find({
      $or: [
        { employeeId: leaveBalance.employeeId },
        { employeeId: leaveBalance.employeeId.toString() },
      ],
      type: "leave",
    })
    .toArray();

  let usedDays = 0;
  let pendingDays = 0;
  leaveRequests.forEach((request) => {
    const days = calculateLeaveDays(request.startDate, request.endDate);
    if (request.status === "approved") {
      usedDays += days;
    } else if (request.status === "pending") {
      pendingDays += days;
    }
  });

  const available = Math.max(0, 16 - usedDays - pendingDays);

  const updatedBalances = {
    annual: {
      yearlyAllowance: 16,
      baseAllowance: 16,
      seniorityBonus: 0,
      totalEarned: 16,
      carriedForward: 0,
      expiredDays: 0,
      used: usedDays,
      pending: pendingDays,
      available,
      description: "Annual Leave",
      formula: "16 Days Standard Annual Leave",
      rolloverPolicy: "Rollover with 2-year postponement expiry limit",
      lastCalculated: currentDate,
    },
  };

  // Update database
  await db.collection("leave_balances").updateOne(
    { _id: leaveBalance._id },
    {
      $set: {
        balances: updatedBalances,
        yearsOfService: Math.floor(yearsOfService * 100) / 100,
        lastCalculated: currentDate,
        realTimeAccrual: true,
      },
    }
  );

  return {
    ...leaveBalance,
    balances: updatedBalances,
    yearsOfService: Math.floor(yearsOfService * 100) / 100,
    lastCalculated: currentDate,
    realTimeAccrual: true,
  };
}

// Helper function to adjust leave balance
async function adjustLeaveBalance(
  db,
  leaveBalance,
  leaveType,
  days,
  reason,
  adminId
) {
  if (!leaveType || days === undefined) {
    throw new Error("Leave type and days are required for adjustment");
  }

  const currentBalance = leaveBalance.balances[leaveType];
  if (!currentBalance) {
    throw new Error(`Leave type ${leaveType} not found`);
  }

  const newAvailable = currentBalance.available + days;
  if (newAvailable < 0) {
    throw new Error("Insufficient leave balance for this adjustment");
  }

  // Update balance
  const updateField = `balances.${leaveType}.available`;
  await db.collection("leave_balances").updateOne(
    { _id: leaveBalance._id },
    {
      $set: {
        [updateField]: newAvailable,
        updatedAt: new Date(),
      },
      $push: {
        adjustments: {
          leaveType,
          adjustment: days,
          reason,
          adminId,
          adjustedAt: new Date(),
        },
      },
    }
  );

  // Recalculate real-time accruals
  return await calculateRealTimeAccruals(db, leaveBalance);
}

// Helper function to reset leave balance
async function resetLeaveBalance(db, leaveBalance, adminId) {
  // Reset all balances to initial state
  const employmentDate = new Date(leaveBalance.employmentDate);
  const currentDate = new Date();
  const yearsOfService =
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365);

  const leaveEntitlements = {
    annual: {
      daysPerYear: 16,
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

  const resetBalances = {};
  Object.keys(leaveEntitlements).forEach((leaveType) => {
    const entitlement = leaveEntitlements[leaveType];
    const totalEarned = Math.floor(yearsOfService * entitlement.daysPerYear);
    const carriedForward = Math.min(
      entitlement.maxCarryForward,
      Math.max(0, totalEarned - entitlement.daysPerYear)
    );

    resetBalances[leaveType] = {
      totalEarned,
      carriedForward,
      available: totalEarned + carriedForward,
      used: 0,
      pending: 0,
      description: entitlement.description,
    };
  });

  await db.collection("leave_balances").updateOne(
    { _id: leaveBalance._id },
    {
      $set: {
        balances: resetBalances,
        updatedAt: new Date(),
        lastCalculated: currentDate,
      },
      $push: {
        adjustments: {
          leaveType: "all",
          adjustment: 0,
          reason: "Balance reset",
          adminId,
          adjustedAt: new Date(),
        },
      },
    }
  );

  return {
    ...leaveBalance,
    balances: resetBalances,
    lastCalculated: currentDate,
  };
}

async function getLeaveBalanceNotifications(db, balances) {
  const notifications = [];

  balances.forEach((balance) => {
    if (!balance || !balance.balances) return;
    const empName =
      balance.employee?.name || balance.employeeName || "Employee";

    Object.entries(balance.balances).forEach(([leaveType, leaveBalance]) => {
      if (!leaveBalance) return;
      const usagePercentage =
        ((leaveBalance.used || 0) /
          ((leaveBalance.used || 0) + (leaveBalance.available || 1))) *
        100;

      // Low balance warning
      if ((leaveBalance.available || 0) <= 2) {
        notifications.push({
          type: "warning",
          title: "Low Leave Balance",
          message: `${empName} has only ${leaveBalance.available} days of ${leaveType} leave remaining`,
          employeeId: balance.employeeId,
          leaveType,
          priority: "high",
          createdAt: new Date(),
        });
      }

      // High usage warning
      if (usagePercentage >= 80) {
        notifications.push({
          type: "info",
          title: "High Leave Usage",
          message: `${empName} has used ${usagePercentage.toFixed(
            1
          )}% of their ${leaveType} leave`,
          employeeId: balance.employeeId,
          leaveType,
          priority: "medium",
          createdAt: new Date(),
        });
      }

      // Pending leave requests
      if ((leaveBalance.pending || 0) > 0) {
        notifications.push({
          type: "pending",
          title: "Pending Leave Request",
          message: `${empName} has ${leaveBalance.pending} days of ${leaveType} leave pending approval`,
          employeeId: balance.employeeId,
          leaveType,
          priority: "medium",
          createdAt: new Date(),
        });
      }
    });
  });

  return notifications.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Helper functions (same as in main balances route)
function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1; // Default to 1 day if dates are missing

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Add 1 to include both start and end dates
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  const result = Math.max(1, daysDiff);

  console.log(
    `calculateLeaveDays: ${startDate} to ${endDate} = ${result} days`
  );

  return result;
}

// Helper function to create initial leave balance
async function createInitialLeaveBalance(db, employee) {
  // Use joiningDate if available, otherwise fall back to employmentHistory or createdAt
  let employmentDate;
  console.log("Creating initial leave balance - Employee data:", {
    joiningDate: employee.joiningDate,
    employmentHistory: employee.employmentHistory?.[0]?.startDate,
    createdAt: employee.createdAt,
  });

  if (employee.joiningDate) {
    // joiningDate is in format 'YYYY-MM-DD', so we need to parse it correctly
    employmentDate = new Date(employee.joiningDate + "T00:00:00.000Z");
    console.log(
      "Using joiningDate for initial balance:",
      employee.joiningDate,
      "->",
      employmentDate
    );
  } else if (employee.employmentHistory?.[0]?.startDate) {
    employmentDate = new Date(
      employee.employmentHistory[0].startDate + "T00:00:00.000Z"
    );
    console.log(
      "Using employmentHistory for initial balance:",
      employee.employmentHistory[0].startDate,
      "->",
      employmentDate
    );
  } else {
    employmentDate = new Date(employee.createdAt);
    console.log(
      "Using createdAt for initial balance:",
      employee.createdAt,
      "->",
      employmentDate
    );
  }
  const currentDate = new Date();

  const yearsOfService = Math.max(
    0,
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365.25)
  );
  const fullYears = Math.floor(yearsOfService);
  const yearlyAllowance =
    employee.annualLeaveDays ||
    employee.leaveBalance?.annual ||
    16 + Math.floor(fullYears / 2);

  const sex = employee.personalDetails?.sex || employee.sex || "M";

  const balances = {
    annual: {
      yearlyAllowance: 16,
      baseAllowance: 16,
      seniorityBonus: 0,
      totalEarned: 16,
      carriedForward: 0,
      expiredDays: 0,
      available: 16,
      used: 0,
      pending: 0,
      description: "Annual Leave",
      formula: "16 Days Standard Annual Leave",
      rolloverPolicy: "Rollover with 2-year postponement expiry limit",
    },
  };

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

function calculateYearlyAccrual(employmentDate, currentDate, daysPerYear) {
  const currentYear = currentDate.getFullYear();
  const employmentYear = employmentDate.getFullYear();

  if (employmentYear === currentYear) {
    const startOfYear = new Date(currentYear, 0, 1);
    const daysInYear =
      (currentDate - Math.max(employmentDate, startOfYear)) /
      (1000 * 60 * 60 * 24);
    const totalDaysInYear = 365;
    return Math.floor((daysInYear / totalDaysInYear) * daysPerYear);
  }

  return daysPerYear;
}
