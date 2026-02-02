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

// 9.4 Executive Performance Dashboard Report: Company-wide KPIs (Attendance accuracy, Payroll efficiency, Project completion rate, Workforce utilization, Cost variance)
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
    const totalAttendanceDays = attendanceRecords.length;
    const daysWithCheckOut = attendanceRecords.filter((r) => r.checkInTime && r.checkOutTime).length;
    const expectedWorkingDays = empCount * 22;
    const attendanceAccuracy = expectedWorkingDays > 0
      ? Math.round((totalAttendanceDays / expectedWorkingDays) * 10000) / 100
      : 0;
    const checkOutRate = totalAttendanceDays > 0
      ? Math.round((daysWithCheckOut / totalAttendanceDays) * 10000) / 100
      : 0;

    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization") || "";
    let payrollTotal = 0;
    let payrollGross = 0;
    try {
      const res = await fetch(`${origin}/api/payroll/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
        body: JSON.stringify({ month: targetMonth, year: targetYear }),
      });
      if (res.ok) {
        const data = (await res.json()).data;
        payrollTotal = data?.summary?.totalNet ?? 0;
        payrollGross = data?.summary?.totalGross ?? 0;
      }
    } catch (_) {}
    const payrollEfficiency = payrollGross > 0
      ? Math.round((payrollTotal / payrollGross) * 10000) / 100
      : 100;

    const projects = await db.collection("projects").find({}).toArray();
    const completedProjects = projects.filter((p) => p.status === "completed" || (p.progress ?? 0) >= 100).length;
    const totalProjects = projects.length;
    const projectCompletionRate = totalProjects > 0
      ? Math.round((completedProjects / totalProjects) * 10000) / 100
      : 0;

    const tasks = await db.collection("tasks").find({}).toArray();
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const totalTasks = tasks.length;
    const taskCompletionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 10000) / 100
      : 0;
    const assignedEmpIds = new Set();
    projects.forEach((p) => (p.assignedEmployees || []).forEach((id) => assignedEmpIds.add(id.toString())));
    const workforceUtilization = empCount > 0
      ? Math.round((assignedEmpIds.size / empCount) * 10000) / 100
      : 0;

    const totalBudget = projects.reduce((s, p) => s + (p.budget?.totalAmount || 0), 0);
    const totalExpenses = projects.reduce((s, p) => {
      return s + (p.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    }, 0);
    const costVariance = totalBudget > 0
      ? Math.round(((totalExpenses - totalBudget) / totalBudget) * 10000) / 100
      : 0;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_performance_dashboard",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "executive_performance_dashboard" },
    });

    return NextResponse.json({
      success: true,
      reportType: "executive_performance_dashboard",
      generatedAt: new Date().toISOString(),
      filters: { month: targetMonth, year: targetYear },
      period: { month: targetMonth, year: targetYear, startDate: startStr, endDate: endStr },
      kpis: {
        attendanceAccuracy: {
          value: attendanceAccuracy,
          unit: "%",
          label: "Attendance Accuracy",
          description: "Attendance days vs expected working days",
        },
        payrollEfficiency: {
          value: payrollEfficiency,
          unit: "%",
          label: "Payroll Efficiency",
          description: "Net pay vs gross (post-deductions)",
        },
        projectCompletionRate: {
          value: projectCompletionRate,
          unit: "%",
          label: "Project Completion Rate",
          description: "Completed projects vs total",
        },
        workforceUtilization: {
          value: workforceUtilization,
          unit: "%",
          label: "Workforce Utilization",
          description: "Employees assigned to projects vs total",
        },
        costVariance: {
          value: costVariance,
          unit: "%",
          label: "Cost Variance",
          description: "Project expenses vs budget (positive = over)",
        },
      },
      summary: {
        attendanceAccuracy,
        payrollEfficiency,
        projectCompletionRate,
        workforceUtilization,
        costVariance,
        totalEmployees: empCount,
        totalProjects,
        completedProjects,
        totalTasks,
        completedTasks,
        totalAttendanceDays,
        payrollTotal: Math.round(payrollTotal * 100) / 100,
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error generating executive performance dashboard report:", error);
    return NextResponse.json(
      { error: "Failed to generate executive performance dashboard report", message: error.message },
      { status: 500 }
    );
  }
}
