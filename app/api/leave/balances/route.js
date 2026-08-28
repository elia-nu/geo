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

// Get leave balances for an employee or all employees
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const department = url.searchParams.get("department");

    if (employeeId && employeeId !== "all") {
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
    }

    // Fetch for all employees
    let empQuery = {};
    if (department) {
      empQuery.$or = [
        { department },
        { "personalDetails.department": department },
      ];
    }

    const allEmployees = await db
      .collection("employees")
      .find(empQuery)
      .toArray();

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

    const leaveBalances = await db
      .collection("leave_balances")
      .find({})
      .toArray();

    const existingBalanceEmpIds = new Set(
      leaveBalances.map((b) => b.employeeId?.toString())
    );

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

    const calculatedBalances = await Promise.all(
      leaveBalances.map(async (bal) => {
        const emp = employeeMap[bal.employeeId?.toString()];
        if (!emp) return null;
        if (department && emp.department !== department) return null;

        const updated = await calculateLeaveBalances(db, emp, bal);
        return {
          ...updated,
          _id: bal._id?.toString(),
          employeeId: bal.employeeId?.toString(),
          employee: emp,
        };
      })
    );

    const validBalances = calculatedBalances.filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        balances: validBalances,
        total: validBalances.length,
      },
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
  const availableDays = Math.max(0, 16 - usedDays - pendingDays);

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
      available: availableDays,
      description: "Annual Leave",
      formula: "16 Days Standard Annual Leave",
      rolloverPolicy: "Rollover with 2-year postponement expiry limit",
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
