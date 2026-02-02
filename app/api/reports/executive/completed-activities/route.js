import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 10.1 Completed Activities Report (Master Audit Report)
// Every completed transaction across key modules:
// - Attendance check-in/out
// - Leave approvals
// - Payroll report runs
// - Document uploads
// - Project & task updates
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
            "Access denied. You don't have permission to view executive reports.",
        },
        { status: 403 }
      );
    }

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const actor = searchParams.get("actor"); // optional filter by userId/email substring
    const moduleFilter = searchParams.get("module"); // attendance|leave|payroll|documents|projects|all

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;

    const dateQuery = {
      timestamp: { $gte: startDate, $lte: endDate },
    };

    const rawLogs = await db
      .collection("audit_logs")
      .find(dateQuery)
      .sort({ timestamp: -1 })
      .limit(5000)
      .toArray();

    const targetModules =
      moduleFilter && moduleFilter !== "all"
        ? new Set([moduleFilter])
        : new Set(["attendance", "leave", "payroll", "documents", "projects"]);

    const events = [];
    const summary = {
      totalEvents: 0,
      byModule: {
        attendance: 0,
        leave: 0,
        payroll: 0,
        documents: 0,
        projects: 0,
      },
      byStatus: {
        success: 0,
        failed: 0,
        other: 0,
      },
    };

    function classifyModule(ev) {
      const t = (ev.entityType || "").toLowerCase();
      const action = ev.action || "";
      const id = (ev.entityId || "").toString().toLowerCase();

      if (
        t === "daily_attendance" ||
        t === "attendance" ||
        action.startsWith("EMPLOYEE_CHECK_") ||
        action === "UPDATE_ATTENDANCE"
      ) {
        return "attendance";
      }

      if (
        t === "leave_request" ||
        t === "leave_balance" ||
        t === "leave" ||
        (t === "attendance_document" &&
          (ev.metadata?.leaveType || ev.metadata?.documentType) === "leave")
      ) {
        return "leave";
      }

      if (
        t === "payroll" ||
        (t === "report" && id.includes("payroll"))
      ) {
        return "payroll";
      }

      if (
        t === "document" ||
        t === "attendance_document" ||
        id.includes("document")
      ) {
        return "documents";
      }

      if (
        t === "project" ||
        t === "task" ||
        t === "project_alert" ||
        t === "project_budget" ||
        t === "project_milestone"
      ) {
        return "projects";
      }

      return null;
    }

    function classifyOutcome(ev) {
      if (ev.metadata && ev.metadata.success === false) {
        return "failed";
      }
      const a = ev.action || "";
      if (a.endsWith("_FAIL") || a.endsWith("_FAILED")) return "failed";
      if (
        a === "EMPLOYEE_CHECK_IN" ||
        a === "EMPLOYEE_CHECK_OUT" ||
        a === "EMPLOYEE_LUNCH_IN" ||
        a === "EMPLOYEE_LUNCH_OUT" ||
        a.startsWith("LEAVE_REQUEST_") ||
        a === "SUBMIT_ATTENDANCE_DOCUMENT" ||
        a === "REVIEW_ATTENDANCE_DOCUMENT" ||
        a === "CREATE" ||
        a === "UPDATE" ||
        a === "CREATE_TASK" ||
        a === "UPDATE_TASK" ||
        a === "COMPLETE_TASK"
      ) {
        return "success";
      }
      return "other";
    }

    for (const ev of rawLogs) {
      const module = classifyModule(ev);
      if (!module || !targetModules.has(module)) continue;

      const actorId = ev.userId || "";
      const actorEmail = ev.userEmail || "";
      if (actor) {
        const needle = actor.toLowerCase();
        if (
          !actorId.toString().toLowerCase().includes(needle) &&
          !actorEmail.toLowerCase().includes(needle)
        ) {
          continue;
        }
      }

      const outcome = classifyOutcome(ev);

      summary.totalEvents += 1;
      summary.byModule[module] = (summary.byModule[module] || 0) + 1;
      summary.byStatus[outcome] = (summary.byStatus[outcome] || 0) + 1;

      events.push({
        id: ev.id || ev._id?.toString?.() || "",
        actor: actorEmail || actorId || "system",
        actorId: actorId || null,
        actorEmail: actorEmail || null,
        timestamp: ev.timestamp || ev.createdAt || null,
        module,
        action: ev.action,
        status: outcome,
        outcome:
          ev.metadata?.outcome ||
          ev.metadata?.status ||
          ev.metadata?.newStatus ||
          outcome,
        source: ev.entityType,
        entityId: ev.entityId,
        metadata: ev.metadata || null,
      });
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_completed_activities",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "executive_completed_activities",
        filters: {
          startDate: startDate?.toISOString?.()?.slice(0, 10),
          endDate: endDate?.toISOString?.()?.slice(0, 10),
          actor: actor || null,
          module: moduleFilter || "all",
        },
        totalEvents: summary.totalEvents,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "completed_activities_master_audit",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        actor: actor || null,
        module: moduleFilter || "all",
      },
      summary,
      events: events.slice(0, 1000),
      totalRecords: events.length,
      note:
        "This master audit view is built from audit_logs. Ensure key workflows log to audit_logs for full coverage.",
    });
  } catch (error) {
    console.error(
      "Error generating completed activities (master audit) report:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to generate completed activities (master audit) report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

