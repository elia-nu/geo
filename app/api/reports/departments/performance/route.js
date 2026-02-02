import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Department Performance Summary Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Get current user for role-based access
    const user = await getCurrentUser(request);
    
    // Check permission to view reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view reports." },
        { status: 403 }
      );
    }

    // Get date range (default to current month)
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    const currentDate = new Date();
    const defaultStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const defaultEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const periodStart = startDate ? new Date(startDate) : defaultStartDate;
    const periodEnd = endDate ? new Date(endDate) : defaultEndDate;
    
    // Format dates for query (YYYY-MM-DD)
    const startDateStr = periodStart.toISOString().split("T")[0];
    const endDateStr = periodEnd.toISOString().split("T")[0];

    // Get all departments
    const departments = await db
      .collection("departments")
      .find({})
      .toArray();

    // Get all employees with their departments
    const employees = await db
      .collection("employees")
      .aggregate([
        {
          $addFields: {
            department: {
              $ifNull: [
                "$personalDetails.department",
                "$department",
                "Unassigned",
              ],
            },
            employeeName: {
              $ifNull: [
                "$personalDetails.name",
                {
                  $concat: [
                    { $ifNull: ["$personalDetails.firstName", ""] },
                    " ",
                    { $ifNull: ["$personalDetails.lastName", ""] },
                  ],
                },
                "$name",
              ],
            },
            email: {
              $ifNull: ["$personalDetails.email", "$email", ""],
            },
            grossSalary: {
              $ifNull: [
                { $toDouble: "$grossSalary" },
                { $toDouble: "$baseSalary" },
                0,
              ],
            },
            status: {
              $ifNull: ["$status", "active"],
            },
          },
        },
        {
          $project: {
            _id: 1,
            employeeId: { $toString: "$_id" },
            employeeName: 1,
            email: 1,
            department: 1,
            grossSalary: 1,
            status: 1,
            joiningDate: {
              $ifNull: [
                "$personalDetails.joiningDate",
                "$joiningDate",
                null,
              ],
            },
          },
        },
      ])
      .toArray();

    // Get attendance records for the period
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find({
        date: {
          $gte: startDateStr,
          $lte: endDateStr,
        },
      })
      .toArray();

    // Get leave requests for the period
    const leaveRequests = await db
      .collection("leave_requests")
      .find({
        $or: [
          {
            startDate: { $lte: endDateStr },
            endDate: { $gte: startDateStr },
          },
        ],
      })
      .toArray();

    // Create employee map
    const employeeMap = new Map();
    employees.forEach((emp) => {
      employeeMap.set(emp.employeeId, emp);
    });

    // Calculate working days in period (excluding weekends)
    const workingDays = calculateWorkingDays(periodStart, periodEnd);

    // Group data by department
    const departmentPerformance = {};

    // Initialize departments
    departments.forEach((dept) => {
      departmentPerformance[dept.name] = {
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        totalEmployees: 0,
        activeEmployees: 0,
        attendanceRate: 0,
        totalAttendanceDays: 0,
        expectedAttendanceDays: 0,
        leaveFrequency: 0,
        totalLeaveDays: 0,
        payrollCost: 0,
        totalGrossSalary: 0,
        workforceUtilization: 0,
        totalWorkingHours: 0,
        expectedWorkingHours: 0,
        averageWorkingHours: 0,
        employees: [],
      };
    });

    // Add unassigned department
    departmentPerformance["Unassigned"] = {
      departmentId: "unassigned",
      departmentName: "Unassigned",
      totalEmployees: 0,
      activeEmployees: 0,
      attendanceRate: 0,
      totalAttendanceDays: 0,
      expectedAttendanceDays: 0,
      leaveFrequency: 0,
      totalLeaveDays: 0,
      payrollCost: 0,
      totalGrossSalary: 0,
      workforceUtilization: 0,
      totalWorkingHours: 0,
      expectedWorkingHours: 0,
      averageWorkingHours: 0,
      employees: [],
    };

    // Process employees by department
    employees.forEach((emp) => {
      const deptName = emp.department || "Unassigned";
      if (!departmentPerformance[deptName]) {
        departmentPerformance[deptName] = {
          departmentId: "unknown",
          departmentName: deptName,
          totalEmployees: 0,
          activeEmployees: 0,
          attendanceRate: 0,
          totalAttendanceDays: 0,
          expectedAttendanceDays: 0,
          leaveFrequency: 0,
          totalLeaveDays: 0,
          payrollCost: 0,
          totalGrossSalary: 0,
          workforceUtilization: 0,
          totalWorkingHours: 0,
          expectedWorkingHours: 0,
          averageWorkingHours: 0,
          employees: [],
        };
      }

      const dept = departmentPerformance[deptName];
      dept.totalEmployees++;
      
      if (emp.status === "active") {
        dept.activeEmployees++;
      }

      // Calculate expected attendance days (only for active employees)
      if (emp.status === "active") {
        // Calculate days employee should have worked (from joining date to period end)
        const empStartDate = emp.joiningDate
          ? new Date(emp.joiningDate)
          : periodStart;
        const effectiveStartDate =
          empStartDate > periodStart ? empStartDate : periodStart;
        const empWorkingDays = calculateWorkingDays(
          effectiveStartDate,
          periodEnd
        );
        dept.expectedAttendanceDays += empWorkingDays;
      }

      // Add to payroll cost
      dept.totalGrossSalary += emp.grossSalary || 0;

      // Track employee
      dept.employees.push({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        email: emp.email,
        status: emp.status,
        grossSalary: emp.grossSalary || 0,
      });
    });

    // Process attendance records
    attendanceRecords.forEach((record) => {
      const emp = employeeMap.get(record.employeeId);
      if (!emp) return;

      const deptName = emp.department || "Unassigned";
      const dept = departmentPerformance[deptName];
      if (!dept) return;

      // Count attendance days (if checked in)
      if (record.checkInTime) {
        dept.totalAttendanceDays++;
      }

      // Add working hours
      const workingHours = record.workingHours || 0;
      dept.totalWorkingHours += workingHours;
    });

    // Process leave requests
    leaveRequests.forEach((leave) => {
      const emp = employeeMap.get(leave.employeeId);
      if (!emp) return;

      const deptName = emp.department || "Unassigned";
      const dept = departmentPerformance[deptName];
      if (!dept) return;

      // Count leave frequency (number of leave requests)
      dept.leaveFrequency++;

      // Calculate leave days
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      const effectiveStart =
        leaveStart < periodStart ? periodStart : leaveStart;
      const effectiveEnd = leaveEnd > periodEnd ? periodEnd : leaveEnd;

      if (effectiveStart <= effectiveEnd) {
        const leaveDays = calculateWorkingDays(effectiveStart, effectiveEnd);
        dept.totalLeaveDays += leaveDays;
      }
    });

    // Calculate metrics for each department
    const performanceData = Object.values(departmentPerformance).map((dept) => {
      // Attendance Rate = (Total Attendance Days / Expected Attendance Days) * 100
      dept.attendanceRate =
        dept.expectedAttendanceDays > 0
          ? (dept.totalAttendanceDays / dept.expectedAttendanceDays) * 100
          : 0;

      // Payroll Cost = Total Gross Salary (can include benefits, etc.)
      dept.payrollCost = dept.totalGrossSalary;

      // Expected working hours (8 hours per working day per active employee)
      dept.expectedWorkingHours = dept.activeEmployees * workingDays * 8;

      // Workforce Utilization = (Total Working Hours / Expected Working Hours) * 100
      dept.workforceUtilization =
        dept.expectedWorkingHours > 0
          ? (dept.totalWorkingHours / dept.expectedWorkingHours) * 100
          : 0;

      // Average working hours per employee
      dept.averageWorkingHours =
        dept.activeEmployees > 0
          ? dept.totalWorkingHours / dept.activeEmployees
          : 0;

      return {
        ...dept,
        attendanceRate: Math.round(dept.attendanceRate * 100) / 100,
        workforceUtilization: Math.round(dept.workforceUtilization * 100) / 100,
        averageWorkingHours: Math.round(dept.averageWorkingHours * 100) / 100,
        payrollCost: Math.round(dept.payrollCost * 100) / 100,
      };
    });

    // Calculate overall summary
    const summary = {
      totalDepartments: performanceData.length,
      totalEmployees: employees.length,
      totalActiveEmployees: employees.filter((e) => e.status === "active")
        .length,
      averageAttendanceRate:
        performanceData.length > 0
          ? performanceData.reduce((sum, d) => sum + d.attendanceRate, 0) /
            performanceData.length
          : 0,
      totalPayrollCost: performanceData.reduce(
        (sum, d) => sum + d.payrollCost,
        0
      ),
      averageWorkforceUtilization:
        performanceData.length > 0
          ? performanceData.reduce(
              (sum, d) => sum + d.workforceUtilization,
              0
            ) / performanceData.length
          : 0,
      totalLeaveRequests: leaveRequests.length,
      period: {
        startDate: startDateStr,
        endDate: endDateStr,
        workingDays: workingDays,
      },
    };

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "department_performance",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "department_performance",
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
        recordCount: performanceData.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "department_performance",
      generatedAt: new Date().toISOString(),
      summary,
      departments: performanceData,
      totalRecords: performanceData.length,
    });
  } catch (error) {
    console.error("Error generating department performance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate department performance report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate working days (excluding weekends)
function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
