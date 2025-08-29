import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get leave balances for an employee
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

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

    // Get or create leave balance record
    let leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    if (!leaveBalance) {
      // Create initial leave balance based on employment date
      leaveBalance = await createInitialLeaveBalance(db, employee);
    }

    // Calculate current balances and accruals
    const updatedBalance = await calculateLeaveBalances(
      db,
      employee,
      leaveBalance
    );

    return NextResponse.json({
      success: true,
      data: updatedBalance,
    });
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balances", message: error.message },
      { status: 500 }
    );
  }
}

// Update leave balance (for admin/HR use)
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { employeeId, leaveType, adjustment, reason, adminId } = data;

    if (!employeeId || !leaveType || !adjustment || !adminId) {
      return NextResponse.json(
        {
          error:
            "Employee ID, leave type, adjustment, and admin ID are required",
        },
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

    // Update the specific leave type balance
    const updateField = `balances.${leaveType}.available`;
    const newBalance = leaveBalance.balances[leaveType]?.available + adjustment;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: "Insufficient leave balance for this adjustment" },
        { status: 400 }
      );
    }

    // Update leave balance
    await db.collection("leave_balances").updateOne(
      { employeeId: new ObjectId(employeeId) },
      {
        $set: {
          [updateField]: newBalance,
          updatedAt: new Date(),
        },
        $push: {
          adjustments: {
            leaveType,
            adjustment,
            reason,
            adminId,
            adjustedAt: new Date(),
          },
        },
      }
    );

    // Get updated balance
    const updatedBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    return NextResponse.json({
      success: true,
      message: "Leave balance updated successfully",
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

// Helper function to create initial leave balance
async function createInitialLeaveBalance(db, employee) {
  const employmentDate = new Date(
    employee.employmentHistory?.[0]?.startDate || employee.createdAt
  );
  const currentDate = new Date();

  // Calculate years of service
  const yearsOfService =
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365);

  // Default leave entitlements (can be customized per company policy)
  const leaveEntitlements = {
    annual: {
      daysPerYear: 20,
      maxCarryForward: 5,
      description: "Annual Leave",
    },
    sick: {
      daysPerYear: 10,
      maxCarryForward: 0,
      description: "Sick Leave",
    },
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

// Helper function to calculate current leave balances
async function calculateLeaveBalances(db, employee, leaveBalance) {
  const currentDate = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

  // Get approved and pending leave requests for current year
  const leaveRequests = await db
    .collection("attendance_documents")
    .find({
      employeeId: employee._id,
      type: "leave",
      startDate: { $gte: startOfYear.toISOString().split("T")[0] },
    })
    .toArray();

  // Calculate used and pending days for each leave type
  const leaveTypeStats = {};

  leaveRequests.forEach((request) => {
    const leaveType = request.leaveType;
    if (!leaveTypeStats[leaveType]) {
      leaveTypeStats[leaveType] = { used: 0, pending: 0 };
    }

    const days = calculateLeaveDays(request.startDate, request.endDate);

    if (request.status === "approved") {
      leaveTypeStats[leaveType].used += days;
    } else if (request.status === "pending") {
      leaveTypeStats[leaveType].pending += days;
    }
  });

  // Update balances with current calculations
  const updatedBalances = {};
  Object.keys(leaveBalance.balances).forEach((leaveType) => {
    const currentBalance = leaveBalance.balances[leaveType];
    const stats = leaveTypeStats[leaveType] || { used: 0, pending: 0 };

    updatedBalances[leaveType] = {
      ...currentBalance,
      used: stats.used,
      pending: stats.pending,
      available: currentBalance.available - stats.used - stats.pending,
    };
  });

  return {
    ...leaveBalance,
    balances: updatedBalances,
    lastCalculated: currentDate,
  };
}

// Helper function to calculate number of working days between two dates
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
