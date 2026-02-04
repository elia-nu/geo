import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

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
    const showUnderutilizedOnly =
      searchParams.get("underutilizedOnly") === "true";

    // Only active employees should be included in this report
    const employees = await db
      .collection("employees")
      .find({ status: "active" })
      .toArray();
    const leaveBalances = await db
      .collection("leave_balances")
      .find({})
      .toArray();

    const balanceByEmpId = new Map();
    leaveBalances.forEach((lb) => {
      balanceByEmpId.set(lb.employeeId.toString(), lb);
    });

    // Fallback entitlements only when there is no leave_balances record yet
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

      // If no leave_balances record exists yet, synthesize a basic one from defaults
      if (!lb) {
        const balances = {};
        Object.keys(entitlementDefaults).forEach((lt) => {
          const entitlement = entitlementDefaults[lt];
          balances[lt] = {
            totalEarned: entitlement,
            available: entitlement,
            used: 0,
            pending: 0,
            description: lt,
          };
        });
        lb = {
          employeeId: emp._id,
          balances,
        };
      }

      const balanceBreakdown = {};
      let anyOverused = false;
      let anyUnderutilized = false;

      Object.keys(lb.balances || {}).forEach((leaveType) => {
        const b = lb.balances[leaveType] || {};

        const entitlement =
          (typeof b.totalEarned === "number" ? b.totalEarned : null) ??
          entitlementDefaults[leaveType] ??
          0;
        const used = typeof b.used === "number" ? b.used : 0;
        const pending = typeof b.pending === "number" ? b.pending : 0;
        const available =
          typeof b.available === "number"
            ? b.available
            : Math.max(0, entitlement - used - pending);

        // Overused when used + pending exceeds entitlement
        const overusedAmount =
          used + pending > entitlement ? used + pending - entitlement : 0;
        if (overusedAmount > 0) anyOverused = true;

        // Underutilized: for annual leave, using less than 30% of entitlement
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
          available,
          overused: overusedAmount,
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
