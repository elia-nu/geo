import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import {
  calculateWorkingDays,
  isHoliday,
  isWorkingDay,
  getHolidaysForYear,
} from "../../../utils/ethiopianCalendar";

// Ethiopian Income Tax Calculation - Range-Based System
// Tax = (Gross Salary × Tax Rate) - Deduction Amount
const calculateIncomeTax = (grossSalary) => {
  const monthlyGross = grossSalary;

  if (monthlyGross <= 2000) {
    // Range 1: 0-2,000 -> 0% tax, 0 deduction
    return 0;
  } else if (monthlyGross <= 4000) {
    // Range 2: 2,001-4,000 -> Tax = (Gross × 15%) - 300
    return Math.max(0, monthlyGross * 0.15 - 300);
  } else if (monthlyGross <= 7000) {
    // Range 3: 4,001-7,000 -> Tax = (Gross × 20%) - 500
    return Math.max(0, monthlyGross * 0.2 - 500);
  } else if (monthlyGross <= 10000) {
    // Range 4: 7,001-10,000 -> Tax = (Gross × 25%) - 850
    return Math.max(0, monthlyGross * 0.25 - 850);
  } else if (monthlyGross <= 14000) {
    // Range 5: 10,001-14,000 -> Tax = (Gross × 30%) - 1,350
    return Math.max(0, monthlyGross * 0.3 - 1350);
  } else {
    // Range 6: Over 14,000 -> Tax = (Gross × 35%) - 2,050
    return Math.max(0, monthlyGross * 0.35 - 2050);
  }
};

// Calculate payroll for all employees
export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { month, year, employeeIds } = body;

    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    console.log(`Calculating payroll for ${targetMonth}/${targetYear}`);

    // Calculate working days for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of the month
    const totalWorkingDays = calculateWorkingDays(startDate, endDate);
    const totalDaysInMonth = endDate.getDate();
    const holidays = getHolidaysForYear(targetYear).filter(
      (holiday) =>
        holiday.date.getMonth() === targetMonth - 1 &&
        holiday.date.getFullYear() === targetYear
    );

    console.log(
      `Working days in ${targetMonth}/${targetYear}: ${totalWorkingDays}/${totalDaysInMonth}`
    );
    console.log(`Holidays in month: ${holidays.length}`);

    // Build employee query
    let employeeQuery = { status: "active" };
    if (employeeIds && employeeIds.length > 0) {
      employeeQuery._id = { $in: employeeIds.map((id) => new ObjectId(id)) };
    }

    // Get all active employees
    const employees = await db
      .collection("employees")
      .find(employeeQuery)
      .toArray();
    console.log(`Found ${employees.length} employees for payroll calculation`);

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          payrollData: [],
          summary: {
            totalEmployees: 0,
            totalGross: 0,
            totalEmployeePension: 0,
            totalEmployerPension: 0,
            totalIncomeTax: 0,
            totalTransportAllowance: 0,
            totalNet: 0,
          },
          period: { month: targetMonth, year: targetYear },
        },
      });
    }

    // Preload attendance for the month for these employees
    const employeeIdSet = new Set(employees.map((e) => e._id.toString()));
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find({
        date: {
          $gte: startDate.toISOString().split("T")[0],
          $lte: endDate.toISOString().split("T")[0],
        },
      })
      .toArray();

    // Preload pending/denied leave requests overlapping period
    const leaveDocs = await db
      .collection("attendance_documents")
      .find({
        type: "leave",
        status: { $in: ["pending", "denied", "rejected"] },
        $or: [
          {
            startDate: { $lte: endDate.toISOString().split("T")[0] },
            endDate: { $gte: startDate.toISOString().split("T")[0] },
          },
          {
            startDate: {
              $gte: startDate.toISOString().split("T")[0],
              $lte: endDate.toISOString().split("T")[0],
            },
          },
        ],
      })
      .toArray();

    // Build quick lookup maps
    const attendanceByEmpDate = new Map(); // key: empId|dateISO -> record
    attendanceRecords.forEach((rec) => {
      const empKey =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId);
      const key = `${empKey}|${rec.date}`;
      attendanceByEmpDate.set(key, rec);
    });

    const leavesByEmp = new Map(); // key: empId -> array of leaves
    leaveDocs.forEach((doc) => {
      const empId = doc.employeeId?.toString();
      if (!empId) return;
      if (!leavesByEmp.has(empId)) leavesByEmp.set(empId, []);
      leavesByEmp.get(empId).push(doc);
    });

    // Calculate payroll for each employee
    const payrollData = employees.map((employee) => {
      // Get salary information
      const grossSalary = parseFloat(
        employee.grossSalary || employee.baseSalary || 0
      );
      const transportAllowance = parseFloat(employee.transportAllowance || 0);

      // Compute deduction days based on pending/denied leave with no attendance
      let deductionDays = 0;
      const deductionDates = [];
      const empIdStr = employee._id.toString();
      const empLeaves = leavesByEmp.get(empIdStr) || [];

      // Iterate through each day of month
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const dateIso = d.toISOString().split("T")[0];
        // Note: We deduct for any date with a pending/denied/rejected leave and no attendance,
        // regardless of weekend/holiday status, per user requirement.
        const attKey = `${empIdStr}|${dateIso}`;
        const att = attendanceByEmpDate.get(attKey);
        const hasAttendance = att && att.checkInTime;
        if (hasAttendance) continue;

        // Check if there is a pending/denied leave covering this date
        const hasPendOrDeniedLeave = empLeaves.some((lv) => {
          const s = new Date(lv.startDate);
          const e = new Date(lv.endDate);
          return new Date(dateIso) >= s && new Date(dateIso) <= e;
        });
        if (hasPendOrDeniedLeave) {
          deductionDays += 1;
          deductionDates.push(dateIso);
        }
      }

      // Apply deduction from gross based on working day rate
      const dailyRate =
        totalWorkingDays > 0 ? grossSalary / totalWorkingDays : 0;
      const deductionAmount = dailyRate * deductionDays;
      const adjustedGross = Math.max(0, grossSalary - deductionAmount);

      // Calculate deductions and contributions on adjusted gross
      const employeePension = adjustedGross * 0.07; // 7% employee contribution
      const employerPension = adjustedGross * 0.11; // 11% employer contribution
      const incomeTax = calculateIncomeTax(adjustedGross);

      // Calculate net salary
      const netSalary =
        adjustedGross - (incomeTax + employeePension) + transportAllowance;

      return {
        employeeId: employee._id.toString(),
        name: employee.personalDetails?.name || employee.name || "Unknown",
        position:
          employee.personalDetails?.designation ||
          employee.designation ||
          "Unknown",
        department:
          employee.personalDetails?.department ||
          employee.department ||
          "Unknown",
        grossSalary,
        adjustedGross,
        deductionDays,
        deductionAmount,
        deductionDates,
        transportAllowance,
        employeePension,
        employerPension,
        incomeTax,
        netSalary,
        // Additional info
        email: employee.personalDetails?.email || employee.email,
        joiningDate:
          employee.joiningDate || employee.personalDetails?.joiningDate,
        // Ethiopian calendar info
        workingDays: totalWorkingDays,
        totalDays: totalDaysInMonth,
        holidaysInMonth: holidays.length,
      };
    });

    // Calculate summary totals
    const summary = payrollData.reduce(
      (acc, employee) => {
        acc.totalGross += employee.grossSalary;
        acc.totalTransportAllowance += employee.transportAllowance;
        acc.totalEmployeePension += employee.employeePension;
        acc.totalEmployerPension += employee.employerPension;
        acc.totalIncomeTax += employee.incomeTax;
        acc.totalNet += employee.netSalary;
        return acc;
      },
      {
        totalEmployees: payrollData.length,
        totalGross: 0,
        totalTransportAllowance: 0,
        totalEmployeePension: 0,
        totalEmployerPension: 0,
        totalIncomeTax: 0,
        totalNet: 0,
      }
    );

    // Round all amounts to 2 decimal places
    payrollData.forEach((employee) => {
      employee.grossSalary = Math.round(employee.grossSalary * 100) / 100;
      employee.transportAllowance =
        Math.round(employee.transportAllowance * 100) / 100;
      employee.employeePension =
        Math.round(employee.employeePension * 100) / 100;
      employee.employerPension =
        Math.round(employee.employerPension * 100) / 100;
      employee.incomeTax = Math.round(employee.incomeTax * 100) / 100;
      employee.netSalary = Math.round(employee.netSalary * 100) / 100;
    });

    // Round summary totals
    Object.keys(summary).forEach((key) => {
      if (typeof summary[key] === "number") {
        summary[key] = Math.round(summary[key] * 100) / 100;
      }
    });

    console.log(
      `Payroll calculation completed for ${payrollData.length} employees`
    );
    console.log(`Total gross salary: ${summary.totalGross}`);
    console.log(`Total net salary: ${summary.totalNet}`);

    return NextResponse.json({
      success: true,
      data: {
        payrollData,
        summary,
        period: { month: targetMonth, year: targetYear },
        calculatedAt: new Date().toISOString(),
        // Ethiopian calendar info
        workingDays: totalWorkingDays,
        totalDays: totalDaysInMonth,
        holidays: holidays.map((holiday) => ({
          date: holiday.date.toISOString(),
          name: holiday.name,
          nameAmharic: holiday.nameAmharic,
          type: holiday.type,
        })),
      },
    });
  } catch (error) {
    console.error("Error calculating payroll:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate payroll",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Get payroll calculation for a specific period
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const employeeId = url.searchParams.get("employeeId");

    // Default to current month/year if not provided
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Calculate working days for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of the month
    const totalWorkingDays = calculateWorkingDays(startDate, endDate);
    const totalDaysInMonth = endDate.getDate();
    const holidays = getHolidaysForYear(targetYear).filter(
      (holiday) =>
        holiday.date.getMonth() === targetMonth - 1 &&
        holiday.date.getFullYear() === targetYear
    );

    // Build employee query
    let employeeQuery = { status: "active" };
    if (employeeId) {
      employeeQuery._id = new ObjectId(employeeId);
    }

    // Get employees
    const employees = await db
      .collection("employees")
      .find(employeeQuery)
      .toArray();

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          payrollData: [],
          summary: {
            totalEmployees: 0,
            totalGross: 0,
            totalEmployeePension: 0,
            totalEmployerPension: 0,
            totalIncomeTax: 0,
            totalTransportAllowance: 0,
            totalNet: 0,
          },
          period: { month: targetMonth, year: targetYear },
        },
      });
    }

    // Calculate payroll for each employee
    const payrollData = employees.map((employee) => {
      const grossSalary = parseFloat(
        employee.grossSalary || employee.baseSalary || 0
      );
      const transportAllowance = parseFloat(employee.transportAllowance || 0);
      const employeePension = grossSalary * 0.07;
      const employerPension = grossSalary * 0.11;
      const incomeTax = calculateIncomeTax(grossSalary);
      const netSalary =
        grossSalary - (incomeTax + employeePension) + transportAllowance;

      return {
        employeeId: employee._id.toString(),
        name: employee.personalDetails?.name || employee.name || "Unknown",
        position:
          employee.personalDetails?.designation ||
          employee.designation ||
          "Unknown",
        department:
          employee.personalDetails?.department ||
          employee.department ||
          "Unknown",
        grossSalary: Math.round(grossSalary * 100) / 100,
        transportAllowance: Math.round(transportAllowance * 100) / 100,
        employeePension: Math.round(employeePension * 100) / 100,
        employerPension: Math.round(employerPension * 100) / 100,
        incomeTax: Math.round(incomeTax * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        email: employee.personalDetails?.email || employee.email,
        joiningDate:
          employee.joiningDate || employee.personalDetails?.joiningDate,
        // Ethiopian calendar info
        workingDays: totalWorkingDays,
        totalDays: totalDaysInMonth,
        holidaysInMonth: holidays.length,
      };
    });

    // Calculate summary
    const summary = payrollData.reduce(
      (acc, employee) => {
        acc.totalGross += employee.grossSalary;
        acc.totalTransportAllowance += employee.transportAllowance;
        acc.totalEmployeePension += employee.employeePension;
        acc.totalEmployerPension += employee.employerPension;
        acc.totalIncomeTax += employee.incomeTax;
        acc.totalNet += employee.netSalary;
        return acc;
      },
      {
        totalEmployees: payrollData.length,
        totalGross: 0,
        totalTransportAllowance: 0,
        totalEmployeePension: 0,
        totalEmployerPension: 0,
        totalIncomeTax: 0,
        totalNet: 0,
      }
    );

    // Round summary totals
    Object.keys(summary).forEach((key) => {
      if (typeof summary[key] === "number") {
        summary[key] = Math.round(summary[key] * 100) / 100;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        payrollData,
        summary,
        period: { month: targetMonth, year: targetYear },
        calculatedAt: new Date().toISOString(),
        // Ethiopian calendar info
        workingDays: totalWorkingDays,
        totalDays: totalDaysInMonth,
        holidays: holidays.map((holiday) => ({
          date: holiday.date.toISOString(),
          name: holiday.name,
          nameAmharic: holiday.nameAmharic,
          type: holiday.type,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching payroll:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payroll",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
