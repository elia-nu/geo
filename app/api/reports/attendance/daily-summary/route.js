import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 5.1 Daily Attendance Summary Report
// Present / Absent / Late / Early checkout by Site, Project, Department, Shift
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
            "Access denied. You don't have permission to view attendance reports.",
        },
        { status: 403 }
      );
    }

    const dateParam = searchParams.get("date");
    const departmentFilter = scanNull(searchParams.get("department"));
    const projectIdFilter = searchParams.get("projectId");
    const locationIdFilter = searchParams.get("locationId");
    const shiftFilter = scanNull(searchParams.get("shift"));

    const date =
      dateParam && dateParam.trim() !== ""
        ? dateParam.trim()
        : new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Load active employees (exclude clearly terminated/inactive where possible)
    const employees = await db.collection("employees").find({}).toArray();
    const activeEmployees = employees.filter((emp) => {
      const status = (emp.status || "").toString().toLowerCase();
      if (["terminated", "inactive"].includes(status)) return false;
      return true;
    });

    const activeEmployeeIds = new Set(
      activeEmployees.map((e) => e._id.toString())
    );

    // Build maps for departments, shifts, work locations and projects
    const deptByEmpId = new Map();
    const shiftByEmpId = new Map();
    const workLocIdsByEmpId = new Map();
    activeEmployees.forEach((e) => {
      const id = e._id.toString();
      const dept =
        e.personalDetails?.department || e.department || "Unassigned";
      const shift =
        e.personalDetails?.shift ||
        e.shift ||
        e.personalDetails?.workShift ||
        "Default";
      deptByEmpId.set(id, dept);
      shiftByEmpId.set(id, shift);

      const locIds = [];
      if (Array.isArray(e.workLocations)) {
        e.workLocations.forEach((lid) => {
          const idStr = lid && lid.toString ? lid.toString() : String(lid);
          if (idStr) locIds.push(idStr);
        });
      } else if (e.workLocation) {
        const idStr = e.workLocation.toString
          ? e.workLocation.toString()
          : String(e.workLocation);
        if (idStr) locIds.push(idStr);
      }
      workLocIdsByEmpId.set(id, locIds);
    });

    const [workLocations, projects] = await Promise.all([
      db.collection("work_locations").find({}).toArray(),
      db.collection("projects").find({}).toArray(),
    ]);

    const workLocById = new Map(
      workLocations.map((l) => [l._id.toString(), l])
    );
    const projectsByEmployee = new Map();
    projects.forEach((proj) => {
      if (!Array.isArray(proj.assignedEmployees)) return;
      proj.assignedEmployees.forEach((eid) => {
        const key = eid.toString();
        if (!projectsByEmployee.has(key)) projectsByEmployee.set(key, []);
        projectsByEmployee.get(key).push({
          id: proj._id.toString(),
          name: proj.name || "Unnamed Project",
        });
      });
    });

    const filterProjectId =
      projectIdFilter && ObjectId.isValid(projectIdFilter)
        ? projectIdFilter
        : null;
    const filterLocationId =
      locationIdFilter && ObjectId.isValid(locationIdFilter)
        ? locationIdFilter
        : null;

    // Load attendance for that date
    const attendance = await db
      .collection("daily_attendance")
      .find({ date })
      .toArray();

    // Index attendance by employeeId
    const attendanceByEmp = new Map();
    attendance.forEach((rec) => {
      const empId =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId);
      attendanceByEmp.set(empId, rec);
    });

    // Business rule assumptions:
    // - Present: has any checkInTime for the day
    // - Absent: active employee with no attendance record for the day
    // - Late: checkInTime after 09:15 local time
    // - Early checkout: has checkOutTime before 17:00 local time
    const lateThreshold = { hour: 9, minute: 15 };
    const earlyCheckoutThreshold = { hour: 17, minute: 0 };

    const overall = {
      totalEmployees: 0,
      present: 0,
      absent: 0,
      late: 0,
      earlyCheckout: 0,
    };

    const byDepartment = new Map();
    const bySite = new Map();
    const byProject = new Map();
    const byShift = new Map();

    function ensureGroup(map, key, extra = {}) {
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: key,
          totalEmployees: 0,
          present: 0,
          absent: 0,
          late: 0,
          earlyCheckout: 0,
          ...extra,
        });
      }
      return map.get(key);
    }

    // Process each active employee for this date
    for (const emp of activeEmployees) {
      const empId = emp._id.toString();

      // Department filter
      const dept = deptByEmpId.get(empId) || "Unassigned";
      if (departmentFilter && dept !== departmentFilter) continue;

      const shift = shiftByEmpId.get(empId) || "Default";

      // Project filter
      const empProjects = projectsByEmployee.get(empId) || [];
      if (
        filterProjectId &&
        !empProjects.some((p) => p.id === filterProjectId)
      ) {
        continue;
      }

      // Location filter
      const empLocIds = workLocIdsByEmpId.get(empId) || [];
      if (filterLocationId && !empLocIds.includes(filterLocationId)) {
        continue;
      }

      overall.totalEmployees += 1;

      const rec = attendanceByEmp.get(empId) || null;
      let isPresent = !!(rec && rec.checkInTime);
      let isLate = false;
      let isEarly = false;

      if (rec && rec.checkInTime) {
        const ci = new Date(rec.checkInTime);
        if (
          ci.getHours() > lateThreshold.hour ||
          (ci.getHours() === lateThreshold.hour &&
            ci.getMinutes() > lateThreshold.minute)
        ) {
          isLate = true;
        }
      }
      if (rec && rec.checkOutTime) {
        const co = new Date(rec.checkOutTime);
        if (
          co.getHours() < earlyCheckoutThreshold.hour ||
          (co.getHours() === earlyCheckoutThreshold.hour &&
            co.getMinutes() < earlyCheckoutThreshold.minute)
        ) {
          isEarly = true;
        }
      }

      if (isPresent) overall.present += 1;
      else overall.absent += 1;
      if (isLate) overall.late += 1;
      if (isEarly) overall.earlyCheckout += 1;

      // Department group
      const deptGroup = ensureGroup(byDepartment, dept, { department: dept });
      deptGroup.totalEmployees += 1;
      if (isPresent) deptGroup.present += 1;
      else deptGroup.absent += 1;
      if (isLate) deptGroup.late += 1;
      if (isEarly) deptGroup.earlyCheckout += 1;

      // Shift group
      const shiftGroup = ensureGroup(byShift, shift, { shift });
      shiftGroup.totalEmployees += 1;
      if (isPresent) shiftGroup.present += 1;
      else shiftGroup.absent += 1;
      if (isLate) shiftGroup.late += 1;
      if (isEarly) shiftGroup.earlyCheckout += 1;

      // Site groups (employee may belong to multiple locations)
      if (empLocIds.length === 0) {
        const siteGroup = ensureGroup(bySite, "Unassigned", {
          siteName: "Unassigned",
        });
        siteGroup.totalEmployees += 1;
        if (isPresent) siteGroup.present += 1;
        else siteGroup.absent += 1;
        if (isLate) siteGroup.late += 1;
        if (isEarly) siteGroup.earlyCheckout += 1;
      } else {
        empLocIds.forEach((lid) => {
          const loc = workLocById.get(lid);
          const siteKey = lid;
          const siteName = loc?.name || "Location";
          const siteGroup = ensureGroup(bySite, siteKey, {
            siteId: lid,
            siteName,
          });
          siteGroup.totalEmployees += 1;
          if (isPresent) siteGroup.present += 1;
          else siteGroup.absent += 1;
          if (isLate) siteGroup.late += 1;
          if (isEarly) siteGroup.earlyCheckout += 1;
        });
      }

      // Project groups
      if (empProjects.length === 0) {
        const projGroup = ensureGroup(byProject, "Unassigned", {
          projectName: "Unassigned",
        });
        projGroup.totalEmployees += 1;
        if (isPresent) projGroup.present += 1;
        else projGroup.absent += 1;
        if (isLate) projGroup.late += 1;
        if (isEarly) projGroup.earlyCheckout += 1;
      } else {
        empProjects.forEach((p) => {
          const projGroup = ensureGroup(byProject, p.id, {
            projectId: p.id,
            projectName: p.name,
          });
          projGroup.totalEmployees += 1;
          if (isPresent) projGroup.present += 1;
          else projGroup.absent += 1;
          if (isLate) projGroup.late += 1;
          if (isEarly) projGroup.earlyCheckout += 1;
        });
      }
    }

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "attendance_daily_summary",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "attendance_daily_summary",
        filters: {
          date,
          department: departmentFilter,
          projectId: projectIdFilter,
          locationId: locationIdFilter,
          shift: shiftFilter,
        },
        recordCount: attendance.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "attendance_daily_summary",
      generatedAt: new Date().toISOString(),
      filters: {
        date,
        department: departmentFilter,
        projectId: projectIdFilter,
        locationId: locationIdFilter,
        shift: shiftFilter,
      },
      summary: overall,
      byDepartment: [...byDepartment.values()],
      bySite: [...bySite.values()],
      byProject: [...byProject.values()],
      byShift: [...byShift.values()],
      totalRecords: attendance.length,
    });
  } catch (error) {
    console.error("Error generating daily attendance summary report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate daily attendance summary report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function scanNull(value) {
  if (!value) return null;
  return value.trim() === "" ? null : value.trim();
}

