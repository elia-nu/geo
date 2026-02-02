import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

// 6.2 Leave Balance & Entitlement Report
// Current leave balances per employee; overused / underutilized indicators
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

    const departmentFilter = searchParams.get("department") || null;
    const showOverusedOnly = searchParams.get("overusedOnly") === "true";
    const showUnderutilizedOnly = searchParams.get("underutilizedOnly") === "true";

    const employees = await db.collection("employees").find({}).toArray();
    const leaveBalances = await db
      .collection("leave_balances")
      .find({})
      .toArray();

    const balanceByEmpId = new Map();
    leaveBalances.forEach((lb) => {
      balanceByEmpId.set(lb.employeeId.toString(), lb);
    });

    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const leaveRequests = await db
      .collection("attendance_documents")
      .find({
        type: "leave",
        startDate: { $gte: startOfYear.toISOString().split("T")[0] },
      })
      .toArray();

    const usedPendingByEmp = new Map();
    leaveRequests.forEach((req) => {
      const empId =
        req.employeeId && req.employeeId.toString
          ? req.employeeId.toString()
          : String(req.employeeId);
      if (!usedPendingByEmp.has(empId))
        usedPendingByEmp.set(empId, { used: {}, pending: {} });
      const days = calculateLeaveDays(req.startDate, req.endDate);
      const lt = req.leaveType || "annual";
      if (req.status === "approved") {
        usedPendingByEmp.get(empId).used[lt] =
          (usedPendingByEmp.get(empId).used[lt] || 0) + days;
      } else if (req.status === "pending") {
        usedPendingByEmp.get(empId).pending[lt] =
          (usedPendingByEmp.get(empId).pending[lt] || 0) + days;
      }
    });

    const entitlementDefaults = {
      annual: 20,
      sick: 10,
      personal: 5,
      maternity: 90,
      paternity: 14,
      bereavement: 3,
      emergency: 5,
    };

    const rows = [];
    for (const emp of employees) {
      const empId = emp._id.toString();
      const department =
        emp.department || emp.personalDetails?.department || "Unassigned";
      if (departmentFilter && department !== departmentFilter) continue;

      let lb = balanceByEmpId.get(empId);
      if (!lb) {
        lb = {
          employeeId: emp._id,
          balances: {},
          employmentDate:
            emp.joiningDate
              ? new Date(emp.joiningDate + "T00:00:00.000Z")
              : emp.createdAt,
        };
        Object.keys(entitlementDefaults).forEach((lt) => {
          lb.balances[lt] = {
            available: entitlementDefaults[lt],
            used: 0,
            pending: 0,
            totalEarned: entitlementDefaults[lt],
            description: lt,
          };
        });
      }

      const up = usedPendingByEmp.get(empId) || { used: {}, pending: {} };
      const balanceBreakdown = {};
      let anyOverused = false;
      let anyUnderutilized = false;

      Object.keys(lb.balances || {}).forEach((leaveType) => {
        const b = lb.balances[leaveType];
        const used = up.used[leaveType] || 0;
        const pending = up.pending[leaveType] || 0;
        const available = (b.available != null ? b.available : b.totalEarned) - used - pending;
        const entitlement = entitlementDefaults[leaveType] ?? b.totalEarned ?? 0;
        const effectiveAvailable = Math.max(0, available);
        if (available < 0) anyOverused = true;
        if (
          leaveType === "annual" &&
          entitlement > 0 &&
          used < Math.floor(entitlement * 0.3)
        ) {
          anyUnderutilized = true;
        }
        balanceBreakdown[leaveType] = {
          entitlement,
          used,
          pending,
          available: effectiveAvailable,
          overused: available < 0 ? Math.abs(available) : 0,
        };
      });

      if (showOverusedOnly && !anyOverused) continue;
      if (showUnderutilizedOnly && !anyUnderutilized) continue;

      rows.push({
        employeeId: empId,
        employeeName: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department,
        designation: emp.designation || emp.personalDetails?.designation || "",
        balances: balanceBreakdown,
        overused: anyOverused,
        underutilized: anyUnderutilized,
      });
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "leave_balance_entitlement",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "leave_balance_entitlement",
        filters: { department: departmentFilter },
        recordCount: rows.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "leave_balance_entitlement",
      generatedAt: new Date().toISOString(),
      filters: { department: departmentFilter, overusedOnly: showOverusedOnly, underutilizedOnly: showUnderutilizedOnly },
      rows,
      totalEmployees: rows.length,
    });
  } catch (error) {
    console.error("Error generating leave balance & entitlement report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate leave balance & entitlement report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
