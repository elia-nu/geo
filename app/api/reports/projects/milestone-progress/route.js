import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 8.2 Project Milestone Progress Report: Planned vs actual milestone completion, Delay risk indicators
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

    const query = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      query._id = new ObjectId(projectIdFilter);
    }

    const projects = await db.collection("projects").find(query).toArray();
    const now = new Date();
    const rows = [];
    const delayRisks = [];

    for (const p of projects) {
      const milestones = p.milestones || [];
      for (const m of milestones) {
        const dueDate = m.dueDate ? new Date(m.dueDate) : null;
        const plannedComplete = dueDate ? dueDate.toISOString().slice(0, 10) : null;
        const actualComplete = m.completedDate ? new Date(m.completedDate).toISOString().slice(0, 10) : null;
        const status = m.status || "pending";
        const progress = m.progress ?? 0;
        const isOverdue = dueDate && dueDate < now && status !== "completed";
        const daysOverdue = isOverdue && dueDate ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

        rows.push({
          projectId: p._id.toString(),
          projectName: p.name || "Unnamed",
          milestoneId: m._id?.toString(),
          milestoneTitle: m.title || m.name || "Milestone",
          plannedCompletion: plannedComplete,
          actualCompletion: actualComplete,
          status,
          progress,
          isOverdue,
          daysOverdue,
          delayRisk: isOverdue ? (daysOverdue > 7 ? "high" : "medium") : "none",
        });

        if (isOverdue) {
          delayRisks.push({
            projectId: p._id.toString(),
            projectName: p.name || "Unnamed",
            milestoneTitle: m.title || m.name || "Milestone",
            dueDate: plannedComplete,
            daysOverdue,
            risk: daysOverdue > 7 ? "high" : "medium",
          });
        }
      }
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "project_milestone_progress",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "project_milestone_progress", milestoneCount: rows.length, delayRiskCount: delayRisks.length },
    });

    return NextResponse.json({
      success: true,
      reportType: "project_milestone_progress",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter },
      summary: {
        totalMilestones: rows.length,
        completed: rows.filter((r) => r.status === "completed").length,
        delayed: rows.filter((r) => r.isOverdue).length,
        delayRiskCount: delayRisks.length,
      },
      rows,
      delayRiskIndicators: delayRisks,
    });
  } catch (error) {
    console.error("Error generating project milestone progress report:", error);
    return NextResponse.json(
      { error: "Failed to generate project milestone progress report", message: error.message },
      { status: 500 }
    );
  }
}
