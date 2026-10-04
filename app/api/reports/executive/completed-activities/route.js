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
      "reports.executive",
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
        : new Set([
            "attendance",
            "leave",
            "overtime",
            "payroll",
            "documents",
            "projects",
            "employee",
          ]);

    const events = [];
    const summary = {
      totalEvents: 0,
      byModule: {
        attendance: 0,
        leave: 0,
        overtime: 0,
        payroll: 0,
        documents: 0,
        projects: 0,
        employee: 0,
      },
      byStatus: {
        success: 0,
        failed: 0,
        other: 0,
      },
    };

    function classifyModule(ev) {
      const t = (ev.entityType || "").toLowerCase();
      const action = (ev.action || "").toUpperCase();
      const id = (ev.entityId || "").toString().toLowerCase();

      // Attendance
      if (
        t === "daily_attendance" ||
        t === "attendance" ||
        t === "geofence" ||
        t === "face_verification" ||
        action.startsWith("EMPLOYEE_CHECK_") ||
        action.startsWith("EMPLOYEE_LUNCH_") ||
        action.includes("ATTENDANCE") ||
        action.includes("GEOFENCE")
      ) {
        return "attendance";
      }

      // Overtime (Dedicated Category)
      if (
        t === "overtime_request" ||
        t === "overtime_attendance" ||
        t.includes("overtime") ||
        action.includes("OVERTIME")
      ) {
        return "overtime";
      }

      // Leave
      if (
        t === "leave_request" ||
        t === "leave_balance" ||
        t === "leave" ||
        t.includes("leave") ||
        action.includes("LEAVE") ||
        (t === "attendance_document" &&
          (ev.metadata?.leaveType ||
            ev.metadata?.documentType === "leave" ||
            ev.metadata?.type === "leave"))
      ) {
        return "leave";
      }

      // Payroll
      if (
        t === "payroll" ||
        t.includes("payroll") ||
        action.includes("PAYROLL") ||
        (t === "report" && id.includes("payroll"))
      ) {
        return "payroll";
      }

      // Documents
      if (
        t === "document" ||
        t === "attendance_document" ||
        id.includes("document") ||
        action.includes("DOCUMENT")
      ) {
        return "documents";
      }

      // Projects & Budgets & Tasks
      if (
        t === "project" ||
        t === "task" ||
        t === "project_alert" ||
        t === "project_budget" ||
        t === "project_milestone" ||
        t === "project_expense" ||
        t === "project_income" ||
        t === "project_payment" ||
        t === "budget_allocation" ||
        t === "budget_allocation_category" ||
        t === "income_category" ||
        t === "task_category" ||
        t.includes("project") ||
        t.includes("budget") ||
        t.includes("expense") ||
        t.includes("income") ||
        t.includes("milestone") ||
        t.includes("task") ||
        action.includes("PROJECT") ||
        action.includes("BUDGET") ||
        action.includes("EXPENSE") ||
        action.includes("INCOME") ||
        action.includes("MILESTONE") ||
        action.includes("TASK")
      ) {
        return "projects";
      }

      // Employee & Organization & Roles
      // Employee, Organization, Roles & Authentication
      if (
        t === "employee" ||
        t === "employee_photo" ||
        t === "department" ||
        t === "designation" ||
        t === "work_location" ||
        t === "role" ||
        t === "user_role" ||
        t === "user" ||
        t === "auth" ||
        t.includes("employee") ||
        t.includes("department") ||
        t.includes("designation") ||
        t.includes("location") ||
        t.includes("role") ||
        t.includes("auth") ||
        action.startsWith("EMPLOYEE_") ||
        action.startsWith("BULK_") ||
        action.startsWith("PASSWORD_") ||
        action.startsWith("LOGIN_") ||
        action.includes("DEPARTMENT") ||
        action.includes("DESIGNATION") ||
        action.includes("ROLE") ||
        action.includes("WORK_LOCATION")
      ) {
        return "employee";
      }

      return null;
    }

    function classifyOutcome(ev) {
      const s = String(ev.status || "").toUpperCase();
      if (s === "FAILED" || s === "FAILURE" || s === "ERROR") return "failed";
      if (ev.metadata && (ev.metadata.success === false || ev.metadata.error))
        return "failed";
      const a = (ev.action || "").toUpperCase();
      if (
        a === "ACCESS_DENIED" ||
        a.includes("FAIL") ||
        a.includes("DENIED") ||
        a.includes("ERROR") ||
        a.includes("REJECT")
      ) {
        return "failed";
      }
      if (s === "SUCCESS") return "success";
      return "success";
    }

    function formatOutcomeDescription(ev, outcome) {
      if (outcome === "failed") {
        return (
          ev.metadata?.error ||
          ev.metadata?.reason ||
          ev.metadata?.rejectionReason ||
          (ev.action === "LOGIN_FAILURE" ? "Invalid login credentials" : null) ||
          ev.metadata?.message ||
          "Operation failed or rejected"
        );
      }
      if (ev.metadata?.summary) return ev.metadata.summary;
      if (ev.metadata?.description) return ev.metadata.description;
      if (ev.metadata?.note) return ev.metadata.note;

      const act = (ev.action || "").toUpperCase();
      const entity = (ev.entityType || "").replace(/_/g, " ");

      if (act === "LOGIN_SUCCESS") return "User authenticated successfully";
      if (act === "LEAVE_REQUEST_APPROVE") return "Leave request approved";
      if (act === "LEAVE_REQUEST_REJECT") return `Leave request rejected${ev.metadata?.reason ? `: ${ev.metadata.reason}` : ""}`;
      if (act === "REVIEW_OVERTIME_REQUEST") return `Overtime request reviewed (${ev.metadata?.newStatus || "updated"})`;
      if (act === "CREATE") return `Created ${entity}`;
      if (act === "UPDATE") return `Updated ${entity}`;
      if (act === "DELETE") return `Deleted ${entity}`;
      if (act === "CALCULATE") return `Calculated ${entity}`;
      if (act === "VIEW") return `Viewed ${entity}`;
      if (act === "EXPORT") return `Exported ${entity} data`;
      if (act === "BULK_IMPORT")
        return `Imported ${ev.metadata?.count || "bulk"} records`;
      if (act === "EMPLOYEE_CHECK_IN") return "Clocked in successfully";
      if (act === "EMPLOYEE_CHECK_OUT") return "Clocked out successfully";
      if (act === "SUBMIT_ATTENDANCE_DOCUMENT")
        return "Submitted excuse/leave document";
      if (act === "SUBMIT_OVERTIME_REQUEST") return "Submitted overtime request";
      if (act === "PASSWORD_CHANGE_SUCCESS")
        return "Password updated successfully";
      if (act === "ROLE_ASSIGNED")
        return `Assigned role ${ev.metadata?.newRole || ""}`;

      return "Completed successfully";
    }

    for (const ev of rawLogs) {
      const module = classifyModule(ev);
      if (!module || !targetModules.has(module)) continue;

      const actorId = ev.userId || "";
      const actorEmail = ev.userEmail || "";
      const actorName = ev.userName || "";
      if (actor) {
        const needle = actor.toLowerCase();
        if (
          !actorId.toString().toLowerCase().includes(needle) &&
          !actorEmail.toLowerCase().includes(needle) &&
          !actorName.toLowerCase().includes(needle)
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
        actor: actorName
          ? `${actorName} (${actorEmail || actorId})`
          : actorEmail || actorId || "System",
        actorId: actorId || null,
        actorEmail: actorEmail || null,
        actorName: actorName || null,
        actorRole: ev.userRole || null,
        timestamp: ev.timestamp || ev.createdAt || null,
        module,
        action: ev.action,
        status: outcome,
        outcome: formatOutcomeDescription(ev, outcome),
        source: ev.entityType,
        entityId: ev.entityId,
        changes: ev.changes || null,
        metadata: ev.metadata || null,
        ipAddress: ev.ipAddress || null,
        userAgent: ev.userAgent || null,
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

