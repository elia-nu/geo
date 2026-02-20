import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 10.3 User Activity & Security Audit Report
// - Logins (success/failure)
// - Permission / role changes
// - Suspicious activity patterns (simple heuristics)
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
    const actor = searchParams.get("actor"); // optional filter

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;

    const dateQuery = {
      timestamp: { $gte: startDate, $lte: endDate },
    };

    const auditLogs = await db
      .collection("audit_logs")
      .find(dateQuery)
      .sort({ timestamp: -1 })
      .limit(5000)
      .toArray();

    // Filter by actor if requested
    const filteredLogs = auditLogs.filter((e) => {
      if (!actor) return true;
      const needle = actor.toLowerCase();
      const id = (e.userId || "").toString().toLowerCase();
      const email = (e.userEmail || "").toLowerCase();
      return id.includes(needle) || email.includes(needle);
    });

    // --- Login activity ---
    const loginEvents = filteredLogs.filter(
      (e) => e.entityType === "auth"
    );

    const loginSummary = {
      success: 0,
      failure: 0,
      total: 0,
      successRate: null,
    };

    const loginDetails = [];
    for (const ev of loginEvents) {
      const a = ev.action || "";
      const isSuccess = a === "LOGIN" || a === "LOGIN_SUCCESS";
      const isFailure = a === "LOGIN_FAILURE";
      if (isSuccess) loginSummary.success += 1;
      if (isFailure) loginSummary.failure += 1;
      if (isSuccess || isFailure) {
        loginSummary.total += 1;
        loginDetails.push({
          id: ev._id?.toString?.() || ev.id || "",
          timestamp: ev.timestamp || ev.createdAt || null,
          actor: ev.userEmail || ev.userId || "system",
          action: ev.action,
          ip:
            ev.ipAddress ||
            ev.metadata?.ip ||
            ev.metadata?.ipAddress ||
            null,
          userAgent: ev.userAgent || ev.metadata?.userAgent || null,
        });
      }
    }
    if (loginSummary.total > 0) {
      loginSummary.successRate = Math.round(
        (loginSummary.success / loginSummary.total) * 10000
      ) / 100;
    }

    // --- Suspicious activity patterns (simple heuristics) ---
    const suspiciousPatterns = [];

    // 1) Multiple login failures for same account in short period
    const failuresByUser = new Map();
    for (const ev of loginDetails) {
      if (ev.action !== "LOGIN_FAILURE") continue;
      const key = ev.actor || "unknown";
      if (!failuresByUser.has(key)) failuresByUser.set(key, []);
      failuresByUser.get(key).push(ev);
    }
    for (const [actorKey, events] of failuresByUser.entries()) {
      if (events.length >= 5) {
        const sorted = [...events].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        const first = new Date(sorted[0].timestamp);
        const last = new Date(
          sorted[sorted.length - 1].timestamp
        );
        const diffMinutes =
          (last.getTime() - first.getTime()) / (1000 * 60);
        if (diffMinutes <= 60) {
          suspiciousPatterns.push({
            type: "multiple_login_failures",
            actor: actorKey,
            failures: events.length,
            windowMinutes: Math.round(diffMinutes),
            detail:
              "High number of failed login attempts in a short window.",
          });
        }
      }
    }

    // 2) Admin-level activity without clear audit metadata
    const adminLikeEvents = filteredLogs.filter((e) => {
      const role = e.metadata?.userRole || "";
      return (
        role === "ADMIN" &&
        !e.metadata?.reason &&
        (e.action || "").toUpperCase() === "DELETE"
      );
    });
    if (adminLikeEvents.length > 0) {
      suspiciousPatterns.push({
        type: "admin_delete_without_reason",
        count: adminLikeEvents.length,
        detail:
          "Admin delete actions without explicit reason metadata were detected.",
      });
    }

    const summary = {
      loginSummary,
      suspiciousCount: suspiciousPatterns.length,
    };

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_user_activity_security",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "executive_user_activity_security",
        filters: {
          startDate: startDate?.toISOString?.()?.slice(0, 10),
          endDate: endDate?.toISOString?.()?.slice(0, 10),
          actor: actor || null,
        },
        suspiciousCount: suspiciousPatterns.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "user_activity_security_audit",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        actor: actor || null,
      },
      summary,
      logins: loginDetails.slice(0, 500),
      suspiciousPatterns,
    });
  } catch (error) {
    console.error(
      "Error generating user activity & security audit report:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Failed to generate user activity & security audit report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

