import { NextResponse } from "next/server";
import { getDb } from "../../../mongo.js";
import { getCurrentUser, checkPermission } from "../../../middleware/auth.js";
import { createAuditLog } from "../../../../utils/audit.js";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

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
            "Access denied. You don't have permission to view employee portal activity reports.",
        },
        { status: 403 }
      );
    }

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const actor = searchParams.get("actor"); // filter by employee name/email/ID
    const actionCategory = searchParams.get("actionCategory") || "all"; // all, attendance, leave_overtime, documents, security, tasks
    const statusFilter = searchParams.get("status") || "all"; // all, success, failed

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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

    function categorizePortalActivity(ev) {
      const a = (ev.action || "").toUpperCase();
      const t = (ev.entityType || "").toLowerCase();

      // Attendance & Clock in/out
      if (
        a.startsWith("EMPLOYEE_CHECK_") ||
        a.startsWith("EMPLOYEE_LUNCH_") ||
        a.includes("GEOFENCE") ||
        a.includes("FACE_VERIFY") ||
        t === "daily_attendance" ||
        t === "attendance" ||
        t === "face_verification"
      ) {
        return "attendance";
      }

      // Leave & Overtime
      if (
        a.includes("LEAVE") ||
        a.includes("OVERTIME") ||
        t === "leave_request" ||
        t === "overtime_request" ||
        (t === "attendance_document" &&
          (ev.metadata?.leaveType || ev.metadata?.type === "leave"))
      ) {
        return "leave_overtime";
      }

      // Documents & Excuses
      if (
        t === "attendance_document" ||
        t === "document" ||
        a.includes("DOCUMENT")
      ) {
        return "documents";
      }

      // Password & Profile Security
      if (
        a.includes("PASSWORD") ||
        a.includes("LOGIN") ||
        a.includes("PHOTO") ||
        (t === "employee" && (a.includes("UPDATE") || a.includes("PASSWORD")))
      ) {
        return "security";
      }

      // Tasks & Assigned Activities
      if (
        t === "task" ||
        a.includes("TASK")
      ) {
        return "tasks";
      }

      // If actor role is EMPLOYEE or action was initiated by employee
      if (ev.userRole === "EMPLOYEE" || ev.metadata?.portalOrigin === "employee_portal") {
        return "other_portal";
      }

      return null;
    }

    function isPortalEvent(ev, category) {
      if (!category) return false;
      const a = (ev.action || "").toUpperCase();
      const role = (ev.userRole || "").toUpperCase();
      const t = (ev.entityType || "").toLowerCase();

      // Direct self-service operations
      if (
        a.startsWith("EMPLOYEE_") ||
        a.startsWith("SUBMIT_") ||
        a.startsWith("PASSWORD_CHANGE") ||
        a.includes("GEOFENCE_VALIDATION") ||
        a.includes("FACE_VERIF")
      ) {
        return true;
      }

      // If actor is employee
      if (role === "EMPLOYEE") {
        return true;
      }

      // If document was submitted by employee
      if (t === "attendance_document" && a === "SUBMIT_ATTENDANCE_DOCUMENT") {
        return true;
      }

      // If overtime submitted by employee
      if (t === "overtime_request" && a === "SUBMIT_OVERTIME_REQUEST") {
        return true;
      }

      return false;
    }

    const events = [];
    const summary = {
      totalPortalEvents: 0,
      successCount: 0,
      failedCount: 0,
      byActivity: {
        attendance: 0,
        leave_overtime: 0,
        documents: 0,
        security: 0,
        tasks: 0,
        other_portal: 0,
      },
    };

    for (const ev of rawLogs) {
      const category = categorizePortalActivity(ev);
      if (!isPortalEvent(ev, category)) continue;

      if (actionCategory !== "all" && category !== actionCategory) {
        continue;
      }

      const s = String(ev.status || "").toUpperCase();
      const isFailed =
        s === "FAILED" ||
        s === "FAILURE" ||
        s === "ERROR" ||
        ev.action === "ACCESS_DENIED" ||
        ev.action?.includes("FAIL") ||
        ev.action?.includes("DENIED") ||
        ev.metadata?.error ||
        ev.metadata?.success === false;

      const eventStatus = isFailed ? "FAILED" : "SUCCESS";

      if (statusFilter !== "all") {
        if (statusFilter === "success" && eventStatus !== "SUCCESS") continue;
        if (statusFilter === "failed" && eventStatus !== "FAILED") continue;
      }

      const actorId = ev.userId || "";
      const actorEmail = ev.userEmail || "";
      const actorName = ev.userName || ev.metadata?.employeeName || "";

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

      summary.totalPortalEvents += 1;
      if (eventStatus === "SUCCESS") {
        summary.successCount += 1;
      } else {
        summary.failedCount += 1;
      }
      if (category && summary.byActivity[category] !== undefined) {
        summary.byActivity[category] += 1;
      }

      // Determine human-readable activity title & details
      let activityTitle = ev.action.replace(/_/g, " ");
      if (ev.action === "EMPLOYEE_CHECK_IN") activityTitle = "Clocked In";
      else if (ev.action === "EMPLOYEE_CHECK_OUT") activityTitle = "Clocked Out";
      else if (ev.action === "EMPLOYEE_LUNCH_IN") activityTitle = "Lunch Break Started";
      else if (ev.action === "EMPLOYEE_LUNCH_OUT") activityTitle = "Lunch Break Ended";
      else if (ev.action === "GEOFENCE_VALIDATION_FAILED") activityTitle = "Geofence Check Failed";
      else if (ev.action === "SUBMIT_ATTENDANCE_DOCUMENT") activityTitle = "Submitted Excuse/Leave Request";
      else if (ev.action === "SUBMIT_OVERTIME_REQUEST") activityTitle = "Submitted Overtime Request";
      else if (ev.action === "PASSWORD_CHANGE_SUCCESS") activityTitle = "Changed Account Password";
      else if (ev.action === "PASSWORD_CHANGE_FAILED") activityTitle = "Password Change Failed";
      else if (ev.action === "UPLOAD_EMPLOYEE_PHOTO") activityTitle = "Updated Profile Photo";

      events.push({
        id: ev.id || ev._id?.toString?.() || "",
        employeeId: actorId,
        employeeName: actorName || "Employee",
        employeeEmail: actorEmail,
        timestamp: ev.timestamp || ev.createdAt,
        action: ev.action,
        activityTitle,
        category,
        status: eventStatus,
        changes: ev.changes || null,
        metadata: ev.metadata || null,
        ipAddress: ev.ipAddress || null,
        userAgent: ev.userAgent || null,
        errorReason: isFailed
          ? ev.metadata?.error ||
            ev.metadata?.reason ||
            ev.metadata?.message ||
            "Validation or security check failure"
          : null,
      });
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_employee_portal_activities",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_portal_activities",
        filters: {
          startDate: startDate?.toISOString()?.slice(0, 10),
          endDate: endDate?.toISOString()?.slice(0, 10),
          actor: actor || null,
          actionCategory,
          statusFilter,
        },
        totalEvents: summary.totalPortalEvents,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "employee_portal_activities",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString()?.slice(0, 10),
        endDate: endDate?.toISOString()?.slice(0, 10),
        actor: actor || null,
        actionCategory,
        statusFilter,
      },
      summary,
      events: events.slice(0, 1000),
      totalRecords: events.length,
    });
  } catch (error) {
    console.error("Error generating employee portal activities report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate employee portal activities report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
