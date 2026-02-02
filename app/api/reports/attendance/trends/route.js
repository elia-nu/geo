import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 5.4 Attendance Trend & Productivity Report
// Monthly/quarterly trends, absenteeism rates, overtime patterns
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "reports.read",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to view attendance reports.",
        },
        { status: 403 }
      );
    }

    const periodType =
      (scanNull(searchParams.get("periodType")) || "monthly").toLowerCase(); // monthly | quarterly
    const startDate =
      scanNull(searchParams.get("startDate")) ||
      new Date(new Date().getFullYear(), 0, 1)
        .toISOString()
        .slice(0, 10); // default: start of year
    const endDate =
      scanNull(searchParams.get("endDate")) ||
      new Date().toISOString().slice(0, 10);
    const departmentFilter = scanNull(searchParams.get("department"));
    const projectIdFilter = scanNull(searchParams.get("projectId"));

    const filterProjectId =
      projectIdFilter && ObjectId.isValid(projectIdFilter)
        ? projectIdFilter
        : null;

    const empQuery = {};
    if (departmentFilter) {
      empQuery.$or = [
        { department: departmentFilter },
        { "personalDetails.department": departmentFilter },
      ];
    }
    const employees = await db.collection("employees").find(empQuery).toArray();
    const employeesById = new Map(
      employees.map((e) => [e._id.toString(), e])
    );
    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        reportType: "attendance_trends",
        generatedAt: new Date().toISOString(),
        filters: {
          periodType,
          startDate,
          endDate,
          department: departmentFilter,
          projectId: projectIdFilter,
        },
        trends: [],
        totalRecords: 0,
      });
    }

    const projects = await db.collection("projects").find({}).toArray();
    const projectsByEmployee = new Map();
    projects.forEach((proj) => {
      if (!Array.isArray(proj.assignedEmployees)) return;
      proj.assignedEmployees.forEach((eid) => {
        const key = eid.toString();
        if (!projectsByEmployee.has(key)) projectsByEmployee.set(key, []);
        projectsByEmployee.get(key).push({
          id: proj._id.toString(),
          name: proj.name || "Unnamed Project",
        });
      });
    });

    // Attendance in range
    const attQuery = {
      date: { $gte: startDate, $lte: endDate },
      employeeId: { $in: [...employeesById.keys()] },
    };
    const attendance = await db
      .collection("daily_attendance")
      .find(attQuery)
      .toArray();

    const grouped = new Map();

    const getPeriodKey = (dateStr) => {
      const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
      const month = m || 1;
      if (periodType === "quarterly") {
        const q = Math.floor((month - 1) / 3) + 1;
        return { key: `${y}-Q${q}`, year: y, quarter: q, month: null };
      }
      return {
        key: `${y}-${String(month).padStart(2, "0")}`,
        year: y,
        month,
        quarter: null,
      };
    };

    const distinctDatesPerPeriod = new Map();
    const activeEmployeeIds = new Set(employeesById.keys());

    attendance.forEach((rec) => {
      const empId =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId);
      if (!activeEmployeeIds.has(empId)) return;

      const emp = employeesById.get(empId);
      if (!emp) return;

      if (filterProjectId) {
        const empProjects = projectsByEmployee.get(empId) || [];
        if (!empProjects.some((p) => p.id === filterProjectId)) return;
      }

      const period = getPeriodKey(rec.date);
      if (!grouped.has(period.key)) {
        grouped.set(period.key, {
          periodKey: period.key,
          year: period.year,
          month: period.month,
          quarter: period.quarter,
          totalWorkingHours: 0,
          totalOvertimeHours: 0,
          presentEmployeeDays: 0, // sum of (employees present each day) across days
          presentEmployeeSet: new Set(),
          dates: new Set(),
        });
      }
      const g = grouped.get(period.key);
      g.dates.add(rec.date);
      g.presentEmployeeSet.add(empId);
      if (rec.checkInTime) {
        g.presentEmployeeDays += 1;
      }
      const hours = typeof rec.workingHours === "number" ? rec.workingHours : 0;
      g.totalWorkingHours += hours;
      const overtime = Math.max(0, hours - 8);
      g.totalOvertimeHours += overtime;

      const pdKey = `${period.key}:${rec.date}`;
      if (!distinctDatesPerPeriod.has(pdKey)) {
        distinctDatesPerPeriod.set(pdKey, new Set());
      }
      distinctDatesPerPeriod.get(pdKey).add(empId);
    });

    const trends = [];
    grouped.forEach((g) => {
      const daysInPeriod = g.dates.size || 1;
      const totalEmployees = employees.length;
      const potentialEmployeeDays = totalEmployees * daysInPeriod;
      const absenteeismRate =
        potentialEmployeeDays > 0
          ? Math.round(
              ((potentialEmployeeDays - g.presentEmployeeDays) /
                potentialEmployeeDays) *
                10000
            ) / 100
          : 0;
      const avgOvertimePerEmployee =
        g.presentEmployeeSet.size > 0
          ? Math.round(
              (g.totalOvertimeHours / g.presentEmployeeSet.size) * 100
            ) / 100
          : 0;

      trends.push({
        periodKey: g.periodKey,
        year: g.year,
        month: g.month,
        quarter: g.quarter,
        totalWorkingHours: Math.round(g.totalWorkingHours * 100) / 100,
        totalOvertimeHours: Math.round(g.totalOvertimeHours * 100) / 100,
        distinctEmployees: g.presentEmployeeSet.size,
        employeeDaysPresent: g.presentEmployeeDays,
        daysInPeriod,
        absenteeismRate,
        avgOvertimePerEmployee,
      });
    });

    // Sort by period (year then month/quarter)
    trends.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const av = a.month || a.quarter || 0;
      const bv = b.month || b.quarter || 0;
      return av - bv;
    });

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "attendance_trends",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "attendance_trends",
        filters: {
          periodType,
          startDate,
          endDate,
          department: departmentFilter,
          projectId: projectIdFilter,
        },
        recordCount: trends.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "attendance_trends",
      generatedAt: new Date().toISOString(),
      filters: {
        periodType,
        startDate,
        endDate,
        department: departmentFilter,
        projectId: projectIdFilter,
      },
      trends,
      totalRecords: trends.length,
    });
  } catch (error) {
    console.error("Error generating attendance trends report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate attendance trend & productivity report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function scanNull(value) {
  if (!value) return null;
  return value.trim() === "" ? null : value.trim();
}

