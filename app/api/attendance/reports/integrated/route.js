import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { isHoliday, isWorkingDay } from "../../../../utils/ethiopianCalendar";

// Get integrated attendance reports with leave data
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const department = url.searchParams.get("department");
    const includeLeaveDetails =
      url.searchParams.get("includeLeaveDetails") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Build base query
    let attendanceQuery = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (employeeId) {
      attendanceQuery.employeeId = new ObjectId(employeeId);
    }

    // Get attendance records
    console.log("Integrated Reports - Attendance query:", attendanceQuery);
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find(attendanceQuery)
      .sort({ date: 1 })
      .toArray();
    console.log(
      "Integrated Reports - Found attendance records:",
      attendanceRecords.length
    );

    // Get approved leave requests for the same period
    const leaveQuery = {
      type: "leave",
      status: "approved",
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
        },
        {
          startDate: { $gte: startDate, $lte: endDate },
        },
      ],
    };

    if (employeeId) {
      leaveQuery.employeeId = new ObjectId(employeeId);
    }

    console.log("Integrated Reports - Leave query:", leaveQuery);
    const approvedLeaves = await db
      .collection("attendance_documents")
      .find(leaveQuery)
      .toArray();
    console.log(
      "Integrated Reports - Found approved leaves:",
      approvedLeaves.length
    );

    // Get employee details
    const employeeIds = [
      ...new Set(attendanceRecords.map((record) => record.employeeId)),
    ];
    console.log(
      "Integrated Reports - Employee IDs from attendance:",
      employeeIds
    );

    // Convert string IDs to ObjectIds for the query
    const objectIdEmployeeIds = employeeIds
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch (error) {
          console.log("Invalid ObjectId:", id);
          return null;
        }
      })
      .filter((id) => id !== null);

    console.log(
      "Integrated Reports - ObjectId employee IDs:",
      objectIdEmployeeIds
    );

    const employees = await db
      .collection("employees")
      .find({ _id: { $in: objectIdEmployeeIds } })
      .toArray();
    console.log("Integrated Reports - Found employees:", employees.length);

    // Filter by department if specified
    let filteredEmployees = employees;
    if (department) {
      filteredEmployees = employees.filter(
        (emp) =>
          emp.department === department ||
          emp.personalDetails?.department === department
      );
    }

    const employeeMap = {};
    filteredEmployees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp;
    });

    // Process attendance records with leave integration
    const processedRecords = await processIntegratedAttendance(
      db,
      attendanceRecords,
      approvedLeaves,
      employeeMap,
      includeLeaveDetails
    );

    console.log(
      "Integrated Reports - Processed records:",
      processedRecords.length
    );
    if (processedRecords.length > 0) {
      console.log(
        "Sample processed record:",
        JSON.stringify(processedRecords[0], null, 2)
      );
    }

    // Calculate comprehensive statistics
    const statistics = calculateIntegratedStatistics(processedRecords);
    console.log("Integrated Reports - Statistics:", statistics);

    return NextResponse.json({
      success: true,
      data: {
        records: processedRecords,
        statistics,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        totalRecords: processedRecords.length,
        filters: {
          employeeId,
          department,
          includeLeaveDetails,
        },
      },
    });
  } catch (error) {
    console.error("Error generating integrated attendance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate integrated attendance report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to process attendance with leave integration
async function processIntegratedAttendance(
  db,
  attendanceRecords,
  approvedLeaves,
  employeeMap,
  includeLeaveDetails
) {
  // Create a map of leave dates for quick lookup
  const leaveDateMap = new Map();

  approvedLeaves.forEach((leave) => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split("T")[0];
      if (!leaveDateMap.has(dateKey)) {
        leaveDateMap.set(dateKey, []);
      }
      leaveDateMap.get(dateKey).push(leave);
    }
  });

  // Process each attendance record
  const processedRecords = attendanceRecords
    .map((record) => {
      console.log(
        "Processing record for employeeId:",
        record.employeeId,
        "Type:",
        typeof record.employeeId
      );
      const employee = employeeMap[record.employeeId.toString()];
      console.log("Found employee:", employee ? employee.name : "NOT FOUND");
      if (!employee) return null; // Skip if employee not in filtered list

      const dateKey = record.date;
      const leavesForDate = leaveDateMap.get(dateKey) || [];

      // Check if employee was on approved leave
      const isOnLeave = leavesForDate.some(
        (leave) => leave.employeeId.toString() === record.employeeId.toString()
      );

      // Check if the date is a holiday or non-working day
      const recordDate = new Date(record.date);
      const holidayInfo = isHoliday(recordDate);
      const isWorkingDayDate = isWorkingDay(recordDate);

      // Determine attendance status
      let attendanceStatus = "present";
      let workingHours = record.workingHours || 0;
      let absenceReason = null;
      let leaveInfo = null;
      let payrollDeduction = 0;

      if (holidayInfo) {
        // It's a holiday - mark as holiday regardless of attendance
        attendanceStatus = "holiday";
        workingHours = 0;
        payrollDeduction = 0; // No deduction for holidays
        absenceReason = `Holiday: ${holidayInfo.name}`;
      } else if (!isWorkingDayDate) {
        // It's a weekend or non-working day
        attendanceStatus = "weekend";
        workingHours = 0;
        payrollDeduction = 0; // No deduction for weekends
        absenceReason = "Non-working day";
      } else if (isOnLeave) {
        attendanceStatus = "on_leave";
        workingHours = 0;
        payrollDeduction = 0; // No deduction for approved leave
        const leave = leavesForDate.find(
          (l) => l.employeeId.toString() === record.employeeId.toString()
        );
        leaveInfo = {
          leaveType: leave.leaveType,
          leaveId: leave._id,
          reason: leave.reason,
          startDate: leave.startDate,
          endDate: leave.endDate,
        };
      } else if (!record.checkInTime) {
        attendanceStatus = "absent";
        workingHours = 0;
        payrollDeduction = 1; // Full day deduction for absence
        absenceReason = "No check-in recorded";
      } else if (record.checkInTime && !record.checkOutTime) {
        attendanceStatus = "partial";
        // Calculate partial hours based on check-in time
        const checkInTime = new Date(record.checkInTime);
        const endOfDay = new Date(checkInTime);
        endOfDay.setHours(18, 0, 0, 0); // Assume 6 PM end time
        workingHours = Math.max(0, (endOfDay - checkInTime) / (1000 * 60 * 60));
        payrollDeduction = 0.5; // Half day deduction for partial attendance
      } else {
        // Calculate actual working hours
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        workingHours = (checkOut - checkIn) / (1000 * 60 * 60);
        payrollDeduction = 0; // No deduction for full attendance
      }

      return {
        _id: record._id,
        employeeId: record.employeeId,
        employeeName:
          employee?.personalDetails?.name || employee?.name || "Unknown",
        employeeEmail:
          employee?.personalDetails?.email || employee?.email || "",
        department:
          employee?.department || employee?.personalDetails?.department || "",
        designation:
          employee?.designation || employee?.personalDetails?.designation || "",
        date: record.date,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        workingHours: Math.round(workingHours * 100) / 100,
        attendanceStatus,
        absenceReason,
        leaveInfo: includeLeaveDetails ? leaveInfo : null,
        payrollDeduction,
        location: record.location || null,
        geofenceValidated: record.geofenceValidated || false,
        // Ethiopian calendar info
        isHoliday: !!holidayInfo,
        isWorkingDay: isWorkingDayDate,
        holidayInfo: holidayInfo
          ? {
              name: holidayInfo.name,
              nameAmharic: holidayInfo.nameAmharic,
              type: holidayInfo.type,
            }
          : null,
      };
    })
    .filter((record) => record !== null);

  return processedRecords;
}

// Helper function to calculate comprehensive statistics
function calculateIntegratedStatistics(records) {
  const stats = {
    totalRecords: records.length,
    totalEmployees: new Set(records.map((r) => r.employeeId.toString())).size,
    totalWorkingHours: 0,
    totalAbsentDays: 0,
    totalLeaveDays: 0,
    totalPartialDays: 0,
    totalPresentDays: 0,
    totalHolidayDays: 0,
    totalWeekendDays: 0,
    totalPayrollDeductions: 0,
    averageWorkingHours: 0,
    byDepartment: {},
    byEmployee: {},
    byLeaveType: {},
    attendanceTrend: {},
  };

  records.forEach((record) => {
    // Overall totals
    stats.totalWorkingHours += record.workingHours;
    stats.totalPayrollDeductions += record.payrollDeduction;

    if (record.attendanceStatus === "absent") {
      stats.totalAbsentDays++;
    } else if (record.attendanceStatus === "on_leave") {
      stats.totalLeaveDays++;
      // Track leave types
      if (record.leaveInfo?.leaveType) {
        stats.byLeaveType[record.leaveInfo.leaveType] =
          (stats.byLeaveType[record.leaveInfo.leaveType] || 0) + 1;
      }
    } else if (record.attendanceStatus === "partial") {
      stats.totalPartialDays++;
    } else if (record.attendanceStatus === "holiday") {
      stats.totalHolidayDays++;
    } else if (record.attendanceStatus === "weekend") {
      stats.totalWeekendDays++;
    } else {
      stats.totalPresentDays++;
    }

    // By department
    const dept = record.department || "Unknown";
    if (!stats.byDepartment[dept]) {
      stats.byDepartment[dept] = {
        totalDays: 0,
        totalHours: 0,
        absentDays: 0,
        leaveDays: 0,
        partialDays: 0,
        presentDays: 0,
        holidayDays: 0,
        weekendDays: 0,
        payrollDeductions: 0,
      };
    }
    stats.byDepartment[dept].totalDays++;
    stats.byDepartment[dept].totalHours += record.workingHours;
    stats.byDepartment[dept].payrollDeductions += record.payrollDeduction;
    if (record.attendanceStatus === "absent")
      stats.byDepartment[dept].absentDays++;
    if (record.attendanceStatus === "on_leave")
      stats.byDepartment[dept].leaveDays++;
    if (record.attendanceStatus === "partial")
      stats.byDepartment[dept].partialDays++;
    if (record.attendanceStatus === "holiday")
      stats.byDepartment[dept].holidayDays++;
    if (record.attendanceStatus === "weekend")
      stats.byDepartment[dept].weekendDays++;
    if (record.attendanceStatus === "present")
      stats.byDepartment[dept].presentDays++;

    // By employee
    const empId = record.employeeId.toString();
    if (!stats.byEmployee[empId]) {
      stats.byEmployee[empId] = {
        employeeName: record.employeeName,
        totalDays: 0,
        totalHours: 0,
        absentDays: 0,
        leaveDays: 0,
        partialDays: 0,
        presentDays: 0,
        holidayDays: 0,
        weekendDays: 0,
        payrollDeductions: 0,
      };
    }
    stats.byEmployee[empId].totalDays++;
    stats.byEmployee[empId].totalHours += record.workingHours;
    stats.byEmployee[empId].payrollDeductions += record.payrollDeduction;
    if (record.attendanceStatus === "absent")
      stats.byEmployee[empId].absentDays++;
    if (record.attendanceStatus === "on_leave")
      stats.byEmployee[empId].leaveDays++;
    if (record.attendanceStatus === "partial")
      stats.byEmployee[empId].partialDays++;
    if (record.attendanceStatus === "holiday")
      stats.byEmployee[empId].holidayDays++;
    if (record.attendanceStatus === "weekend")
      stats.byEmployee[empId].weekendDays++;
    if (record.attendanceStatus === "present")
      stats.byEmployee[empId].presentDays++;

    // Attendance trend by date
    const date = record.date;
    if (!stats.attendanceTrend[date]) {
      stats.attendanceTrend[date] = {
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
        partial: 0,
        holiday: 0,
        weekend: 0,
      };
    }
    stats.attendanceTrend[date].total++;
    if (record.attendanceStatus === "present")
      stats.attendanceTrend[date].present++;
    if (record.attendanceStatus === "absent")
      stats.attendanceTrend[date].absent++;
    if (record.attendanceStatus === "on_leave")
      stats.attendanceTrend[date].leave++;
    if (record.attendanceStatus === "partial")
      stats.attendanceTrend[date].partial++;
    if (record.attendanceStatus === "holiday")
      stats.attendanceTrend[date].holiday++;
    if (record.attendanceStatus === "weekend")
      stats.attendanceTrend[date].weekend++;
  });

  // Calculate averages
  stats.averageWorkingHours =
    stats.totalRecords > 0
      ? Math.round((stats.totalWorkingHours / stats.totalRecords) * 100) / 100
      : 0;

  return stats;
}
