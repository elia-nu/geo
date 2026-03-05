import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 4.2 Site Attendance Compliance Report API
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
            "Access denied. You don't have permission to view work location reports.",
        },
        { status: 403 }
      );
    }

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");
    const department = scanNull(searchParams.get("department"));

    // Default to full current year if no date range is provided
    const now = new Date();
    const thisYear = now.getFullYear();
    const parsedStart = startDateParam ? new Date(startDateParam) : null;
    const parsedEnd = endDateParam ? new Date(endDateParam) : null;

    let startDate =
      parsedStart && !isNaN(parsedStart.getTime())
        ? parsedStart
        : new Date(thisYear, 0, 1); // Jan 1 of current year
    let endDate =
      parsedEnd && !isNaN(parsedEnd.getTime())
        ? parsedEnd
        : new Date(thisYear, 11, 31); // Dec 31 of current year

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // Pull relevant attendance records (daily_attendance stores date as YYYY-MM-DD string)
    const attendanceQuery = {
      date: { $gte: startStr, $lte: endStr },
    };
    const attendance = await db
      .collection("daily_attendance")
      .find(attendanceQuery)
      .toArray();

    // Load locations and map by id + name
    const locations = await db
      .collection("work_locations")
      .find({})
      .toArray();
    const locById = new Map(
      locations.map((l) => [l._id.toString(), l])
    );
    const locByName = new Map(
      locations
        .filter((l) => l.name)
        .map((l) => [l.name, l])
    );

    // Optional location filter
    const filterLocId =
      locationId && ObjectId.isValid(locationId) ? locationId : null;

    // Load employees once for department filtering and absence mapping
    const emps = await db.collection("employees").find({}).toArray();
    const deptByEmpId = new Map(
      emps.map((e) => [
        e._id.toString(),
        e.personalDetails?.department || e.department || "Unassigned",
      ])
    );
    const workLocationsByEmpId = new Map(
      emps.map((e) => [
        e._id.toString(),
        Array.isArray(e.workLocations)
          ? e.workLocations.map((id) =>
              typeof id === "string" ? id : id?.toString()
            )
          : [],
      ])
    );

    const siteMap = new Map();

    // Helper to get or create a site entry
    const getSiteEntry = (locId, locName, baseLoc) => {
      const key = locId || `name:${locName}`;
      if (!siteMap.has(key)) {
        siteMap.set(key, {
          id: locId,
          name: locName,
          address: baseLoc?.address || "",
          latitude: baseLoc?.latitude ?? null,
          longitude: baseLoc?.longitude ?? null,
          radius: baseLoc?.radius ?? null,
          status: baseLoc?.status || "active",
          totalChecks: 0,
          compliant: 0,
          nonCompliant: 0,
          employees: new Set(),
        });
      }
      return siteMap.get(key);
    };

    // 1) Attendance-based compliance/violations from admin approval status,
    //    with site mapping from geofenceValidation (current data model).
    for (const rec of attendance) {
      const approvalStatus = rec.adminApproval?.status || "pending";
      const gv = rec.geofenceValidation || {};

      let locId = null;
      let locName = "Unknown";
      let baseLoc = null;

      if (gv.nearestLocation && gv.nearestLocation._id) {
        const id = gv.nearestLocation._id.toString();
        baseLoc = locById.get(id) || gv.nearestLocation;
        locId = id;
        locName = baseLoc?.name || gv.workLocationName || "Unknown";
      } else if (gv.workLocationName) {
        baseLoc = locByName.get(gv.workLocationName);
        locName = gv.workLocationName;
        if (baseLoc) {
          locId = baseLoc._id.toString();
        }
      }

      if (filterLocId && locId !== filterLocId) {
        continue;
      }

      if (department) {
        const empKey = rec.employeeId?.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId || "");
        const empDept = deptByEmpId.get(empKey) || "Unassigned";
        if (empDept !== department) continue;
      }

      const entry = getSiteEntry(locId, locName, baseLoc);
      entry.totalChecks += 1;

      // Compliance comes from approved attendances only.
      // Violations are all attendances that are not approved
      // (rejected or still unapproved/pending).
      if (approvalStatus === "approved") {
        entry.compliant += 1;
      } else {
        entry.nonCompliant += 1;
      }

      const empKey =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId || "");
      if (empKey) entry.employees.add(empKey);
    }

    // 2) (Disabled) Absence-based and outside-geofence violations
    // Per latest requirement, violations for this report must come
    // ONLY from unapproved/rejected attendances, so we do not add
    // extra violations from absence documents or separate
    // attendance_violations here.

    const sites = [...siteMap.values()].map((s) => {
      const total = s.totalChecks || 0;
      const compliantRate =
        total > 0 ? Math.round((s.compliant / total) * 10000) / 100 : 0;
      const nonCompliantRate =
        total > 0 ? Math.round((s.nonCompliant / total) * 10000) / 100 : 0;
      return {
        ...s,
        employees: undefined,
        uniqueEmployees: s.employees.size,
        complianceRate: compliantRate,
        nonComplianceRate: nonCompliantRate,
      };
    });

    const summary = {
      totalSites: sites.length,
      totalChecks: sites.reduce((sum, s) => sum + s.totalChecks, 0),
      totalCompliant: sites.reduce((sum, s) => sum + s.compliant, 0),
      totalNonCompliant: sites.reduce((sum, s) => sum + s.nonCompliant, 0),
    };
    summary.overallComplianceRate =
      summary.totalChecks > 0
        ? Math.round((summary.totalCompliant / summary.totalChecks) * 10000) /
          100
        : 0;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "site_attendance_compliance",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "site_attendance_compliance",
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          locationId,
          department,
        },
        recordCount: sites.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "site_attendance_compliance",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        locationId,
        department,
      },
      summary,
      sites,
      totalRecords: sites.length,
    });
  } catch (error) {
    console.error("Error generating site attendance compliance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate site attendance compliance report",
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

