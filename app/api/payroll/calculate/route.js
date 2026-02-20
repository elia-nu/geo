import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import {
  calculateWorkingDays,
  isHoliday,
  isWorkingDay,
  getHolidaysForYear,
  getHolidaysForMonth,
  calculateWorkingDaysExcludingHolidays,
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

    // Calculate working days for the month (UTC-safe month bounds)
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0)); // Last day of the month UTC
    // Build holidays set for the selected month using the same source as the calendar API
    const holidayIsoSet = new Set();
    try {
      const origin = new URL(request.url).origin;
      const apiUrl = `${origin}/api/ethiopian-calendar?action=holidays&year=${targetYear}&month=${targetMonth}`;
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list = json?.data?.holidays || [];
        list.forEach((h) => {
          try {
            const iso = (h?.date || "").slice(0, 10);
            if (!iso) return;
            holidayIsoSet.add(iso);
          } catch {}
        });
      }
    } catch {}

    // Absolute fallback: compute holidays via utils
    if (holidayIsoSet.size === 0) {
      const monthHolidays = getHolidaysForMonth(targetYear, targetMonth) || [];
      monthHolidays.forEach((h) => {
        const d = h.date instanceof Date ? h.date : new Date(h.date);
        const iso = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        )
          .toISOString()
          .slice(0, 10);
        holidayIsoSet.add(iso);
      });
    }

    // Compute working days for the selected month using LOCAL dates and integrated holiday check
    const startLocalForCount = new Date(targetYear, targetMonth - 1, 1);
    const endLocalForCount = new Date(targetYear, targetMonth, 0);
    let totalWorkingDays = 0; // working days in the full month
    let workingDaysSoFar = 0; // working days from the 1st up to (and including) today
    const todayLocalForCount = new Date();
    todayLocalForCount.setHours(0, 0, 0, 0);

    for (
      let t = startLocalForCount.getTime();
      t <= endLocalForCount.getTime();
      t += 24 * 60 * 60 * 1000
    ) {
      const dLocal = new Date(t);
      const hol = isHoliday(dLocal);
      const isHol =
        hol === true || (hol && (hol.isHoliday || hol.name || hol.type));

      // Business rule: no weekend breaks. Every calendar day is a working day
      // except official holidays.
      if (!isHol) {
        totalWorkingDays += 1;
        if (dLocal <= todayLocalForCount) {
          workingDaysSoFar += 1;
        }
      }
    }
    // Number of calendar days in the month (28, 29, 30, or 31)
    const totalDaysInMonth = endLocalForCount.getDate();

    try {
      const origin = new URL(request.url).origin;
      const apiUrl = `${origin}/api/ethiopian-calendar?action=holidays&year=${targetYear}&month=${targetMonth}`;
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const list = json?.data?.holidays || [];
        list.forEach((h) => {
          try {
            const iso = (h?.date || "").slice(0, 10);
            if (!iso) return;
            holidayIsoSet.add(iso);
          } catch {}
        });
      }
    } catch {}

    // Absolute fallback: if API returned none, derive with isHoliday() day-by-day
    if (holidayIsoSet.size === 0) {
      const dayMs = 24 * 60 * 60 * 1000;
      const startLocal = new Date(targetYear, targetMonth - 1, 1);
      const endLocal = new Date(targetYear, targetMonth, 0);
      for (let t = startLocal.getTime(); t <= endLocal.getTime(); t += dayMs) {
        const dLocal = new Date(t);
        const iso = new Date(
          dLocal.getFullYear(),
          dLocal.getMonth(),
          dLocal.getDate()
        )
          .toISOString()
          .slice(0, 10);
        const h = isHoliday(dLocal);
        const isHol = h === true || (h && (h.isHoliday || h.name || h.type));
        if (isHol) holidayIsoSet.add(iso);
      }
    }

    // When no holidays were found via API/set: working days = all days in month (28–31).
    // Override only so working days = days in month, not a fixed 30.
    if (holidayIsoSet.size === 0) {
      totalWorkingDays = totalDaysInMonth;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sameMonth =
        today.getFullYear() === targetYear &&
        today.getMonth() === targetMonth - 1;

      if (today < startLocalForCount) {
        workingDaysSoFar = 0;
      } else if (today > endLocalForCount || !sameMonth) {
        workingDaysSoFar = totalDaysInMonth;
      } else {
        const dayOfMonth = today.getDate();
        workingDaysSoFar = Math.min(dayOfMonth, totalDaysInMonth);
      }
    }
    const holidays = Array.from(holidayIsoSet).map((iso) => ({
      date: new Date(`${iso}T00:00:00Z`),
      name: "Holiday",
    }));

    console.log(
      `Working days in ${targetMonth}/${targetYear}: ${totalWorkingDays}/${totalDaysInMonth}`
    );
    console.log(`Holidays in month: ${holidayIsoSet.size}`);

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

    // Filter employees to only those who existed during the selected period.
    // If an employee's joiningDate is after the period end, we exclude them
    // from this month's payroll.
    const employeesForPeriod = employees.filter((employee) => {
      const jdStr =
        employee.joiningDate || employee.personalDetails?.joiningDate;
      if (!jdStr) return true;
      const jd = new Date(`${jdStr}T00:00:00Z`);
      return jd <= endDate;
    });

    if (employeesForPeriod.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          payrollData: [],
          summary: {
            totalEmployees: 0,
            totalGross: 0,
            totalSalary: 0,
            totalEmployeePension: 0,
            totalEmployerPension: 0,
            totalIncomeTax: 0,
            totalTransportAllowance: 0,
            totalTelephoneAllowance: 0,
            totalPosAllowance: 0,
            totalNet: 0,
          },
          period: { month: targetMonth, year: targetYear },
        },
      });
    }

    // Preload attendance for the month for these employees
    const employeeIdSet = new Set(
      employeesForPeriod.map((e) => e._id.toString())
    );
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find({
        date: {
          $gte: startDate.toISOString().slice(0, 10),
          $lte: endDate.toISOString().slice(0, 10),
        },
      })
      .toArray();

    // Preload pending/denied absence/leave requests overlapping period
    const leaveDocs = await db
      .collection("attendance_documents")
      .find({
        type: { $in: ["leave", "absence"] },
        status: { $in: ["pending", "denied", "rejected"] },
        $or: [
          {
            startDate: { $lte: endDate.toISOString().slice(0, 10) },
            endDate: { $gte: startDate.toISOString().slice(0, 10) },
          },
          {
            startDate: {
              $gte: startDate.toISOString().slice(0, 10),
              $lte: endDate.toISOString().slice(0, 10),
            },
          },
        ],
      })
      .toArray();

    // Preload approved absence/leave overlapping period (exclude from deductions)
    const approvedLeaveDocs = await db
      .collection("attendance_documents")
      .find({
        type: { $in: ["leave", "absence"] },
        status: "approved",
        $or: [
          {
            startDate: { $lte: endDate.toISOString().slice(0, 10) },
            endDate: { $gte: startDate.toISOString().slice(0, 10) },
          },
          {
            startDate: {
              $gte: startDate.toISOString().slice(0, 10),
              $lte: endDate.toISOString().slice(0, 10),
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

    const approvedLeavesByEmp = new Map(); // key: empId -> array of approved leaves
    approvedLeaveDocs.forEach((doc) => {
      const empId = doc.employeeId?.toString();
      if (!empId) return;
      if (!approvedLeavesByEmp.has(empId)) approvedLeavesByEmp.set(empId, []);
      approvedLeavesByEmp.get(empId).push(doc);
    });

    // Calculate payroll for each employee
    const payrollData = employeesForPeriod.map((employee) => {
      // Get salary information
      const grossSalary = parseFloat(
        employee.grossSalary || employee.baseSalary || 0
      );
      const transportAllowance = parseFloat(
        employee.transportAllowance ?? employee.personalDetails?.transportAllowance ?? 0
      );
      const telephoneAllowance = parseFloat(
        employee.telephoneAllowance ?? employee.personalDetails?.telephoneAllowance ?? 0
      );
      const posAllowance = parseFloat(
        employee.posAllowance ?? employee.personalDetails?.posAllowance ?? 0
      );

      // Compute deduction days based on pending/denied leave with no attendance
      let deductionDays = 0;
      const deductionDates = [];
      const empIdStr = employee._id.toString();
      const empLeaves = leavesByEmp.get(empIdStr) || [];

      // Iterate through each day of month (from joiningDate or month start, up to today)
      const todayIso = new Date().toISOString().slice(0, 10);
      const joining = employee.joiningDate
        ? new Date(`${employee.joiningDate}T00:00:00Z`)
        : null;
      const utcStart = startDate; // already UTC
      const iterStartUtc = joining && joining > utcStart ? joining : utcStart;
      for (
        let t = iterStartUtc.getTime();
        t <= endDate.getTime();
        t += 24 * 60 * 60 * 1000
      ) {
        const dateIso = new Date(t).toISOString().slice(0, 10);
        // Skip future dates beyond 'today'
        if (dateIso > todayIso) {
          if (
            employee.name?.toLowerCase().includes("mamo elias") ||
            empIdStr === "68e564a00d8e863db2a9b421"
          ) {
            console.log(
              "[payroll][debug-day]",
              employee.name,
              dateIso,
              "skip: future date"
            );
          }
          continue;
        }
        const attKey = `${empIdStr}|${dateIso}`;
        const att = attendanceByEmpDate.get(attKey);
        const hasAttendance = att && att.checkInTime;
        const approvalStatus = att?.adminApproval?.status;

        // Determine if this calendar day is a \"working\" day for payroll:
        // no weekend logic; any non-holiday calendar day counts.
        const dUtc = new Date(`${dateIso}T00:00:00Z`);
        const dLocalCheck = new Date(
          dUtc.getUTCFullYear(),
          dUtc.getUTCMonth(),
          dUtc.getUTCDate()
        );
        const holInfo = isHoliday(dLocalCheck);
        const isHolidayDay =
          holidayIsoSet.has(dateIso) || (holInfo && holInfo.isHoliday);
        const isPayrollWorkingDay = !isHolidayDay;

        // NEW RULE:
        // For an employee to have a working day, they must have an *approved* attendance.
        // Any attendance that is not explicitly approved is treated as absence.
        if (hasAttendance) {
          if (approvalStatus !== "approved") {
            // Attendance exists but not approved (pending / rejected / denied / other) → absence
            if (isPayrollWorkingDay) {
              deductionDays += 1;
              deductionDates.push(dateIso);
            }
            continue;
          }

          // Approved attendance exists:
          // If check-in without check-out, still treat as full-day absence.
          if (att.checkInTime && !att.checkOutTime) {
            if (isPayrollWorkingDay) {
              deductionDays += 1;
              deductionDates.push(dateIso);
            }
            continue;
          }

          // Approved and complete attendance → counted as worked day, no deduction
          continue;
        }

        // If there is an approved leave covering this date, skip deduction
        const hasApprovedLeave = (approvedLeavesByEmp.get(empIdStr) || []).some(
          (lv) => {
            const s = new Date(`${lv.startDate}T00:00:00Z`);
            const e = new Date(`${lv.endDate}T00:00:00Z`);
            return new Date(dateIso) >= s && new Date(dateIso) <= e;
          }
        );
        if (hasApprovedLeave) {
          continue;
        }

        // Check if there is a pending/denied/rejected leave covering this date
        const hasPendOrDeniedLeave = empLeaves.some((lv) => {
          const s = new Date(`${lv.startDate}T00:00:00Z`);
          const e = new Date(`${lv.endDate}T00:00:00Z`);
          return new Date(dateIso) >= s && new Date(dateIso) <= e;
        });
        if (hasPendOrDeniedLeave) {
          if (isPayrollWorkingDay) {
            deductionDays += 1;
            deductionDates.push(dateIso);
          }
          continue;
        }

        // Otherwise, pure absence: deduct only on working (non-holiday) days
        if (isPayrollWorkingDay) {
          deductionDays += 1;
          deductionDates.push(dateIso);
        }
      }

      // Salary = (Basic Salary / 30) * No. of working days (use same "so far" days as UI column)
      const noOfWorkingDays = Math.max(
        0,
        (workingDaysSoFar || 0) - (deductionDays || 0)
      );
      const salary =
        (grossSalary / 30) * noOfWorkingDays;

      // Calculate deductions and contributions from Basic Salary (grossSalary)
      const employeePension = grossSalary * 0.07; // 7% employee contribution
      const employerPension = grossSalary * 0.11; // 11% employer contribution
      // Income tax is calculated from Taxable Income (Salary + overtime; overtime is 0 on backend)
      const taxableIncome = salary;
      const incomeTax = calculateIncomeTax(taxableIncome);

      // Net salary from Salary (all allowances added to net)
      const totalAllowances =
        transportAllowance + telephoneAllowance + posAllowance;
      const netSalary =
        salary - (incomeTax + employeePension) + totalAllowances;

      const result = {
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
        grossSalary, // displayed as "Basic Salary"
        salary,
        taxableIncome,
        deductionDays,
        deductionDates,
        transportAllowance,
        telephoneAllowance,
        posAllowance,
        employeePension,
        employerPension,
        incomeTax,
        netSalary,
        // Additional info
        email: employee.personalDetails?.email || employee.email,
        joiningDate:
          employee.joiningDate || employee.personalDetails?.joiningDate,
        // Ethiopian calendar info
        // For per-employee stats and the \"No. of Working Days\" column, we show
        // working days only up to *today* so future days are not counted as worked.
        workingDays: workingDaysSoFar,
        totalDays: totalDaysInMonth,
        holidaysInMonth: holidays.length,
      };

      return result;
    });

    // Calculate summary totals (totalGross = sum of Basic Salary; totalSalary = sum of Salary)
    const summary = payrollData.reduce(
      (acc, employee) => {
        acc.totalGross += employee.grossSalary;
        acc.totalSalary += employee.salary ?? 0;
        acc.totalTransportAllowance += employee.transportAllowance;
        acc.totalTelephoneAllowance += employee.telephoneAllowance;
        acc.totalPosAllowance += employee.posAllowance;
        acc.totalEmployeePension += employee.employeePension;
        acc.totalEmployerPension += employee.employerPension;
        acc.totalIncomeTax += employee.incomeTax;
        acc.totalDeductions += employee.deductionAmount || 0;
        acc.totalNet += employee.netSalary;
        return acc;
      },
      {
        totalEmployees: payrollData.length,
        totalGross: 0,
        totalSalary: 0,
        totalTransportAllowance: 0,
        totalTelephoneAllowance: 0,
        totalPosAllowance: 0,
        totalEmployeePension: 0,
        totalEmployerPension: 0,
        totalIncomeTax: 0,
        totalDeductions: 0,
        totalNet: 0,
      }
    );

    // Round all amounts to 2 decimal places
    payrollData.forEach((employee) => {
      employee.grossSalary = Math.round(employee.grossSalary * 100) / 100;
      employee.salary = Math.round((employee.salary ?? 0) * 100) / 100;
      employee.transportAllowance =
        Math.round(employee.transportAllowance * 100) / 100;
      employee.telephoneAllowance =
        Math.round(employee.telephoneAllowance * 100) / 100;
      employee.posAllowance =
        Math.round(employee.posAllowance * 100) / 100;
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
        period: {
          month: targetMonth,
          year: targetYear,
          workingDays: totalWorkingDays,
          totalDaysInMonth,
        },
        calculatedAt: new Date().toISOString(),
        workingDays: workingDaysSoFar,
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
    const totalWorkingDays = calculateWorkingDaysExcludingHolidays(
      startDate,
      endDate,
      getHolidaysForMonth(targetYear, targetMonth)
    );
    const totalDaysInMonth = endDate.getDate();
    const holidays = getHolidaysForMonth(targetYear, targetMonth);
    const workingDaysSoFar = totalWorkingDays;

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
    // Filter employees to only those who existed during the selected period.
    const employeesForPeriod = employees.filter((employee) => {
      const jdStr =
        employee.joiningDate || employee.personalDetails?.joiningDate;
      if (!jdStr) return true;
      const jd = new Date(`${jdStr}T00:00:00Z`);
      return jd <= endDate;
    });

    if (employeesForPeriod.length === 0) {
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
            totalTelephoneAllowance: 0,
            totalPosAllowance: 0,
            totalNet: 0,
          },
          period: { month: targetMonth, year: targetYear },
        },
      });
    }

    // Calculate payroll for each employee
    const payrollData = employeesForPeriod.map((employee) => {
      const grossSalary = parseFloat(
        employee.grossSalary || employee.baseSalary || 0
      );
      const transportAllowance = parseFloat(
        employee.transportAllowance ?? employee.personalDetails?.transportAllowance ?? 0
      );
      const telephoneAllowance = parseFloat(
        employee.telephoneAllowance ?? employee.personalDetails?.telephoneAllowance ?? 0
      );
      const posAllowance = parseFloat(
        employee.posAllowance ?? employee.personalDetails?.posAllowance ?? 0
      );
      const employeePension = grossSalary * 0.07;
      const employerPension = grossSalary * 0.11;
      const incomeTax = calculateIncomeTax(grossSalary);
      const totalAllowances =
        transportAllowance + telephoneAllowance + posAllowance;
      const netSalary =
        grossSalary - (incomeTax + employeePension) + totalAllowances;

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
        telephoneAllowance: Math.round(telephoneAllowance * 100) / 100,
        posAllowance: Math.round(posAllowance * 100) / 100,
        employeePension: Math.round(employeePension * 100) / 100,
        employerPension: Math.round(employerPension * 100) / 100,
        incomeTax: Math.round(incomeTax * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100,
        email: employee.personalDetails?.email || employee.email,
        joiningDate:
          employee.joiningDate || employee.personalDetails?.joiningDate,
        // Ethiopian calendar info
        workingDays: workingDaysSoFar,
        totalDays: totalDaysInMonth,
        holidaysInMonth: holidays.length,
      };
    });

    // Calculate summary
    const summary = payrollData.reduce(
      (acc, employee) => {
        acc.totalGross += employee.grossSalary;
        acc.totalTransportAllowance += employee.transportAllowance;
        acc.totalTelephoneAllowance += employee.telephoneAllowance;
        acc.totalPosAllowance += employee.posAllowance;
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
        totalTelephoneAllowance: 0,
        totalPosAllowance: 0,
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
        period: {
          month: targetMonth,
          year: targetYear,
          workingDays: totalWorkingDays,
          totalDaysInMonth,
        },
        calculatedAt: new Date().toISOString(),
        workingDays: workingDaysSoFar,
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
