import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 8.5 Project Risk & Issue Tracking Report: Delays, Resource shortages, Compliance breaches, Escalations
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
    const typeFilter = searchParams.get("type") || null; // delay | resource | compliance | escalation

    const alertsQuery = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      alertsQuery.projectId = new ObjectId(projectIdFilter);
    }

    const alerts = await db.collection("project_alerts")
      .find(alertsQuery)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const projectIds = [...new Set(alerts.map((a) => a.projectId?.toString()).filter(Boolean))];
    const projects = projectIds.length
      ? await db.collection("projects").find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];
    const projectById = new Map(projects.map((p) => [p._id.toString(), p]));

    const now = new Date();
    const delays = [];
    const resourceShortages = [];
    const complianceBreaches = [];
    const escalations = [];

    for (const a of alerts) {
      const projId = a.projectId?.toString();
      const project = projId ? projectById.get(projId) : null;
      const projectName = project?.name || projId || "Unknown";
      const entry = {
        alertId: a._id.toString(),
        projectId: projId,
        projectName,
        alertType: a.alertType,
        message: a.message,
        status: a.status,
        priority: a.priority || "medium",
        createdAt: a.createdAt,
      };

      const typeRaw = a.alertType || "";
      const type = typeRaw.toLowerCase();
      let category = "delay";

      // Map known auto-generated alert types first
      if (
        type === "overdue_project" ||
        type === "overdue_task" ||
        type === "missed_milestone"
      ) {
        // Critical timeline issues are treated as escalations
        category = "escalation";
      } else if (type === "low_progress") {
        // Low progress against timeline is effectively a resource/capacity risk
        category = "resource";
      } else if (
        type.includes("delay") ||
        type.includes("deadline") ||
        type.includes("timeline") ||
        type.includes("milestone")
      ) {
        category = "delay";
      } else if (
        type.includes("resource") ||
        type.includes("shortage") ||
        type.includes("workforce") ||
        type.includes("staff")
      ) {
        category = "resource";
      } else if (
        type.includes("compliance") ||
        type.includes("breach") ||
        type.includes("violation")
      ) {
        category = "compliance";
      } else if (
        type.includes("escalat") ||
        a.priority === "high" ||
        a.priority === "critical"
      ) {
        category = "escalation";
      } else {
        category = "delay";
      }
      if (typeFilter && category !== typeFilter) continue;

      if (category === "delay") delays.push(entry);
      else if (category === "resource") resourceShortages.push(entry);
      else if (category === "compliance") complianceBreaches.push(entry);
      else escalations.push(entry);
    }

    const projectsWithOverdueMilestones = new Set();
    const projectList = projectIdFilter && ObjectId.isValid(projectIdFilter)
      ? await db.collection("projects").find({ _id: new ObjectId(projectIdFilter) }).toArray()
      : await db.collection("projects").find({}).toArray();

    for (const p of projectList) {
      const milestones = p.milestones || [];
      const overdue = milestones.some((m) => m.dueDate && new Date(m.dueDate) < now && m.status !== "completed");
      if (overdue) {
        projectsWithOverdueMilestones.add(p._id.toString());
        if (!typeFilter || typeFilter === "delay") {
          const count = milestones.filter((m) => m.dueDate && new Date(m.dueDate) < now && m.status !== "completed").length;
          delays.push({
            alertId: null,
            projectId: p._id.toString(),
            projectName: p.name || "Unnamed",
            alertType: "milestone_delay",
            message: `${count} milestone(s) overdue`,
            status: "open",
            priority: "medium",
            createdAt: p.updatedAt || p.createdAt,
          });
        }
      }
    }

    const summary = {
      totalAlerts: alerts.length,
      delays: delays.length,
      resourceShortages: resourceShortages.length,
      complianceBreaches: complianceBreaches.length,
      escalations: escalations.length,
      projectsWithDelays: projectsWithOverdueMilestones.size,
    };

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "project_risk_issue_tracking",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "project_risk_issue_tracking", projectId: projectIdFilter, summary },
    });

    return NextResponse.json({
      success: true,
      reportType: "project_risk_issue_tracking",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter, type: typeFilter },
      summary,
      delays,
      resourceShortages,
      complianceBreaches,
      escalations,
    });
  } catch (error) {
    console.error("Error generating project risk & issue tracking report:", error);
    return NextResponse.json(
      { error: "Failed to generate project risk & issue tracking report", message: error.message },
      { status: 500 }
    );
  }
}
