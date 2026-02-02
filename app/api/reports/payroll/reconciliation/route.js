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

function workingDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) days++;
  }
  return days;
}

// 7.2 Attendance-to-Payroll Reconciliation: Links attendance days, leave days, overtime hours, absences for payroll validation
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

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const employeeIdFilter = searchParams.get("employeeId") || null;
    const departmentFilter = searchParams.get("department") || null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDate = startParam ? toDate(startParam) : startOfMonth;
    const endDate = endParam ? toDate(endParam) : endOfMonth;
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(employees.map((e) => [e._id.toString(), e]));

    const attendanceQuery = { date: { $gte: startStr, $lte: endStr } };
    if (employeeIdFilter) attendanceQuery.employeeId = new ObjectId(employeeIdFilter);
    const attendanceRecords = await db.collection("daily_attendance").find(attendanceQuery).toArray();

    const leaveQuery = {
      type: { $in: ["leave", "absence"] },
      status: "approved",
      $or: [
        { startDate: { $lte: endStr }, endDate: { $gte: startStr } },
        { startDate: { $gte: startStr, $lte: endStr } },
      ],
    };
    if (employeeIdFilter) leaveQuery.employeeId = new ObjectId(employeeIdFilter);
    const leaveDocs = await db.collection("attendance_documents").find(leaveQuery).toArray();

    const attendanceByEmp = new Map();
    attendanceRecords.forEach((rec) => {
      const empId = (rec.employeeId && rec.employeeId.toString) ? rec.employeeId.toString() : String(rec.employeeId);
      if (!attendanceByEmp.has(empId)) {
        attendanceByEmp.set(empId, { attendanceDays: 0, totalHours: 0, overtimeHours: 0 });
      }
      const a = attendanceByEmp.get(empId);
      a.attendanceDays += 1;
      const hours = typeof rec.workingHours === "number" ? rec.workingHours : 0;
      a.totalHours += hours;
      a.overtimeHours += Math.max(0, hours - 8);
    });

    const leaveDaysByEmp = new Map();
    leaveDocs.forEach((doc) => {
      const empId = (doc.employeeId && doc.employeeId.toString) ? doc.employeeId.toString() : String(doc.employeeId);
      const start = toDate(doc.startDate) || new Date(doc.startDate);
      const end = toDate(doc.endDate) || new Date(doc.endDate);
      if (!start || !end) return;
      const overlapStart = new Date(Math.max(start.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), endDate.getTime()));
      if (overlapEnd < overlapStart) return;
      const days = workingDaysBetween(overlapStart, overlapEnd);
      leaveDaysByEmp.set(empId, (leaveDaysByEmp.get(empId) || 0) + days);
    });

    const totalWorkingDays = workingDaysBetween(startDate, endDate);
    const empIds = new Set([...attendanceByEmp.keys(), ...leaveDaysByEmp.keys(), ...employees.map((e) => e._id.toString())]);
    const rows = [];
    empIds.forEach((empId) => {
      const emp = empById.get(empId);
      const department = emp?.department || emp?.personalDetails?.department || "Unassigned";
      if (departmentFilter && department !== departmentFilter) return;

      const att = attendanceByEmp.get(empId) || { attendanceDays: 0, totalHours: 0, overtimeHours: 0 };
      const leaveDays = leaveDaysByEmp.get(empId) || 0;
      const expectedPresent = totalWorkingDays - leaveDays;
      const absences = Math.max(0, expectedPresent - att.attendanceDays);

      rows.push({
        employeeId: empId,
        employeeName: emp?.personalDetails?.name || emp?.name || "Unknown",
        department,
        attendanceDays: att.attendanceDays,
        leaveDays,
        overtimeHours: Math.round(att.overtimeHours * 100) / 100,
        totalHours: Math.round(att.totalHours * 100) / 100,
        absences,
        expectedWorkingDays: totalWorkingDays,
        validationNote: absences > 0 ? "Check absences vs payroll deductions" : "OK",
      });
    });

    const summary = {
      totalEmployees: rows.length,
      totalAttendanceDays: rows.reduce((s, r) => s + r.attendanceDays, 0),
      totalLeaveDays: rows.reduce((s, r) => s + r.leaveDays, 0),
      totalOvertimeHours: Math.round(rows.reduce((s, r) => s + r.overtimeHours, 0) * 100) / 100,
      totalAbsences: rows.reduce((s, r) => s + r.absences, 0),
      periodWorkingDays: totalWorkingDays,
    };

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "payroll_reconciliation",
      userId: user.userId,
      userEmail: user.email,
      metadata: { reportType: "payroll_reconciliation", startStr, endStr },
    });

    return NextResponse.json({
      success: true,
      reportType: "payroll_reconciliation",
      generatedAt: new Date().toISOString(),
      filters: { startDate: startStr, endDate: endStr, employeeId: employeeIdFilter, department: departmentFilter },
      summary,
      rows,
    });
  } catch (error) {
    console.error("Error generating payroll reconciliation report:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll reconciliation report", message: error.message },
      { status: 500 }
    );
  }
}
