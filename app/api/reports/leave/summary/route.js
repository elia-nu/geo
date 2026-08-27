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

function calculateLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  return Math.max(1, isNaN(daysDiff) ? 1 : daysDiff);
}

// 6.1 Leave Request Summary Report
// Total requests by: Type (annual, sick, emergency), Status (approved/rejected/pending), Department/project/site/person
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

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const departmentFilter = searchParams.get("department") || null;
    const projectIdFilter = searchParams.get("projectId") || null;
    const siteIdFilter = searchParams.get("locationId") || null;
    const employeeIdFilter = searchParams.get("employeeId") || null;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endDate = endParam
      ? toDate(endParam)
      : new Date(now.getFullYear(), 11, 31);
    const startDate = startParam ? toDate(startParam) : startOfYear;

    const employees = await db.collection("employees").find({}).toArray();
    const empById = new Map(
      employees.map((e) => [e._id.toString(), e])
    );
    const projects = await db.collection("projects").find({}).toArray();
    const workLocations = await db.collection("work_locations").find({}).toArray();
    const locById = new Map(
      workLocations.map((l) => [l._id.toString(), l])
    );

    const projectsByEmpId = new Map();
    projects.forEach((p) => {
      if (!Array.isArray(p.assignedEmployees)) return;
      p.assignedEmployees.forEach((eid) => {
        const key = eid.toString();
        if (!projectsByEmpId.has(key)) projectsByEmpId.set(key, []);
        projectsByEmpId.get(key).push({
          id: p._id.toString(),
          name: p.name || "Unnamed Project",
        });
      });
    });

    const query = { type: "leave" };
    if (startDate && endDate) {
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      query.startDate = { $lte: endStr };
      query.endDate = { $gte: startStr };
    }

    const leaveRequests = await db
      .collection("attendance_documents")
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    const byType = new Map();
    const byStatus = new Map();
    const byDepartment = new Map();
    const byProject = new Map();
    const bySite = new Map();
    const byPerson = new Map();

    function ensure(map, key, defaults = {}) {
      if (!map.has(key)) map.set(key, { key, name: key, total: 0, ...defaults });
      return map.get(key);
    }

    let totalProcessed = 0;
    let totalDaysAll = 0;
    let totalApprovedDays = 0;

    for (const req of leaveRequests) {
      const empId =
        req.employeeId && req.employeeId.toString
          ? req.employeeId.toString()
          : String(req.employeeId);
      const emp = empById.get(empId);
      const empName =
        emp?.personalDetails?.name || emp?.name || req.employeeName || "Unknown Employee";
      const empCode =
        emp?.employeeId || emp?.personalDetails?.employeeId || "—";
      const department =
        emp?.department || emp?.personalDetails?.department || "Unassigned";
      const designation =
        emp?.designation || emp?.personalDetails?.designation || "Staff";

      const siteIds = [];
      if (Array.isArray(emp?.workLocations)) {
        emp.workLocations.forEach((lid) => siteIds.push(lid.toString()));
      } else if (emp?.workLocation) {
        siteIds.push(
          emp.workLocation.toString
            ? emp.workLocation.toString()
            : String(emp.workLocation)
        );
      }
      const empProjects = projectsByEmpId.get(empId) || [];

      if (departmentFilter && department !== departmentFilter) continue;
      if (
        projectIdFilter &&
        !empProjects.some((p) => p.id === projectIdFilter)
      )
      if (siteIdFilter && !siteIds.includes(siteIdFilter)) continue;
      if (employeeIdFilter) {
        const filterVal = employeeIdFilter.trim().toLowerCase();
        const matchesId = empId.toLowerCase() === filterVal;
        const matchesCode = String(empCode).toLowerCase().includes(filterVal);
        const matchesName = String(empName).toLowerCase().includes(filterVal);
        if (!matchesId && !matchesCode && !matchesName) continue;
      }

      const leaveType = req.leaveType || "other";
      const status = req.status || "pending";
      const days = calculateLeaveDays(req.startDate, req.endDate);

      totalDaysAll += days;
      if (status === "approved") {
        totalApprovedDays += days;
      }

      byType.set(leaveType, (byType.get(leaveType) || 0) + 1);
      byStatus.set(status, (byStatus.get(status) || 0) + 1);

      // 1. Department aggregation
      const deptRow = ensure(byDepartment, department, { department });
      deptRow.total += 1;
      deptRow.days = (deptRow.days || 0) + days;
      if (status === "approved") deptRow.approved = (deptRow.approved || 0) + 1;
      else if (status === "rejected") deptRow.rejected = (deptRow.rejected || 0) + 1;
      else deptRow.pending = (deptRow.pending || 0) + 1;

      // 2. Site aggregation
      if (siteIds.length === 0) {
        const siteRow = ensure(bySite, "Unassigned", { siteName: "Unassigned" });
        siteRow.total += 1;
      } else {
        siteIds.forEach((sid) => {
          const loc = locById.get(sid);
          const siteName = loc?.name || "Location";
          const siteRow = ensure(bySite, sid, { siteId: sid, siteName });
          siteRow.total += 1;
        });
      }

      // 3. Project aggregation
      if (empProjects.length === 0) {
        const projRow = ensure(byProject, "Unassigned", {
          projectId: "unassigned",
          projectName: "Unassigned Project",
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          totalDays: 0,
          approvedDays: 0,
          employeeIds: new Set(),
        });
        projRow.total += 1;
        projRow.totalDays += days;
        if (status === "approved") {
          projRow.approved += 1;
          projRow.approvedDays += days;
        } else if (status === "rejected") {
          projRow.rejected += 1;
        } else {
          projRow.pending += 1;
        }
        projRow.employeeIds.add(empId);
      } else {
        empProjects.forEach((p) => {
          const projRow = ensure(byProject, p.id, {
            projectId: p.id,
            projectName: p.name,
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            totalDays: 0,
            approvedDays: 0,
            employeeIds: new Set(),
          });
          projRow.total += 1;
          projRow.totalDays += days;
          if (status === "approved") {
            projRow.approved += 1;
            projRow.approvedDays += days;
          } else if (status === "rejected") {
            projRow.rejected += 1;
          } else {
            projRow.pending += 1;
          }
          projRow.employeeIds.add(empId);
        });
      }

      // 4. Person (Employee) aggregation
      const personRow = ensure(byPerson, empId, {
        employeeId: empId,
        employeeName: empName,
        employeeCode: empCode,
        department,
        designation,
        projectNames: empProjects.map((p) => p.name).join(", ") || "None",
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        totalDays: 0,
        approvedDays: 0,
        byType: {},
      });

      personRow.total += 1;
      personRow.totalDays += days;
      if (status === "approved") {
        personRow.approved += 1;
        personRow.approvedDays += days;
      } else if (status === "rejected") {
        personRow.rejected += 1;
      } else {
        personRow.pending += 1;
      }

      if (!personRow.byType[leaveType]) {
        personRow.byType[leaveType] = { count: 0, days: 0 };
      }
      personRow.byType[leaveType].count += 1;
      personRow.byType[leaveType].days += days;

      totalProcessed += 1;
    }

    const formattedProjects = [...byProject.values()].map((p) => ({
      ...p,
      uniqueEmployeesCount: p.employeeIds ? p.employeeIds.size : 0,
      employeeIds: undefined,
    }));

    const formattedPersons = [...byPerson.values()].sort((a, b) =>
      b.totalDays - a.totalDays || a.employeeName.localeCompare(b.employeeName)
    );

    const summary = {
      totalRequests: totalProcessed,
      totalDays: totalDaysAll,
      totalApprovedDays: totalApprovedDays,
      totalPersons: formattedPersons.length,
      totalProjects: formattedProjects.length,
      byType: [...byType.entries()].map(([k, v]) => ({ type: k, count: v })),
      byStatus: [...byStatus.entries()].map(([k, v]) => ({
        status: k,
        count: v,
      })),
    };

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "leave_request_summary",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "leave_request_summary",
        filters: {
          startDate: startDate?.toISOString?.()?.slice(0, 10),
          endDate: endDate?.toISOString?.()?.slice(0, 10),
          department: departmentFilter,
          projectId: projectIdFilter,
          locationId: siteIdFilter,
          employeeId: employeeIdFilter,
        },
        totalRequests: totalProcessed,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "leave_request_summary",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate?.toISOString?.()?.slice(0, 10),
        endDate: endDate?.toISOString?.()?.slice(0, 10),
        department: departmentFilter,
        projectId: projectIdFilter,
        locationId: siteIdFilter,
        employeeId: employeeIdFilter,
      },
      summary,
      byDepartment: [...byDepartment.values()],
      byProject: formattedProjects,
      byPerson: formattedPersons,
      bySite: [...bySite.values()],
      totalRecords: totalProcessed,
    });
  } catch (error) {
    console.error("Error generating leave request summary report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate leave request summary report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
