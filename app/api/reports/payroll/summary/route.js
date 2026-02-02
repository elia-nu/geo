import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 7.1 Payroll Summary Report: Gross pay, Net pay, Deductions, Allowances by Employee, Department, Project, Month
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
    const groupBy = searchParams.get("groupBy") || "employee"; // employee | department | project | month
    const departmentFilter = searchParams.get("department") || null;
    const projectIdFilter = searchParams.get("projectId") || null;

    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

    // Fetch payroll via internal POST to payroll calculate (uses attendance/deductions)
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
    const period = data?.period || { month: targetMonth, year: targetYear };

    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(employees.map((e) => [e._id.toString(), e]));
    const projects = await db.collection("projects").find({}).toArray();
    const projectsByEmpId = new Map();
    projects.forEach((p) => {
      (p.assignedEmployees || []).forEach((eid) => {
        const key = eid.toString();
        if (!projectsByEmpId.has(key)) projectsByEmpId.set(key, []);
        projectsByEmpId.get(key).push({ id: p._id.toString(), name: p.name || "Unnamed" });
      });
    });

    const byEmployee = payrollData.map((row) => {
      const deductions = (row.incomeTax || 0) + (row.employeePension || 0) + (row.deductionAmount || 0);
      return {
        employeeId: row.employeeId,
        employeeName: row.name,
        department: row.department,
        projectNames: (projectsByEmpId.get(row.employeeId) || []).map((p) => p.name).join(", ") || "—",
        month: period.month,
        year: period.year,
        grossPay: row.grossSalary ?? row.adjustedGross ?? 0,
        netPay: row.netSalary ?? 0,
        deductions: Math.round(deductions * 100) / 100,
        allowances: row.transportAllowance ?? 0,
        incomeTax: row.incomeTax ?? 0,
        employeePension: row.employeePension ?? 0,
        deductionDays: row.deductionDays ?? 0,
      };
    });

    let byDepartment = [];
    const deptMap = new Map();
    byEmployee.forEach((row) => {
      if (departmentFilter && row.department !== departmentFilter) return;
      const dept = row.department || "Unassigned";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, grossPay: 0, netPay: 0, deductions: 0, allowances: 0, employeeCount: 0 });
      }
      const d = deptMap.get(dept);
      d.grossPay += row.grossPay;
      d.netPay += row.netPay;
      d.deductions += row.deductions;
      d.allowances += row.allowances;
      d.employeeCount += 1;
    });
    byDepartment = [...deptMap.values()].map((d) => ({
      ...d,
      grossPay: Math.round(d.grossPay * 100) / 100,
      netPay: Math.round(d.netPay * 100) / 100,
      deductions: Math.round(d.deductions * 100) / 100,
      allowances: Math.round(d.allowances * 100) / 100,
    }));

    let byProject = [];
    const projMap = new Map();
    byEmployee.forEach((row) => {
      const projectsForEmp = projectsByEmpId.get(row.employeeId) || [];
      if (projectIdFilter && !projectsForEmp.some((p) => p.id === projectIdFilter)) return;
      if (projectsForEmp.length === 0) {
        const key = "_unassigned";
        if (!projMap.has(key)) projMap.set(key, { projectId: key, projectName: "Unassigned", grossPay: 0, netPay: 0, deductions: 0, allowances: 0, employeeCount: 0 });
        const p = projMap.get(key);
        p.grossPay += row.grossPay;
        p.netPay += row.netPay;
        p.deductions += row.deductions;
        p.allowances += row.allowances;
        p.employeeCount += 1;
      } else {
        projectsForEmp.forEach((proj) => {
          const key = proj.id;
          if (!projMap.has(key)) projMap.set(key, { projectId: key, projectName: proj.name, grossPay: 0, netPay: 0, deductions: 0, allowances: 0, employeeCount: 0 });
          const p = projMap.get(key);
          p.grossPay += row.grossPay;
          p.netPay += row.netPay;
          p.deductions += row.deductions;
          p.allowances += row.allowances;
          p.employeeCount += 1;
        });
      }
    });
    byProject = [...projMap.values()].map((p) => ({
      ...p,
      grossPay: Math.round(p.grossPay * 100) / 100,
      netPay: Math.round(p.netPay * 100) / 100,
      deductions: Math.round(p.deductions * 100) / 100,
      allowances: Math.round(p.allowances * 100) / 100,
    }));

    const summaryTotals = payrollData.reduce(
      (acc, row) => {
        const deductions = (row.incomeTax || 0) + (row.employeePension || 0) + (row.deductionAmount || 0);
        acc.grossPay += row.grossSalary ?? row.adjustedGross ?? 0;
        acc.netPay += row.netSalary ?? 0;
        acc.deductions += deductions;
        acc.allowances += row.transportAllowance ?? 0;
        return acc;
      },
      { grossPay: 0, netPay: 0, deductions: 0, allowances: 0, employeeCount: payrollData.length }
    );
    summaryTotals.grossPay = Math.round(summaryTotals.grossPay * 100) / 100;
    summaryTotals.netPay = Math.round(summaryTotals.netPay * 100) / 100;
    summaryTotals.deductions = Math.round(summaryTotals.deductions * 100) / 100;
    summaryTotals.allowances = Math.round(summaryTotals.allowances * 100) / 100;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "payroll_summary",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "payroll_summary", month: targetMonth, year: targetYear, groupBy },
    });

    return NextResponse.json({
      success: true,
      reportType: "payroll_summary",
      generatedAt: new Date().toISOString(),
      filters: { month: targetMonth, year: targetYear, groupBy, department: departmentFilter, projectId: projectIdFilter },
      summary: summaryTotals,
      period: { month: targetMonth, year: targetYear },
      byEmployee,
      byDepartment,
      byProject,
      byMonth: [{ month: targetMonth, year: targetYear, ...summaryTotals }],
    });
  } catch (error) {
    console.error("Error generating payroll summary report:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll summary report", message: error.message },
      { status: 500 }
    );
  }
}
