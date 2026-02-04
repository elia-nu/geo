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

// 9.2 Compliance & Audit Readiness Report: Attendance verification logs, Payroll approval trails, Leave approvals, Document access records
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
    const auditDateQuery = { timestamp: { $gte: startDate, $lte: endDate } };

    const auditLogs = await db
      .collection("audit_logs")
      .find(auditDateQuery)
      .sort({ timestamp: -1 })
      .limit(3000)
      .toArray();

    // Attendance verification: any audit touching daily_attendance (view/approve/reject/verify)
    const attendanceVerificationLogs = auditLogs
      .filter(
        (e) =>
          (e.entityType === "attendance" ||
            e.entityType === "daily_attendance") &&
          ["VIEW", "APPROVE", "REJECT", "VERIFY", "APPROVE_ATTENDANCE", "REJECT_ATTENDANCE"].includes(
            e.action || ""
          )
      )
      .slice(0, 100)
      .map((e) => ({
        timestamp: e.timestamp,
        userId: e.userId,
        userEmail: e.userEmail,
        action: e.action,
        entityId: e.entityId,
        metadata: e.metadata,
      }));

    // Payroll approval trails: any audit touching payroll entities or payroll reports
    const payrollApprovalTrails = auditLogs
      .filter((e) => {
        const type = e.entityType || "";
        const id = e.entityId || "";
        const action = e.action || "";
        return (
          type === "payroll" ||
          (type === "report" && id.includes("payroll")) ||
          (type === "report" &&
            (id === "payroll_summary" ||
              id === "payroll_variance" ||
              id === "payroll_reconciliation")) ||
          (type === "payroll_run" &&
            ["CREATE", "APPROVE", "FINALIZE", "EXPORT"].includes(action))
        );
      })
      .slice(0, 100)
      .map((e) => ({
        timestamp: e.timestamp,
        userId: e.userId,
        userEmail: e.userEmail,
        action: e.action,
        entityId: e.entityId,
        metadata: e.metadata,
      }));

    // Leave approvals: dedicated leave_request audits plus any leave-related reports
    const leaveApprovals = auditLogs
      .filter((e) => {
        const type = e.entityType || "";
        const id = e.entityId || "";
        const action = e.action || "";
        return (
          type === "leave_request" ||
          type === "leave" ||
          ((type === "report" || type === "attendance_document") &&
            id.includes("leave")) ||
          action.startsWith("LEAVE_REQUEST_")
        );
      })
      .slice(0, 100)
      .map((e) => ({
        timestamp: e.timestamp,
        userId: e.userId,
        userEmail: e.userEmail,
        action: e.action,
        entityId: e.entityId,
        metadata: e.metadata,
      }));

    const leaveDocs = await db.collection("attendance_documents").find({
      type: "leave",
      status: "approved",
      $or: [
        { submittedAt: { $gte: startDate, $lte: endDate } },
        { updatedAt: { $gte: startDate, $lte: endDate } },
      ],
    }).sort({ updatedAt: -1 }).limit(100).toArray();

    const documentAccessRecords = auditLogs
      .filter(
        (e) =>
          (e.entityType === "document" ||
            e.entityType === "policy_document" ||
            e.entityType === "attachment") &&
          [
            "DOCUMENT_VIEW",
            "DOCUMENT_DOWNLOAD",
            "DOCUMENT_UPDATE",
            "DOCUMENT_DELETE",
            "VIEW",
            "EXPORT",
          ].includes(e.action || "")
      )
      .slice(0, 100)
      .map((e) => ({
        timestamp: e.timestamp,
        userId: e.userId,
        userEmail: e.userEmail,
        action: e.action,
        entityId: e.entityId,
        metadata: e.metadata,
      }));

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_compliance_audit",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "executive_compliance_audit" },
    });

    return NextResponse.json({
      success: true,
      reportType: "compliance_audit_readiness",
      generatedAt: new Date().toISOString(),
      filters: { startDate: startDate?.toISOString?.()?.slice(0, 10), endDate: endDate?.toISOString?.()?.slice(0, 10) },
      summary: {
        attendanceVerificationCount: attendanceVerificationLogs.length,
        payrollApprovalCount: payrollApprovalTrails.length,
        leaveApprovalCount: leaveApprovals.length + leaveDocs.length,
        documentAccessCount: documentAccessRecords.length,
      },
      attendanceVerificationLogs,
      payrollApprovalTrails,
      leaveApprovals,
      leaveApprovalDocuments: leaveDocs.map((d) => ({
        documentId: d._id?.toString(),
        employeeId: d.employeeId?.toString(),
        leaveType: d.leaveType,
        status: d.status,
        startDate: d.startDate,
        endDate: d.endDate,
        submittedAt: d.submittedAt,
        updatedAt: d.updatedAt,
      })),
      documentAccessRecords,
    });
  } catch (error) {
    console.error("Error generating compliance & audit readiness report:", error);
    return NextResponse.json(
      { error: "Failed to generate compliance & audit readiness report", message: error.message },
      { status: 500 }
    );
  }
}
