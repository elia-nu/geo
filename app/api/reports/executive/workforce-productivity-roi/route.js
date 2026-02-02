import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 9.3 Workforce Productivity & ROI Report: Attendance rate vs output, Payroll cost vs project progress, Leave impact vs delivery timelines
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view executive reports." },
        { status: 403 }
      );
    }

    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const startStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const endDate = new Date(targetYear, targetMonth, 0);
    const endStr = endDate.toISOString().slice(0, 10);

    const employees = await db.collection("employees").find({}).toArray();
    const empCount = employees.length;
    const attendanceRecords = await db.collection("daily_attendance").find({
      date: { $gte: startStr, $lte: endStr },
    }).toArray();
    const attendanceByEmp = new Map();
    attendanceRecords.forEach((r) => {
      const eid = (r.employeeId && r.employeeId.toString) ? r.employeeId.toString() : String(r.employeeId);
      const cur = attendanceByEmp.get(eid) || { days: 0, withCheckOut: 0 };
      cur.days += 1;
      if (r.checkInTime && r.checkOutTime) cur.withCheckOut += 1;
      attendanceByEmp.set(eid, cur);
    });
    const totalAttendanceDays = attendanceRecords.length;
    const daysWithCheckOut = attendanceRecords.filter((r) => r.checkInTime && r.checkOutTime).length;
    const attendanceRate = empCount > 0 ? Math.round((totalAttendanceDays / (empCount * 22)) * 10000) / 100 : 0;

    const tasks = await db.collection("tasks").find({}).toArray();
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const totalTasks = tasks.length;
    const outputRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 10000) / 100 : 0;

    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization") || "";
    let payrollCost = 0;
    try {
      const res = await fetch(`${origin}/api/payroll/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
        body: JSON.stringify({ month: targetMonth, year: targetYear }),
      });
      if (res.ok) {
        const data = (await res.json()).data;
        payrollCost = data?.summary?.totalNet ?? data?.summary?.totalGross ?? 0;
      }
    } catch (_) {}

    const projects = await db.collection("projects").find({}).toArray();
    const completedProjects = projects.filter((p) => p.status === "completed" || p.progress >= 100).length;
    const totalProjects = projects.length;
    const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 10000) / 100 : 0;
    const avgProgress = totalProjects > 0
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / totalProjects * 100) / 100
      : 0;

    const leaveDocs = await db.collection("attendance_documents").find({
      type: "leave",
      status: "approved",
      $or: [
        { startDate: { $lte: endStr }, endDate: { $gte: startStr } },
        { startDate: { $gte: startStr, $lte: endStr } },
      ],
    }).toArray();
    let leaveDays = 0;
    leaveDocs.forEach((doc) => {
      const start = toDate(doc.startDate) || new Date(doc.startDate);
      const end = toDate(doc.endDate) || new Date(doc.endDate);
      if (!start || !end) return;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) leaveDays++;
      }
    });
    const totalWorkingDaysEst = empCount * 22;
    const leaveImpactPercent = totalWorkingDaysEst > 0 ? Math.round((leaveDays / totalWorkingDaysEst) * 10000) / 100 : 0;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_workforce_productivity_roi",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "executive_workforce_productivity_roi" },
    });

    return NextResponse.json({
      success: true,
      reportType: "workforce_productivity_roi",
      generatedAt: new Date().toISOString(),
      filters: { month: targetMonth, year: targetYear },
      period: { month: targetMonth, year: targetYear, startDate: startStr, endDate: endStr },
      summary: {
        attendanceRate,
        totalAttendanceDays,
        daysWithCheckOut,
        outputRate,
        completedTasks,
        totalTasks,
        payrollCost: Math.round(payrollCost * 100) / 100,
        projectCompletionRate,
        avgProjectProgress: avgProgress,
        leaveDays,
        leaveImpactPercent,
      },
      attendanceVsOutput: {
        attendanceRate,
        outputRate,
        note: "Attendance rate: attendance days vs estimated working days; Output: completed tasks vs total tasks.",
      },
      payrollCostVsProjectProgress: {
        payrollCost: Math.round(payrollCost * 100) / 100,
        projectCompletionRate,
        avgProjectProgress: avgProgress,
        note: "Payroll cost for period vs overall project completion and average progress.",
      },
      leaveImpactVsDelivery: {
        leaveDays,
        leaveImpactPercent,
        completedProjects,
        totalProjects,
        note: "Leave days in period vs delivery (project completion).",
      },
    });
  } catch (error) {
    console.error("Error generating workforce productivity & ROI report:", error);
    return NextResponse.json(
      { error: "Failed to generate workforce productivity & ROI report", message: error.message },
      { status: 500 }
    );
  }
}
