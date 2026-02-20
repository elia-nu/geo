import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

const VARIANCE_THRESHOLD_PERCENT = 20; // flag if net/gross changes by more than this

// 7.3 Payroll Variance & Anomaly: Sudden spikes/drops in salary, overtime anomalies, missing deductions
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view payroll reports." },
        { status: 403 }
      );
    }

    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 1) {
      prevMonth += 12;
      prevYear -= 1;
    }

    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization") || "";

    const [currentRes, previousRes] = await Promise.all([
      fetch(`${origin}/api/payroll/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
        body: JSON.stringify({ month: targetMonth, year: targetYear }),
      }),
      fetch(`${origin}/api/payroll/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
        body: JSON.stringify({ month: prevMonth, year: prevYear }),
      }),
    ]);

    if (!currentRes.ok || !previousRes.ok) {
      return NextResponse.json(
        { error: "Failed to load payroll data for comparison" },
        { status: 500 }
      );
    }

    const currentData = (await currentRes.json()).data?.payrollData || [];
    const previousData = (await previousRes.json()).data?.payrollData || [];
    const prevByEmpId = new Map(previousData.map((r) => [r.employeeId, r]));

    const anomalies = [];
    const varianceRows = [];

    currentData.forEach((curr) => {
      const empId = curr.employeeId;
      const prev = prevByEmpId.get(empId);
      const currNet = curr.netSalary ?? 0;
      const currGross = curr.grossSalary ?? curr.adjustedGross ?? 0;
      const prevNet = prev?.netSalary ?? 0;
      const prevGross = prev?.grossSalary ?? prev?.adjustedGross ?? 0;

      const netChange = currNet - prevNet;
      const grossChange = currGross - prevGross;
      const netChangePercent = prevNet !== 0 ? (netChange / prevNet) * 100 : (currNet !== 0 ? 100 : 0);
      const grossChangePercent = prevGross !== 0 ? (grossChange / prevGross) * 100 : (currGross !== 0 ? 100 : 0);

      varianceRows.push({
        employeeId: empId,
        employeeName: curr.name,
        department: curr.department,
        currentMonth: { month: targetMonth, year: targetYear, netPay: currNet, grossPay: currGross },
        previousMonth: { month: prevMonth, year: prevYear, netPay: prevNet, grossPay: prevGross },
        netChange,
        grossChange,
        netChangePercent: Math.round(netChangePercent * 100) / 100,
        grossChangePercent: Math.round(grossChangePercent * 100) / 100,
      });

      if (Math.abs(netChangePercent) >= VARIANCE_THRESHOLD_PERCENT && prevNet !== 0) {
        anomalies.push({
          type: "salary_variance",
          severity: Math.abs(netChangePercent) >= 50 ? "high" : "medium",
          employeeId: empId,
          employeeName: curr.name,
          description: netChangePercent > 0 ? `Net pay increased by ${netChangePercent.toFixed(1)}%` : `Net pay decreased by ${Math.abs(netChangePercent).toFixed(1)}%`,
          currentNet: currNet,
          previousNet: prevNet,
        });
      }

      // Do not flag "income tax is zero but gross above threshold" as an anomaly (per business rule)
    });

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "payroll_variance",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "payroll_variance", month: targetMonth, year: targetYear, anomalyCount: anomalies.length },
    });

    return NextResponse.json({
      success: true,
      reportType: "payroll_variance",
      generatedAt: new Date().toISOString(),
      filters: { month: targetMonth, year: targetYear },
      period: { currentMonth: targetMonth, currentYear: targetYear, previousMonth: prevMonth, previousYear: prevYear },
      summary: {
        totalEmployees: currentData.length,
        anomalyCount: anomalies.length,
        varianceThresholdPercent: VARIANCE_THRESHOLD_PERCENT,
      },
      varianceRows,
      anomalies,
    });
  } catch (error) {
    console.error("Error generating payroll variance report:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll variance report", message: error.message },
      { status: 500 }
    );
  }
}
