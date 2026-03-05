import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 8.4 Project Cost & Budget Performance Report: Budget vs actual payroll cost, Burn rate, Forecasted overrun
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view project reports." },
        { status: 403 }
      );
    }

    const projectIdFilter = searchParams.get("projectId") || null;
    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization") || "";

    const query = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      query._id = new ObjectId(projectIdFilter);
    }

    const projects = await db.collection("projects").find(query).toArray();
    const now = new Date();
    const rows = [];

    for (const p of projects) {
      const totalBudget = p.budget?.totalAmount || 0;
      const totalExpenses = (p.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const startDate = p.startDate ? new Date(p.startDate) : null;
      const endDate = p.endDate ? new Date(p.endDate) : null;
      const daysElapsed = startDate ? Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))) : 1;
      const dailyBurnRate = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
      const projectDuration = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 0;
      const projectedTotalExpenses = projectDuration > 0 ? dailyBurnRate * projectDuration : totalExpenses;
      const forecastedOverrun = totalBudget > 0 ? Math.max(0, projectedTotalExpenses - totalBudget) : 0;
      const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 10000) / 100 : 0;

      let actualPayrollCost = 0;
      const assignedIds = (p.assignedEmployees || []).map((id) => id.toString());
      if (assignedIds.length > 0) {
        try {
          const res = await fetch(`${origin}/api/payroll/calculate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
            body: JSON.stringify({
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              employeeIds: assignedIds,
            }),
          });
          if (res.ok) {
            const data = (await res.json()).data;
            actualPayrollCost = data?.summary?.totalNet ?? data?.summary?.totalGross ?? 0;
            if (Array.isArray(data?.payrollData)) {
              actualPayrollCost = data.payrollData.reduce((s, emp) => s + (emp.netSalary ?? emp.grossSalary ?? 0), 0);
            }
          }
        } catch (_) {}
      }

      rows.push({
        projectId: p._id.toString(),
        projectName: p.name || "Unnamed",
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        actualPayrollCost: Math.round(actualPayrollCost * 100) / 100,
        budgetUtilization,
        dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
        daysElapsed,
        projectDuration,
        projectedTotalExpenses: Math.round(projectedTotalExpenses * 100) / 100,
        forecastedOverrun: Math.round(forecastedOverrun * 100) / 100,
        budgetVsActualNote: totalBudget > 0 && totalExpenses > totalBudget ? "Over budget" : "Within budget",
      });
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "project_cost_budget_performance",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "project_cost_budget_performance", count: rows.length },
    });

    return NextResponse.json({
      success: true,
      reportType: "project_cost_budget_performance",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter },
      summary: {
        totalProjects: rows.length,
        totalBudget: Math.round(rows.reduce((s, r) => s + r.totalBudget, 0) * 100) / 100,
        totalExpenses: Math.round(rows.reduce((s, r) => s + r.totalExpenses, 0) * 100) / 100,
        totalForecastedOverrun: Math.round(rows.reduce((s, r) => s + r.forecastedOverrun, 0) * 100) / 100,
      },
      rows,
    });
  } catch (error) {
    console.error("Error generating project cost & budget performance report:", error);
    return NextResponse.json(
      { error: "Failed to generate project cost & budget performance report", message: error.message },
      { status: 500 }
    );
  }
}
