import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get payroll-ready attendance data with leave exclusions
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const includeLeaveData = url.searchParams.get("includeLeaveData") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Build query
    let query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (employeeId) {
      query.employeeId = new ObjectId(employeeId);
    }

    // Get attendance records
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find(query)
      .sort({ date: 1 })
      .toArray();

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

    const approvedLeaves = await db
      .collection("attendance_documents")
      .find(leaveQuery)
      .toArray();

    // Process attendance records with leave exclusions
    const processedRecords = await processAttendanceForPayroll(
      db,
      attendanceRecords,
      approvedLeaves,
      includeLeaveData
    );

    // Calculate payroll summary
    const payrollSummary = calculatePayrollSummary(processedRecords);

    return NextResponse.json({
      success: true,
      data: {
        records: processedRecords,
        summary: payrollSummary,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating payroll data:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll data", message: error.message },
      { status: 500 }
    );
  }
}

// Export payroll data for external systems
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { startDate, endDate, employeeIds, format = "json" } = data;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Build query
    let query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (employeeIds && employeeIds.length > 0) {
      query.employeeId = { $in: employeeIds.map(id => new ObjectId(id)) };
    }

    // Get attendance records
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find(query)
      .sort({ date: 1 })
      .toArray();

    // Get approved leave requests
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

    if (employeeIds && employeeIds.length > 0) {
      leaveQuery.employeeId = { $in: employeeIds.map(id => new ObjectId(id)) };
    }

    const approvedLeaves = await db
      .collection("attendance_documents")
      .find(leaveQuery)
      .toArray();

    // Process data
    const processedRecords = await processAttendanceForPayroll(
      db,
      attendanceRecords,
      approvedLeaves,
      false
    );

    // Format data based on requested format
    let exportData;
    switch (format.toLowerCase()) {
      case "csv":
        exportData = formatAsCSV(processedRecords);
        break;
      case "excel":
        exportData = formatAsExcel(processedRecords);
        break;
      default:
        exportData = processedRecords;
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      format,
      period: { startDate, endDate },
      recordCount: processedRecords.length,
    });
  } catch (error) {
    console.error("Error exporting payroll data:", error);
    return NextResponse.json(
      { error: "Failed to export payroll data", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to process attendance records for payroll
async function processAttendanceForPayroll(db, attendanceRecords, approvedLeaves, includeLeaveData) {
  // Create a map of leave dates for quick lookup
  const leaveDateMap = new Map();
  
  approvedLeaves.forEach(leave => {
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      if (!leaveDateMap.has(dateKey)) {
        leaveDateMap.set(dateKey, []);
      }
      leaveDateMap.get(dateKey).push(leave);
    }
  });

  // Get employee details
  const employeeIds = [...new Set(attendanceRecords.map(record => record.employeeId))];
  const employees = await db
    .collection("employees")
    .find({ _id: { $in: employeeIds } })
    .toArray();

  const employeeMap = {};
  employees.forEach(emp => {
    employeeMap[emp._id.toString()] = emp;
  });

  // Process each attendance record
  const processedRecords = attendanceRecords.map(record => {
    const employee = employeeMap[record.employeeId.toString()];
    const dateKey = record.date;
    const leavesForDate = leaveDateMap.get(dateKey) || [];
    
    // Check if employee was on approved leave
    const isOnLeave = leavesForDate.some(leave => 
      leave.employeeId.toString() === record.employeeId.toString()
    );

    // Determine attendance status for payroll
    let payrollStatus = "present";
    let workingHours = record.workingHours || 0;
    let absenceReason = null;
    let leaveInfo = null;

    if (isOnLeave) {
      payrollStatus = "on_leave";
      workingHours = 0;
      const leave = leavesForDate.find(l => 
        l.employeeId.toString() === record.employeeId.toString()
      );
      leaveInfo = {
        leaveType: leave.leaveType,
        leaveId: leave._id,
        reason: leave.reason,
      };
    } else if (!record.checkInTime) {
      payrollStatus = "absent";
      workingHours = 0;
      absenceReason = "No check-in recorded";
    } else if (record.checkInTime && !record.checkOutTime) {
      payrollStatus = "partial";
      // Calculate partial hours based on check-in time
      const checkInTime = new Date(record.checkInTime);
      const endOfDay = new Date(checkInTime);
      endOfDay.setHours(18, 0, 0, 0); // Assume 6 PM end time
      workingHours = Math.max(0, (endOfDay - checkInTime) / (1000 * 60 * 60));
    }

    return {
      employeeId: record.employeeId,
      employeeName: employee?.personalDetails?.name || employee?.name || "Unknown",
      employeeEmail: employee?.personalDetails?.email || employee?.email || "",
      department: employee?.department || employee?.personalDetails?.department || "",
      designation: employee?.designation || employee?.personalDetails?.designation || "",
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      workingHours: Math.round(workingHours * 100) / 100,
      payrollStatus,
      absenceReason,
      leaveInfo: includeLeaveData ? leaveInfo : null,
      originalRecord: includeLeaveData ? record : null,
    };
  });

  return processedRecords;
}

// Helper function to calculate payroll summary
function calculatePayrollSummary(records) {
  const summary = {
    totalEmployees: new Set(records.map(r => r.employeeId.toString())).size,
    totalDays: records.length,
    totalWorkingHours: 0,
    totalAbsentDays: 0,
    totalLeaveDays: 0,
    totalPartialDays: 0,
    averageWorkingHours: 0,
    byDepartment: {},
    byEmployee: {},
  };

  records.forEach(record => {
    // Overall totals
    summary.totalWorkingHours += record.workingHours;
    
    if (record.payrollStatus === "absent") {
      summary.totalAbsentDays++;
    } else if (record.payrollStatus === "on_leave") {
      summary.totalLeaveDays++;
    } else if (record.payrollStatus === "partial") {
      summary.totalPartialDays++;
    }

    // By department
    const dept = record.department || "Unknown";
    if (!summary.byDepartment[dept]) {
      summary.byDepartment[dept] = {
        totalDays: 0,
        totalHours: 0,
        absentDays: 0,
        leaveDays: 0,
        partialDays: 0,
      };
    }
    summary.byDepartment[dept].totalDays++;
    summary.byDepartment[dept].totalHours += record.workingHours;
    if (record.payrollStatus === "absent") summary.byDepartment[dept].absentDays++;
    if (record.payrollStatus === "on_leave") summary.byDepartment[dept].leaveDays++;
    if (record.payrollStatus === "partial") summary.byDepartment[dept].partialDays++;

    // By employee
    const empId = record.employeeId.toString();
    if (!summary.byEmployee[empId]) {
      summary.byEmployee[empId] = {
        employeeName: record.employeeName,
        totalDays: 0,
        totalHours: 0,
        absentDays: 0,
        leaveDays: 0,
        partialDays: 0,
      };
    }
    summary.byEmployee[empId].totalDays++;
    summary.byEmployee[empId].totalHours += record.workingHours;
    if (record.payrollStatus === "absent") summary.byEmployee[empId].absentDays++;
    if (record.payrollStatus === "on_leave") summary.byEmployee[empId].leaveDays++;
    if (record.payrollStatus === "partial") summary.byEmployee[empId].partialDays++;
  });

  // Calculate averages
  summary.averageWorkingHours = summary.totalDays > 0 
    ? Math.round((summary.totalWorkingHours / summary.totalDays) * 100) / 100 
    : 0;

  return summary;
}

// Helper function to format data as CSV
function formatAsCSV(records) {
  const headers = [
    "Employee ID",
    "Employee Name",
    "Department",
    "Date",
    "Check In",
    "Check Out",
    "Working Hours",
    "Payroll Status",
    "Absence Reason",
    "Leave Type",
  ];

  const csvRows = [headers.join(",")];

  records.forEach(record => {
    const row = [
      record.employeeId,
      `"${record.employeeName}"`,
      `"${record.department}"`,
      record.date,
      record.checkInTime || "",
      record.checkOutTime || "",
      record.workingHours,
      record.payrollStatus,
      `"${record.absenceReason || ""}"`,
      record.leaveInfo?.leaveType || "",
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

// Helper function to format data as Excel (simplified)
function formatAsExcel(records) {
  // This would typically use a library like xlsx
  // For now, return a structured object that can be converted to Excel
  return {
    sheets: [{
      name: "Payroll Data",
      headers: [
        "Employee ID",
        "Employee Name",
        "Department",
        "Date",
        "Check In",
        "Check Out",
        "Working Hours",
        "Payroll Status",
        "Absence Reason",
        "Leave Type",
      ],
      data: records.map(record => [
        record.employeeId,
        record.employeeName,
        record.department,
        record.date,
        record.checkInTime || "",
        record.checkOutTime || "",
        record.workingHours,
        record.payrollStatus,
        record.absenceReason || "",
        record.leaveInfo?.leaveType || "",
      ]),
    }],
  };
}
