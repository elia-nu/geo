import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// 10.2 Workflow Bottleneck & SLA Breach Report
// Focused on delays in:
// - Leave approvals
// - Payroll processing (summary/report runs)
// - Project task closures
// Provides simple root-cause-style aggregates.
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;

    // Configurable SLA thresholds (in hours)
    const leaveSlaHours = Number(
      searchParams.get("leaveSlaHours") || 48
    ); // default 2 days
    const taskSlaHours = Number(
      searchParams.get("taskSlaHours") || 72
    ); // default 3 days from dueDate
    const payrollGraceDays = Number(
      searchParams.get("payrollGraceDays") || 5
    ); // days after month end

    // --- Leave approval bottlenecks (attendance_documents of type=leave) ---
    const leaveDocs = await db
      .collection("attendance_documents")
      .find({
        type: "leave",
        submittedAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ submittedAt: -1 })
      .toArray();

    const leaveDelays = [];
    let leaveTotal = 0;
    let leaveApproved = 0;
    let leaveBreaches = 0;
    let leavePending = 0;

    for (const doc of leaveDocs) {
      leaveTotal += 1;
      const submittedAt = doc.submittedAt
        ? new Date(doc.submittedAt)
        : null;
      const processedAt = doc.processedAt
        ? new Date(doc.processedAt)
        : null;
      const status = doc.status || "pending";

      const endTime =
        status === "pending" || !processedAt ? now : processedAt;
      let hoursToDecision = null;
      if (submittedAt && endTime) {
        hoursToDecision =
          (endTime.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);
      }

      const breached =
        hoursToDecision != null && hoursToDecision > leaveSlaHours;

      if (status === "approved" || status === "rejected") {
        leaveApproved += 1;
      } else if (status === "pending") {
        leavePending += 1;
      }
      if (breached) leaveBreaches += 1;

      leaveDelays.push({
        id: doc._id?.toString(),
        employeeId: doc.employeeId,
        leaveType: doc.leaveType,
        status,
        submittedAt,
        processedAt,
        hoursToDecision,
        slaHours: leaveSlaHours,
        breached,
      });
    }

    // --- Payroll processing bottlenecks (based on payroll_summary audit logs) ---
    const payrollLogs = await db
      .collection("audit_logs")
      .find({
        entityType: "report",
        entityId: "payroll_summary",
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();

    const payrollByPeriod = new Map();
    for (const log of payrollLogs) {
      const m = log.metadata || {};
      const periodMonth = m.month;
      const periodYear = m.year;
      if (!periodMonth || !periodYear) continue;
      const key = `${periodYear}-${String(periodMonth).padStart(2, "0")}`;
      const ts = log.timestamp || log.createdAt || new Date();
      const tsDate = ts instanceof Date ? ts : new Date(ts);
      const existing = payrollByPeriod.get(key);
      if (!existing || tsDate > existing.runAt) {
        const monthEnd = new Date(periodYear, periodMonth, 0);
        const diffMs = tsDate.getTime() - monthEnd.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const breached = diffDays > payrollGraceDays;
        payrollByPeriod.set(key, {
          period: key,
          month: periodMonth,
          year: periodYear,
          runAt: tsDate,
          daysAfterMonthEnd: diffDays,
          graceDays: payrollGraceDays,
          breached,
        });
      }
    }

    const payrollDelays = Array.from(payrollByPeriod.values()).sort(
      (a, b) => a.runAt - b.runAt
    );
    const payrollBreaches = payrollDelays.filter((p) => p.breached).length;

    // --- Task closure bottlenecks (tasks collection) ---
    const tasks = await db
      .collection("tasks")
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ createdAt: -1 })
      .limit(3000)
      .toArray();

    const taskDelays = [];
    let taskTotal = 0;
    let taskCompleted = 0;
    let taskOverdue = 0;

    for (const task of tasks) {
      taskTotal += 1;
      const createdAt = task.createdAt ? new Date(task.createdAt) : null;
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const completedAt = task.completedAt
        ? new Date(task.completedAt)
        : null;
      const status = task.status || "pending";

      let hoursOpen = null;
      const endTime = completedAt || now;
      if (createdAt && endTime) {
        hoursOpen =
          (endTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      }

      let overdue = false;
      if (dueDate) {
        const baseForSla = completedAt || now;
        const diffMs = baseForSla.getTime() - dueDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        overdue = diffHours > taskSlaHours;
      }

      if (status === "completed") {
        taskCompleted += 1;
      }
      if (overdue) taskOverdue += 1;

      taskDelays.push({
        id: task._id?.toString(),
        title: task.title,
        status,
        createdAt,
        dueDate,
        completedAt,
        hoursOpen,
        slaHours: taskSlaHours,
        overdue,
        projectId: task.projectId?.toString?.() || null,
        priority: task.priority || "medium",
      });
    }

    // Root cause style summary
    const summary = {
      leave: {
        totalRequests: leaveTotal,
        approvedOrRejected: leaveApproved,
        pending: leavePending,
        breaches: leaveBreaches,
        avgHoursToDecision:
          leaveDelays.length > 0
            ? Math.round(
                (leaveDelays.reduce(
                  (s, d) => s + (d.hoursToDecision || 0),
                  0
                ) /
                  leaveDelays.length) *
                  10
              ) / 10
            : null,
        slaHours: leaveSlaHours,
      },
      payroll: {
        periodsAnalyzed: payrollDelays.length,
        breaches: payrollBreaches,
        graceDays: payrollGraceDays,
      },
      tasks: {
        totalTasks: taskTotal,
        completed: taskCompleted,
        overdue: taskOverdue,
        avgHoursOpen:
          taskDelays.length > 0
            ? Math.round(
                (taskDelays.reduce(
                  (s, d) => s + (d.hoursOpen || 0),
                  0
                ) /
                  taskDelays.length) *
                  10
              ) / 10
            : null,
        slaHours: taskSlaHours,
      },
    };

    const bottlenecks = [];
    if (summary.leave.breaches > 0) {
      bottlenecks.push({
        area: "Leave approvals",
        indicator: `${summary.leave.breaches} requests breached ${summary.leave.slaHours}h SLA`,
        probableCauses: [
          "High pending volume or long manager response time",
          "Insufficient approver coverage during peak periods",
        ],
      });
    }
    if (summary.payroll.breaches > 0) {
      bottlenecks.push({
        area: "Payroll processing",
        indicator: `${summary.payroll.breaches} payroll periods processed later than ${summary.payroll.graceDays} days after month-end`,
        probableCauses: [
          "Delayed attendance/leave finalization",
          "Manual review or exception handling before payroll run",
        ],
      });
    }
    if (summary.tasks.overdue > 0) {
      bottlenecks.push({
        area: "Project task closures",
        indicator: `${summary.tasks.overdue} tasks exceeded due-date SLA window`,
        probableCauses: [
          "Overloaded assignees or unclear ownership",
          "Dependencies or blocked tasks not escalated in time",
        ],
      });
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "executive_workflow_bottlenecks",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "executive_workflow_bottlenecks",
        filters: {
          startDate: startDate?.toISOString?.()?.slice(0, 10),
          endDate: endDate?.toISOString?.()?.slice(0, 10),
        },
        summary,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "workflow_bottlenecks_sla_breach",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        leaveSlaHours,
        taskSlaHours,
        payrollGraceDays,
      },
      summary,
      bottlenecks,
      leaveDelays: leaveDelays.slice(0, 200),
      payrollDelays,
      taskDelays: taskDelays.slice(0, 300),
      totalLeaveRecords: leaveDelays.length,
      totalTaskRecords: taskDelays.length,
    });
  } catch (error) {
    console.error(
      "Error generating workflow bottleneck & SLA breach report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to generate workflow bottleneck & SLA breach report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

