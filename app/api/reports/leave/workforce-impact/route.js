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

function workingDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

// 6.3 Leave Impact on Workforce Availability Report
// Projects affected by leave; coverage gaps; replacement demand forecasts
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
            "Access denied. You don't have permission to view leave reports.",
        },
        { status: 403 }
      );
    }

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const projectIdFilter = searchParams.get("projectId") || null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;

    const projects = await db.collection("projects").find({}).toArray();
    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(employees.map((e) => [e._id.toString(), e]));

    const assignedByProject = new Map();
    projects.forEach((p) => {
      const id = p._id.toString();
      assignedByProject.set(
        id,
        (p.assignedEmployees || []).map((eid) => eid.toString())
      );
    });

    const leaveRequests = await db
      .collection("attendance_documents")
      .find({
        type: "leave",
        status: { $in: ["approved", "pending"] },
      })
      .toArray();

    const leaveByEmpId = new Map();
    leaveRequests.forEach((req) => {
      const empId =
        req.employeeId && req.employeeId.toString
          ? req.employeeId.toString()
          : String(req.employeeId);
      const start = toDate(req.startDate) || new Date(req.startDate);
      const end = toDate(req.endDate) || new Date(req.endDate);
      if (!start || !end) return;
      const days = workingDaysBetween(start, end);
      const overlapStart = new Date(Math.max(start.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), endDate.getTime()));
      if (overlapEnd < overlapStart) return;
      const overlappingDays = workingDaysBetween(overlapStart, overlapEnd);
      if (!leaveByEmpId.has(empId)) leaveByEmpId.set(empId, []);
      leaveByEmpId.get(empId).push({
        startDate: req.startDate,
        endDate: req.endDate,
        leaveType: req.leaveType,
        status: req.status,
        days,
        overlappingDays,
      });
    });

    const projectsAffected = [];
    const coverageGaps = [];
    const replacementDemand = new Map();

    for (const project of projects) {
      const projectId = project._id.toString();
      if (projectIdFilter && projectId !== projectIdFilter) continue;

      const assigned = assignedByProject.get(projectId) || [];
      let onLeaveCount = 0;
      const onLeaveEmployees = [];

      assigned.forEach((empId) => {
        const leaves = leaveByEmpId.get(empId) || [];
        const totalOverlapping = leaves.reduce((s, l) => s + l.overlappingDays, 0);
        if (totalOverlapping > 0) {
          onLeaveCount++;
          const emp = empById.get(empId);
          onLeaveEmployees.push({
            employeeId: empId,
            employeeName: emp?.personalDetails?.name || emp?.name || "Unknown",
            department: emp?.department || emp?.personalDetails?.department || "",
            totalDaysOnLeave: totalOverlapping,
            leaves,
          });
        }
      });

      if (onLeaveCount > 0) {
        projectsAffected.push({
          projectId,
          projectName: project.name || "Unnamed",
          totalAssigned: assigned.length,
          onLeaveCount,
          onLeaveEmployees,
        });

        if (assigned.length > 0 && onLeaveCount >= assigned.length) {
          coverageGaps.push({
            projectId,
            projectName: project.name || "Unnamed",
            assignedCount: assigned.length,
            onLeaveCount,
            gap: "Full coverage gap - all assigned staff on leave in period",
          });
        } else if (onLeaveCount > 0) {
          const replacementNeeded = onLeaveCount;
          const key = projectId;
          replacementDemand.set(key, {
            projectId,
            projectName: project.name || "Unnamed",
            replacementFte: replacementNeeded,
            onLeaveCount,
            suggestedCoverage: `Up to ${replacementNeeded} replacement(s) recommended for the period`,
          });
        }
      }
    }

    const replacementList = [...replacementDemand.values()];

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "leave_workforce_impact",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "leave_workforce_impact",
        filters: { startDate, endDate, projectIdFilter },
        projectsAffected: projectsAffected.length,
        coverageGaps: coverageGaps.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "leave_workforce_impact",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        projectId: projectIdFilter,
      },
      summary: {
        projectsAffectedCount: projectsAffected.length,
        coverageGapsCount: coverageGaps.length,
        totalReplacementDemand: replacementList.reduce(
          (s, r) => s + (r.replacementFte || 0),
          0
        ),
      },
      projectsAffected,
      coverageGaps,
      replacementDemandForecast: replacementList,
    });
  } catch (error) {
    console.error("Error generating leave workforce impact report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate leave workforce impact report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
