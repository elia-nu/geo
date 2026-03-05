import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 8.1 Project Master Summary Report: Status (Active/Delayed/Completed), Budget utilization, Workforce count, Timeline variance
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
    const statusFilter = searchParams.get("status") || null;

    const query = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      query._id = new ObjectId(projectIdFilter);
    }

    const projects = await db.collection("projects").find(query).toArray();
    const now = new Date();
    const rows = [];

    for (const p of projects) {
      const startDate = p.startDate ? new Date(p.startDate) : null;
      const endDate = p.endDate ? new Date(p.endDate) : null;
      const totalBudget = p.budget?.totalAmount || 0;
      const totalExpenses = (p.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 10000) / 100 : 0;
      const workforceCount = (p.assignedEmployees || []).length;

      let status = p.status || "active";
      if (status !== "completed" && status !== "cancelled" && endDate && endDate < now) {
        status = "delayed";
      }
      if (statusFilter && status !== statusFilter) continue;

      let timelineVarianceDays = null;
      let timelineVarianceNote = null;
      if (startDate && endDate) {
        const plannedDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const elapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
        const expectedProgress = plannedDuration > 0 ? (elapsed / plannedDuration) * 100 : 0;
        const actualProgress = p.progress || 0;
        const variance = actualProgress - Math.min(100, expectedProgress);
        timelineVarianceDays = variance !== 0 ? Math.round((Math.abs(variance) / 100) * plannedDuration) : 0;
        timelineVarianceNote = variance < 0 ? "Behind schedule" : variance > 0 ? "Ahead of schedule" : "On track";
      }

      rows.push({
        projectId: p._id.toString(),
        projectName: p.name || "Unnamed",
        status,
        category: p.category || "general",
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        progress: p.progress ?? 0,
        totalBudget: Math.round(totalBudget * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        budgetUtilization,
        workforceCount,
        milestoneCount: (p.milestones || []).length,
        timelineVarianceDays,
        timelineVarianceNote,
      });
    }

    const byStatus = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "project_master_summary",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "project_master_summary", count: rows.length },
    });

    return NextResponse.json({
      success: true,
      reportType: "project_master_summary",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter, status: statusFilter },
      summary: {
        totalProjects: rows.length,
        byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      },
      rows,
    });
  } catch (error) {
    console.error("Error generating project master summary report:", error);
    return NextResponse.json(
      { error: "Failed to generate project master summary report", message: error.message },
      { status: 500 }
    );
  }
}
