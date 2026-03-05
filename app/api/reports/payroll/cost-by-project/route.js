import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 7.4 Payroll Cost by Project: Workforce cost per Project, Site, Department, Phase/milestone
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
    const groupBy = searchParams.get("groupBy") || "project"; // project | site | department | phase

    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    const origin = new URL(request.url).origin;
    const authHeader = request.headers.get("authorization") || "";
    const res = await fetch(`${origin}/api/payroll/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authHeader && { Authorization: authHeader }) },
      body: JSON.stringify({ month: targetMonth, year: targetYear }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Failed to load payroll data", message: err.message },
        { status: res.status }
      );
    }
    const { data } = await res.json();
    const payrollData = data?.payrollData || [];

    const payrollByEmpId = new Map(payrollData.map((r) => [r.employeeId, r]));

    const projects = await db.collection("projects").find({}).toArray();
    const workLocations = await db.collection("work_locations").find({}).toArray();
    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(employees.map((e) => [e._id.toString(), e]));

    const byProject = [];
    const projectCostMap = new Map();
    projects.forEach((proj) => {
      const assigned = (proj.assignedEmployees || []).map((id) => id.toString());
      let grossPay = 0, netPay = 0, allowances = 0, deductions = 0;
      assigned.forEach((empId) => {
        const row = payrollByEmpId.get(empId);
        if (!row) return;
        grossPay += row.grossSalary ?? row.adjustedGross ?? 0;
        netPay += row.netSalary ?? 0;
        allowances += row.transportAllowance ?? 0;
        deductions += (row.incomeTax || 0) + (row.employeePension || 0) + (row.deductionAmount || 0);
      });
      projectCostMap.set(proj._id.toString(), {
        projectId: proj._id.toString(),
        projectName: proj.name || "Unnamed",
        employeeCount: assigned.length,
        grossPay: Math.round(grossPay * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        allowances: Math.round(allowances * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
      });
    });
    byProject.push(...projectCostMap.values());

    const bySite = [];
    const siteCostMap = new Map();
    workLocations.forEach((loc) => {
      const assigned = (loc.assignedEmployees || []).map((id) => id.toString());
      let grossPay = 0, netPay = 0;
      assigned.forEach((empId) => {
        const row = payrollByEmpId.get(empId);
        if (!row) return;
        grossPay += row.grossSalary ?? row.adjustedGross ?? 0;
        netPay += row.netSalary ?? 0;
      });
      siteCostMap.set(loc._id.toString(), {
        siteId: loc._id.toString(),
        siteName: loc.name || "Unnamed",
        employeeCount: assigned.length,
        grossPay: Math.round(grossPay * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
      });
    });
    bySite.push(...siteCostMap.values());

    const byDepartment = [];
    const deptCostMap = new Map();
    payrollData.forEach((row) => {
      const dept = row.department || "Unassigned";
      if (!deptCostMap.has(dept)) {
        deptCostMap.set(dept, { department: dept, employeeCount: 0, grossPay: 0, netPay: 0 });
      }
      const d = deptCostMap.get(dept);
      d.employeeCount += 1;
      d.grossPay += row.grossSalary ?? row.adjustedGross ?? 0;
      d.netPay += row.netSalary ?? 0;
    });
    byDepartment.push(...[...deptCostMap.entries()].map(([k, v]) => ({
      department: k,
      employeeCount: v.employeeCount,
      grossPay: Math.round(v.grossPay * 100) / 100,
      netPay: Math.round(v.netPay * 100) / 100,
    })));

    const byPhase = [];
    projects.forEach((proj) => {
      const projId = proj._id.toString();
      const cost = projectCostMap.get(projId);
      const milestones = proj.milestones || [];
      if (milestones.length === 0) {
        byPhase.push({
          projectId: projId,
          projectName: proj.name || "Unnamed",
          phaseName: "Overall",
          milestoneId: null,
          employeeCount: cost?.employeeCount ?? 0,
          grossPay: cost?.grossPay ?? 0,
          netPay: cost?.netPay ?? 0,
        });
      } else {
        const costPerPhase = (cost?.grossPay ?? 0) / milestones.length;
        const netPerPhase = (cost?.netPay ?? 0) / milestones.length;
        milestones.forEach((m) => {
          byPhase.push({
            projectId: projId,
            projectName: proj.name || "Unnamed",
            phaseName: m.title || m.name || "Phase",
            milestoneId: m._id?.toString?.() || m.id,
            employeeCount: cost?.employeeCount ?? 0,
            grossPay: Math.round(costPerPhase * 100) / 100,
            netPay: Math.round(netPerPhase * 100) / 100,
          });
        });
      }
    });

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "payroll_cost_by_project",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "payroll_cost_by_project", month: targetMonth, year: targetYear, groupBy },
    });

    return NextResponse.json({
      success: true,
      reportType: "payroll_cost_by_project",
      generatedAt: new Date().toISOString(),
      filters: { month: targetMonth, year: targetYear, groupBy },
      period: { month: targetMonth, year: targetYear },
      byProject,
      bySite,
      byDepartment,
      byPhase,
    });
  } catch (error) {
    console.error("Error generating payroll cost-by-project report:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll cost-by-project report", message: error.message },
      { status: 500 }
    );
  }
}
