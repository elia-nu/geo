import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 9.1 System Operational Health Report: Login success/failure, API response times, Failed payroll runs, Attendance sync errors
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view executive reports." },
        { status: 403 }
      );
    }

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;
    const dateQuery = { timestamp: { $gte: startDate, $lte: endDate } };

    const auditLogs = await db.collection("audit_logs").find(dateQuery).sort({ timestamp: -1 }).limit(2000).toArray();

    const loginSuccess = auditLogs.filter((e) => e.entityType === "auth" && (e.action === "LOGIN" || e.action === "LOGIN_SUCCESS")).length;
    const loginFailure = auditLogs.filter((e) => e.entityType === "auth" && e.action === "LOGIN_FAILURE").length;
    const loginTotal = loginSuccess + loginFailure || 1;
    const loginSuccessRate = loginTotal > 0 ? Math.round((loginSuccess / loginTotal) * 10000) / 100 : null;

    const payrollRuns = auditLogs.filter((e) => e.entityType === "payroll" || (e.entityType === "report" && (e.entityId || "").includes("payroll")));
    const failedPayrollRuns = auditLogs.filter((e) => e.entityType === "payroll" && (e.metadata?.success === false || e.action === "FAILED"));
    const attendanceSyncErrors = auditLogs.filter((e) => e.entityType === "attendance" && (e.action === "SYNC_ERROR" || e.metadata?.syncError === true));

    const byEntityType = {};
    auditLogs.forEach((e) => {
      const k = e.entityType || "other";
      byEntityType[k] = (byEntityType[k] || 0) + 1;
    });

    const apiActivity = Object.entries(byEntityType).map(([type, count]) => ({ type, count }));

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_system_health",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "executive_system_health" },
    });

    return NextResponse.json({
      success: true,
      reportType: "system_operational_health",
      generatedAt: new Date().toISOString(),
      filters: { startDate: startDate?.toISOString?.()?.slice(0, 10), endDate: endDate?.toISOString?.()?.slice(0, 10) },
      summary: {
        loginSuccess,
        loginFailure,
        loginSuccessRate,
        totalAuditEvents: auditLogs.length,
        failedPayrollRunsCount: failedPayrollRuns.length,
        attendanceSyncErrorsCount: attendanceSyncErrors.length,
      },
      loginSummary: { success: loginSuccess, failure: loginFailure, successRate: loginSuccessRate },
      apiActivity,
      failedPayrollRuns: failedPayrollRuns.slice(0, 50).map((e) => ({
        timestamp: e.timestamp,
        userId: e.userId,
        entityId: e.entityId,
        metadata: e.metadata,
      })),
      attendanceSyncErrors: attendanceSyncErrors.slice(0, 50).map((e) => ({
        timestamp: e.timestamp,
        entityId: e.entityId,
        metadata: e.metadata,
      })),
      note: "Login and API response metrics rely on audit_logs. Ensure auth and API middleware log to audit_logs for full visibility.",
    });
  } catch (error) {
    console.error("Error generating system operational health report:", error);
    return NextResponse.json(
      { error: "Failed to generate system operational health report", message: error.message },
      { status: 500 }
    );
  }
}
