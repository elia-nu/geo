import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 8.3 Project Workforce Utilization Report: Employee-hours per Project, Site, Role, Phase
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
    const startParam = searchParams.get("startDate") || null;
    const endParam = searchParams.get("endDate") || null;

    const now = new Date();
    const startDate = startParam ? new Date(startParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endParam ? new Date(endParam) : new Date();

    const tasksQuery = {
      projectId: { $exists: true, $ne: null },
      $or: [
        { dueDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    };
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      tasksQuery.projectId = new ObjectId(projectIdFilter);
    }

    const tasks = await db.collection("tasks").find(tasksQuery).toArray();
    const projectIds = [...new Set(tasks.map((t) => t.projectId?.toString()).filter(Boolean))];
    const projects = await db.collection("projects").find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } }).toArray();
    const projectById = new Map(projects.map((p) => [p._id.toString(), p]));
    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(employees.map((e) => [e._id.toString(), e]));
    const workLocations = await db.collection("work_locations").find({}).toArray();
    const locById = new Map(workLocations.map((l) => [l._id.toString(), l]));

    const byProject = new Map();
    const bySite = new Map();
    const byRole = new Map();
    const byPhase = new Map();

    for (const task of tasks) {
      const projId = task.projectId?.toString();
      const project = projId ? projectById.get(projId) : null;
      const hours = task.actualHours || task.estimatedHours || 0;
      if (hours <= 0) continue;

    const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    const employeeMultiplier = assignedTo.length > 0 ? assignedTo.length : 1;
    const employeeHoursForTask = hours * employeeMultiplier;

      if (projId) {
      const cur =
        byProject.get(projId) || {
          projectId: projId,
          projectName: project?.name || "Unnamed",
          employeeHours: 0,
          taskCount: 0,
        };
      // Employee-hours per project: task hours multiplied by number of assignees (or 1 if unassigned)
      cur.employeeHours += employeeHoursForTask;
        cur.taskCount += 1;
        byProject.set(projId, cur);
      }

      for (const empId of assignedTo) {
        const eid = empId?.toString?.() || String(empId);
        const emp = empById.get(eid);
        const role = emp?.designation || emp?.personalDetails?.designation || "Unassigned";
      const roleCur =
        byRole.get(role) || { role, employeeHours: 0, taskCount: 0 };
        roleCur.employeeHours += hours;
        roleCur.taskCount += 1;
        byRole.set(role, roleCur);

        const siteIds = emp?.workLocations || (emp?.workLocation ? [emp.workLocation] : []);
        for (const sid of siteIds) {
          const siteId = sid?.toString?.() || String(sid);
          const loc = locById.get(siteId);
          const siteName = loc?.name || siteId;
          const siteCur = bySite.get(siteId) || { siteId, siteName, employeeHours: 0, taskCount: 0 };
          siteCur.employeeHours += hours;
          siteCur.taskCount += 1;
          bySite.set(siteId, siteCur);
        }
        if (siteIds.length === 0) {
          const unassignedKey = "_unassigned";
          const siteCur = bySite.get(unassignedKey) || { siteId: unassignedKey, siteName: "Unassigned", employeeHours: 0, taskCount: 0 };
          siteCur.employeeHours += hours;
          siteCur.taskCount += 1;
          bySite.set(unassignedKey, siteCur);
        }
      }

    // By Milestone / Phase: try to link tasks to actual project milestones.
    // We only count a task here if we can resolve a real milestone;
    // otherwise it is excluded from the phase view (no generic "general" bucket).
    if (project && Array.isArray(project.milestones) && project.milestones.length > 0) {
      let phaseId = null;
      let phaseName = null;

      if (task.milestoneId) {
        const taskMilestoneId = task.milestoneId.toString();
        const milestone =
          project.milestones.find((m) => {
            const mid1 = m._id?.toString?.();
            const mid2 = m.id?.toString?.();
            return mid1 === taskMilestoneId || mid2 === taskMilestoneId;
          }) || null;

        if (milestone) {
          phaseId =
            milestone._id?.toString?.() ||
            milestone.id?.toString?.() ||
            taskMilestoneId;
          phaseName = milestone.title || milestone.name || "Milestone";
        }
      }

      if (phaseId && phaseName) {
        const phaseCur =
          byPhase.get(phaseId) || {
            phaseId,
            phaseName,
            employeeHours: 0,
            taskCount: 0,
          };
        // Employee-hours per phase: same multiplier as per project
        phaseCur.employeeHours += employeeHoursForTask;
        phaseCur.taskCount += 1;
        byPhase.set(phaseId, phaseCur);
      }
    }
    }

  // Ensure all defined project milestones appear in the phase list,
  // even if no tasks have been explicitly linked to them yet.
  for (const project of projects) {
    if (!Array.isArray(project.milestones)) continue;
    for (const m of project.milestones) {
      const mid =
        m._id?.toString?.() ||
        (typeof m.id !== "undefined" ? String(m.id) : null);
      if (!mid) continue;
      if (!byPhase.has(mid)) {
        byPhase.set(mid, {
          phaseId: mid,
          phaseName: m.title || m.name || "Milestone",
          employeeHours: 0,
          taskCount: 0,
        });
      }
    }
  }

    const byProjectList = [...byProject.values()].map((x) => ({
      ...x,
      employeeHours: Math.round(x.employeeHours * 100) / 100,
    }));
    const bySiteList = [...bySite.values()].map((x) => ({
      ...x,
      employeeHours: Math.round(x.employeeHours * 100) / 100,
    }));
    const byRoleList = [...byRole.values()].map((x) => ({
      ...x,
      employeeHours: Math.round(x.employeeHours * 100) / 100,
    }));
    const byPhaseList = [...byPhase.values()].map((x) => ({
      ...x,
      employeeHours: Math.round(x.employeeHours * 100) / 100,
    }));

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "project_workforce_utilization",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "project_workforce_utilization", projectId: projectIdFilter },
    });

    return NextResponse.json({
      success: true,
      reportType: "project_workforce_utilization",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter, startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10) },
      summary: {
        totalEmployeeHours: Math.round(
          (byProjectList.reduce((s, x) => s + x.employeeHours, 0)) * 100
        ) / 100,
        projectCount: byProjectList.length,
      },
      byProject: byProjectList,
      bySite: bySiteList,
      byRole: byRoleList,
      byPhase: byPhaseList,
    });
  } catch (error) {
    console.error("Error generating project workforce utilization report:", error);
    return NextResponse.json(
      { error: "Failed to generate project workforce utilization report", message: error.message },
      { status: 500 }
    );
  }
}
