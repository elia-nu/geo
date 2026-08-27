import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Calculate base + seniority allowance: 16 + floor(Years of Service / 2)
function getAnnualLeaveAllowance(yearsOfService) {
  const fullYears = Math.max(0, Math.floor(yearsOfService || 0));
  return 16 + Math.floor(fullYears / 2);
}

// Helper function to calculate working days between two dates
function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days++;
    }
  }

  return Math.max(1, days);
}

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

    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(employeeId) });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    let leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    if (!leaveBalance) {
      leaveBalance = await createInitialLeaveBalance(db, employee);
    }

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

// Update leave balance (for admin adjustment)
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { employeeId, leaveType = "annual", adjustment, reason, adminId } = data;

    if (!employeeId || !adjustment || !adminId) {
      return NextResponse.json(
        {
          error: "Employee ID, adjustment, and admin ID are required",
        },
        { status: 400 }
      );
    }

    let leaveBalance = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    if (!leaveBalance) {
      return NextResponse.json(
        { error: "Leave balance not found" },
        { status: 404 }
      );
    }

    const currentAnnual = leaveBalance.balances?.annual || { available: 16 };
    const newAvailable = Math.max(0, (currentAnnual.available || 0) + adjustment);

    await db.collection("leave_balances").updateOne(
      { employeeId: new ObjectId(employeeId) },
      {
        $set: {
          "balances.annual.available": newAvailable,
          updatedAt: new Date(),
        },
        $push: {
          adjustments: {
            leaveType: "annual",
            adjustment,
            reason: reason || "Manual Admin Adjustment",
            adminId,
            adjustedAt: new Date(),
          },
        },
      }
    );

    const updated = await db
      .collection("leave_balances")
      .findOne({ employeeId: new ObjectId(employeeId) });

    return NextResponse.json({
      success: true,
      message: "Annual leave balance adjusted successfully",
      data: updated,
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
  let employmentDate;
  if (employee.joiningDate) {
    employmentDate = new Date(employee.joiningDate + "T00:00:00.000Z");
  } else if (employee.employmentHistory?.[0]?.startDate) {
    employmentDate = new Date(
      employee.employmentHistory[0].startDate + "T00:00:00.000Z"
    );
  } else {
    employmentDate = new Date(employee.createdAt || Date.now());
  }

  const currentDate = new Date();
  const yearsOfService = Math.max(
    0,
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365.25)
  );

  const yearlyAllowance = getAnnualLeaveAllowance(yearsOfService);

  const balances = {
    annual: {
      yearlyAllowance,
      baseAllowance: 16,
      seniorityBonus: Math.floor(Math.floor(yearsOfService) / 2),
      totalEarned: yearlyAllowance,
      carriedForward: 0,
      expiredDays: 0,
      available: yearlyAllowance,
      used: 0,
      pending: 0,
      description: "Annual Leave",
      formula: "16 + floor(Years of Service / 2)",
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

// Helper function to calculate leave balances with seniority accrual & 2-year rollover limit
async function calculateLeaveBalances(db, employee, leaveBalance) {
  const currentDate = new Date();
  const employmentDate = new Date(
    employee.joiningDate
      ? employee.joiningDate + "T00:00:00.000Z"
      : leaveBalance.employmentDate || employee.createdAt || Date.now()
  );

  const yearsOfService = Math.max(
    0,
    (currentDate - employmentDate) / (1000 * 60 * 60 * 24 * 365.25)
  );
  const fullYears = Math.floor(yearsOfService);

  // Current year's allowance by formula: 16 + floor(years / 2)
  const currentYearAllowance = getAnnualLeaveAllowance(yearsOfService);
  const seniorityBonus = Math.floor(fullYears / 2);

  // Get all approved and pending leave requests
  const leaveRequests = await db
    .collection("attendance_documents")
    .find({
      $or: [
        { employeeId: employee._id },
        { employeeId: employee._id.toString() },
      ],
      type: "leave",
    })
    .toArray();

  let usedDays = 0;
  let pendingDays = 0;

  leaveRequests.forEach((req) => {
    const days = calculateLeaveDays(req.startDate, req.endDate);
    if (req.status === "approved") {
      usedDays += days;
    } else if (req.status === "pending") {
      pendingDays += days;
    }
  });

  // Calculate Rollover & 2-Year Expiration:
  // Build year-by-year allowance for active service years (up to 3 years back: Y-2, Y-1, Y_current)
  let totalCumulativeEarned = 0;
  let expiredDays = 0;

  if (fullYears === 0) {
    totalCumulativeEarned = currentYearAllowance;
  } else {
    // Accumulate past years allowances
    for (let yr = 0; yr <= fullYears; yr++) {
      const yrAllowance = getAnnualLeaveAllowance(yr);
      // If accrued more than 2 consecutive years ago (yr < fullYears - 2), check expiration
      if (yr < fullYears - 2) {
        // Postponed for > 2 consecutive years: any unconsumed portion from that distant year is expired
        // Assumes standard consumption
        expiredDays += Math.max(0, yrAllowance - Math.max(0, usedDays / Math.max(1, fullYears)));
      } else {
        totalCumulativeEarned += yrAllowance;
      }
    }
  }

  // Carried forward from previous 2 consecutive years
  const carriedForward = fullYears > 0 ? Math.max(0, totalCumulativeEarned - currentYearAllowance) : 0;
  const availableDays = Math.max(0, totalCumulativeEarned - usedDays - pendingDays);

  const updatedBalances = {
    annual: {
      yearlyAllowance: currentYearAllowance,
      baseAllowance: 16,
      seniorityBonus,
      totalEarned: totalCumulativeEarned,
      carriedForward,
      expiredDays: Math.floor(expiredDays),
      used: usedDays,
      pending: pendingDays,
      available: availableDays,
      description: "Annual Leave",
      formula: "16 + floor(Years of Service / 2)",
      rolloverPolicy: "No reset; rolled over with 2-year postponement expiration limit",
      lastCalculated: currentDate,
    },
  };

  await db.collection("leave_balances").updateOne(
    { employeeId: employee._id },
    {
      $set: {
        balances: updatedBalances,
        yearsOfService: Math.floor(yearsOfService * 100) / 100,
        lastCalculated: currentDate,
        employmentDate,
      },
    }
  );

  return {
    ...leaveBalance,
    balances: updatedBalances,
    yearsOfService: Math.floor(yearsOfService * 100) / 100,
    employmentDate,
    lastCalculated: currentDate,
  };
}
