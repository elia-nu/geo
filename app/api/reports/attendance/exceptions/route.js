import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 5.2 Attendance Exception & Violation Report
// Missed check-ins, late arrivals, early departures, outside-geofence attempts
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

    const startDate =
      scanNull(searchParams.get("startDate")) ||
      new Date().toISOString().slice(0, 10);
    const endDate =
      scanNull(searchParams.get("endDate")) || startDate;
    const employeeIdFilter = scanNull(searchParams.get("employeeId"));
    const departmentFilter = scanNull(searchParams.get("department"));
    const projectIdFilter = scanNull(searchParams.get("projectId"));
    const locationIdFilter = scanNull(searchParams.get("locationId"));

    const filterProjectId =
      projectIdFilter && ObjectId.isValid(projectIdFilter)
        ? projectIdFilter
        : null;
    const filterLocationId =
      locationIdFilter && ObjectId.isValid(locationIdFilter)
        ? locationIdFilter
        : null;

    // Load employees (filtering by department / employeeId first)
    const empQuery = {};
    if (employeeIdFilter && ObjectId.isValid(employeeIdFilter)) {
      empQuery._id = new ObjectId(employeeIdFilter);
    }
    if (departmentFilter) {
      empQuery.$or = [
        { department: departmentFilter },
        { "personalDetails.department": departmentFilter },
      ];
    }
    const employees = await db.collection("employees").find(empQuery).toArray();
    const employeesById = new Map(
      employees.map((e) => [e._id.toString(), e])
    );

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        reportType: "attendance_exceptions",
        generatedAt: new Date().toISOString(),
        filters: {
          startDate,
          endDate,
          employeeId: employeeIdFilter,
          department: departmentFilter,
          projectId: projectIdFilter,
          locationId: locationIdFilter,
        },
        summary: {
          totalEmployees: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          outsideGeofence: 0,
          missedCheckIns: 0,
        },
        lateArrivals: [],
        earlyDepartures: [],
        outsideGeofenceAttempts: [],
        missedCheckIns: [],
        totalRecords: 0,
      });
    }

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

    // Attendance in date range for these employees (support both string and ObjectId employeeId)
    const empIdStrings = [...employeesById.keys()];
    const empIdObjectIds = empIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const attQuery = {
      date: { $gte: startDate, $lte: endDate },
      $or: [
        { employeeId: { $in: empIdStrings } },
        ...(empIdObjectIds.length > 0
          ? [{ employeeId: { $in: empIdObjectIds } }]
          : []),
      ],
    };
    const attendance = await db
      .collection("daily_attendance")
      .find(attQuery)
      .toArray();

    const lateArrivals = [];
    const earlyDepartures = [];
    const outsideGeofenceAttempts = [];

    const datesSet = new Set();
    attendance.forEach((rec) => datesSet.add(rec.date));
    const dates = [...datesSet].sort();

    // All calendar days in [startDate, endDate] for missed check-ins (so we list employees who didn't check in on any day in range)
    const allDatesInRange = getDateRange(startDate, endDate);

    // Thresholds
    const lateThreshold = { hour: 9, minute: 15 };
    const earlyCheckoutThreshold = { hour: 17, minute: 0 };

    // Index attendance by (empId + date)
    const attByEmpDate = new Map();
    attendance.forEach((rec) => {
      const empId =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId);
      const key = `${empId}:${rec.date}`;
      attByEmpDate.set(key, rec);

      const emp = employeesById.get(empId);
      if (!emp) return;

      const dept =
        emp.personalDetails?.department || emp.department || "Unassigned";
      const shift =
        emp.personalDetails?.shift ||
        emp.shift ||
        emp.personalDetails?.workShift ||
        "Default";
      const empProjects = projectsByEmployee.get(empId) || [];

      // Project filter
      if (
        filterProjectId &&
        !empProjects.some((p) => p.id === filterProjectId)
      ) {
        return;
      }

      // Location filter by assigned work locations
      if (filterLocationId) {
        const locIds = [];
        if (Array.isArray(emp.workLocations)) {
          emp.workLocations.forEach((lid) => {
            const idStr = lid && lid.toString ? lid.toString() : String(lid);
            if (idStr) locIds.push(idStr);
          });
        } else if (emp.workLocation) {
          const idStr = emp.workLocation.toString
            ? emp.workLocation.toString()
            : String(emp.workLocation);
          if (idStr) locIds.push(idStr);
        }
        if (!locIds.includes(filterLocationId)) return;
      }

      // Late arrivals
      if (rec.checkInTime) {
        const ci = new Date(rec.checkInTime);
        const isLate =
          ci.getHours() > lateThreshold.hour ||
          (ci.getHours() === lateThreshold.hour &&
            ci.getMinutes() > lateThreshold.minute);
        if (isLate) {
          lateArrivals.push({
            employeeId: empId,
            employeeName:
              emp.personalDetails?.name || emp.name || "Unknown Employee",
            department: dept,
            shift,
            date: rec.date,
            checkInTime: rec.checkInTime,
            projectAssignments: empProjects,
          });
        }
      }

      // Early departures
      if (rec.checkOutTime) {
        const co = new Date(rec.checkOutTime);
        const isEarly =
          co.getHours() < earlyCheckoutThreshold.hour ||
          (co.getHours() === earlyCheckoutThreshold.hour &&
            co.getMinutes() < earlyCheckoutThreshold.minute);
        if (isEarly) {
          earlyDepartures.push({
            employeeId: empId,
            employeeName:
              emp.personalDetails?.name || emp.name || "Unknown Employee",
            department: dept,
            shift,
            date: rec.date,
            checkOutTime: rec.checkOutTime,
            projectAssignments: empProjects,
          });
        }
      }

      // Outside-geofence attempts (where geofenceValidation exists and isValid === false)
      const gv = rec.geofenceValidation;
      if (gv && gv.isValid === false) {
        outsideGeofenceAttempts.push({
          employeeId: empId,
          employeeName:
            emp.personalDetails?.name || emp.name || "Unknown Employee",
          department: dept,
          shift,
          date: rec.date,
          action: rec.status || "check-in/out",
          distance: gv.distance ?? null,
          workLocationName: gv.workLocationName || "",
          nearestLocation: gv.nearestLocation || null,
          message: gv.message || "",
        });
      }
    });

    // Missed check-ins: for every calendar day in [startDate, endDate], list employees who had no check-in that day
    const missedCheckIns = [];
    allDatesInRange.forEach((d) => {
      employees.forEach((emp) => {
        const empId = emp._id.toString();
        const key = `${empId}:${d}`;
        const rec = attByEmpDate.get(key);
        if (!rec || !rec.checkInTime) {
          // Apply same project/location filters as above
          const empProjects = projectsByEmployee.get(empId) || [];
          if (
            filterProjectId &&
            !empProjects.some((p) => p.id === filterProjectId)
          ) {
            return;
          }
          if (filterLocationId) {
            const locIds = [];
            if (Array.isArray(emp.workLocations)) {
              emp.workLocations.forEach((lid) => {
                const idStr = lid && lid.toString ? lid.toString() : String(lid);
                if (idStr) locIds.push(idStr);
              });
            } else if (emp.workLocation) {
              const idStr = emp.workLocation.toString
                ? emp.workLocation.toString()
                : String(emp.workLocation);
              if (idStr) locIds.push(idStr);
            }
            if (!locIds.includes(filterLocationId)) return;
          }

          missedCheckIns.push({
            employeeId: empId,
            employeeName:
              emp.personalDetails?.name || emp.name || "Unknown Employee",
            department:
              emp.personalDetails?.department || emp.department || "Unassigned",
            date: d,
          });
        }
      });
    });

    const summary = {
      totalEmployees: employees.length,
      lateArrivals: lateArrivals.length,
      earlyDepartures: earlyDepartures.length,
      outsideGeofence: outsideGeofenceAttempts.length,
      missedCheckIns: missedCheckIns.length,
    };

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "attendance_exceptions",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "attendance_exceptions",
        filters: {
          startDate,
          endDate,
          employeeId: employeeIdFilter,
          department: departmentFilter,
          projectId: projectIdFilter,
          locationId: locationIdFilter,
        },
        recordCount:
          lateArrivals.length +
          earlyDepartures.length +
          outsideGeofenceAttempts.length +
          missedCheckIns.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "attendance_exceptions",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        employeeId: employeeIdFilter,
        department: departmentFilter,
        projectId: projectIdFilter,
        locationId: locationIdFilter,
      },
      summary,
      lateArrivals,
      earlyDepartures,
      outsideGeofenceAttempts,
      missedCheckIns,
      totalRecords:
        lateArrivals.length +
        earlyDepartures.length +
        outsideGeofenceAttempts.length +
        missedCheckIns.length,
    });
  } catch (error) {
    console.error("Error generating attendance exception report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate attendance exception report",
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

/** Returns array of YYYY-MM-DD strings from start (inclusive) to end (inclusive). */
function getDateRange(startStr, endStr) {
  const out = [];
  const start = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");
  if (start.getTime() > end.getTime()) return out;
  const d = new Date(start);
  while (d.getTime() <= end.getTime()) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

